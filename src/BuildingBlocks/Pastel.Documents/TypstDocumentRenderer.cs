using System.Diagnostics;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.SharedKernel;

namespace Pastel.Documents;

/// <summary>
/// Render con Typst como proceso hijo, acotado: directorio temporal propio como raíz (la plantilla no ve nada fuera),
/// sin paquetes remotos (no hay importaciones y la caché de paquetes apunta a una carpeta vacía), sin fuentes del sistema,
/// entorno vacío, límite de tiempo, de memoria (Linux) y de tamaño de salida. Ningún dato del documento se registra.
/// </summary>
internal sealed class TypstDocumentRenderer(IOptions<DocumentOptions> options, ILogger<TypstDocumentRenderer> logger) : IDocumentRenderer
{
    private static readonly byte[] PdfMagic = "%PDF-"u8.ToArray();
    private static readonly byte[] PngMagic = [0x89, 0x50, 0x4E, 0x47];
    private readonly DocumentOptions _options = options.Value;
    private readonly Lazy<bool> _available = new(() => Probe(options.Value, logger));

    public bool IsAvailable => _available.Value;

    public async Task<Result<byte[]>> RenderAsync(DocumentRequest request, CancellationToken cancellationToken)
    {
        if (!IsAvailable)
        {
            return DocumentErrors.Unavailable;
        }

        if (Encoding.UTF8.GetByteCount(request.DataJson) > _options.MaxDataBytes)
        {
            return DocumentErrors.TooLarge;
        }

        var work = Directory.CreateTempSubdirectory("pastel-doc-");
        try
        {
            var extension = request.Format == DocumentFormat.Png ? "png" : "pdf";
            var output = Path.Combine(work.FullName, "out." + extension);
            var emptyPackages = Directory.CreateDirectory(Path.Combine(work.FullName, "packages")).FullName;
            await File.WriteAllTextAsync(Path.Combine(work.FullName, "main.typ"), request.Template, cancellationToken);
            await File.WriteAllTextAsync(Path.Combine(work.FullName, "data.json"), request.DataJson, cancellationToken);

            var arguments = new List<string>
            {
                "compile",
                "--root", work.FullName,
                "--font-path", FontPath(_options),
                "--ignore-system-fonts",
                "--package-path", emptyPackages,
                "--package-cache-path", emptyPackages,
                "--format", extension,
                "--diagnostic-format", "short",
            };
            if (request.Format == DocumentFormat.Png)
            {
                arguments.AddRange(["--ppi", "144"]);
            }

            arguments.AddRange([Path.Combine(work.FullName, "main.typ"), output]);

            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(_options.TimeoutSeconds));
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);
            var run = await RunAsync(_options, arguments, work.FullName, linked.Token);
            if (run is null)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                }

                logger.LogWarning("Typst excedió el límite de {Seconds} s", _options.TimeoutSeconds);
                return DocumentErrors.Timeout;
            }

            if (run.Value.ExitCode != 0 || !File.Exists(output))
            {
                // Solo el código de salida y la primera línea del diagnóstico (ruta y mensaje del compilador, sin datos).
                logger.LogError("Typst terminó con código {ExitCode}: {Diagnostic}", run.Value.ExitCode, FirstLine(run.Value.Stderr));
                return DocumentErrors.Failed;
            }

            var size = new FileInfo(output).Length;
            if (size > _options.MaxOutputBytes)
            {
                return DocumentErrors.TooLarge;
            }

            var bytes = await File.ReadAllBytesAsync(output, cancellationToken);
            var magic = request.Format == DocumentFormat.Png ? PngMagic : PdfMagic;
            if (bytes.Length < magic.Length || !bytes.AsSpan(0, magic.Length).SequenceEqual(magic))
            {
                logger.LogError("Typst produjo una salida que no es {Format}", request.Format);
                return DocumentErrors.Failed;
            }

            return bytes;
        }
        finally
        {
            try
            {
                work.Delete(recursive: true);
            }
            catch (IOException)
            {
                // El sistema operativo puede retener el archivo un instante; el directorio temporal se limpia con el contenedor.
            }
        }
    }

    internal static string FontPath(DocumentOptions options) =>
        string.IsNullOrWhiteSpace(options.FontPath) ? Path.Combine(AppContext.BaseDirectory, "Fonts") : options.FontPath;

    private static bool Probe(DocumentOptions options, ILogger logger)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            var run = RunAsync(options, ["--version"], Path.GetTempPath(), cts.Token).GetAwaiter().GetResult();
            var ok = run is { ExitCode: 0 } && run.Value.Stdout.StartsWith("typst", StringComparison.OrdinalIgnoreCase);
            if (ok)
            {
                logger.LogInformation("Motor documental disponible: {Version}", run!.Value.Stdout.Trim());
            }
            else
            {
                logger.LogWarning("Motor documental no disponible: Typst no respondió a --version");
            }

            return ok;
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException or IOException)
        {
            logger.LogWarning("Motor documental no disponible: no se encontró Typst en {Path}", options.TypstPath);
            return false;
        }
    }

    private readonly record struct ProcessRun(int ExitCode, string Stdout, string Stderr);

    /// <summary>Ejecuta Typst con entorno vacío. Devuelve <c>null</c> si se canceló (por tiempo o por quien llama).</summary>
    private static async Task<ProcessRun?> RunAsync(DocumentOptions options, IReadOnlyList<string> arguments, string workingDirectory, CancellationToken cancellationToken)
    {
        var info = new ProcessStartInfo
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = workingDirectory,
        };

        if (OperatingSystem.IsLinux() && options.MemoryLimitMb > 0)
        {
            // ulimit -v acota la memoria virtual del proceso; los argumentos viajan como posicionales, nunca interpolados.
            info.FileName = "/bin/sh";
            info.ArgumentList.Add("-c");
            info.ArgumentList.Add($"ulimit -v {options.MemoryLimitMb * 1024} && exec \"$0\" \"$@\"");
            info.ArgumentList.Add(options.TypstPath);
        }
        else
        {
            info.FileName = options.TypstPath;
        }

        foreach (var argument in arguments)
        {
            info.ArgumentList.Add(argument);
        }

        // Entorno mínimo: sin proxies, credenciales ni variables de la aplicación.
        var keep = new[] { "PATH", "SystemRoot", "TEMP", "TMP" };
        var preserved = keep.Select(k => (k, v: Environment.GetEnvironmentVariable(k))).Where(x => x.v is not null).ToList();
        info.Environment.Clear();
        foreach (var (key, value) in preserved)
        {
            info.Environment[key] = value;
        }

        info.Environment["HOME"] = workingDirectory;
        info.Environment["TYPST_FONT_PATHS"] = string.Empty;

        using var process = new Process { StartInfo = info };
        process.Start();
        var stdout = process.StandardOutput.ReadToEndAsync(CancellationToken.None);
        var stderr = process.StandardError.ReadToEndAsync(CancellationToken.None);
        try
        {
            await process.WaitForExitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            try
            {
                process.Kill(entireProcessTree: true);
            }
            catch (InvalidOperationException)
            {
                // Ya terminó.
            }

            return null;
        }

        return new ProcessRun(process.ExitCode, await stdout, await stderr);
    }

    private static string FirstLine(string text)
    {
        var line = text.Split('\n', 2)[0].Trim();
        return line.Length > 300 ? line[..300] : line;
    }
}
