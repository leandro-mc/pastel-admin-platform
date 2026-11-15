using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Ai;

/// <summary>Modelo ofrecido por un proveedor.</summary>
internal sealed record AiModelInfo(string Id, string Label);

/// <summary>
/// Cliente de un proveedor de IA. Las URL son fijas (sin SSRF); la clave viaja en una cabecera, nunca en la URL, y no se
/// registra. Los mensajes de error del proveedor no se reenvían al cliente ni a los registros (pueden contener datos).
/// </summary>
internal interface IAiProvider
{
    string Id { get; }

    string Label { get; }

    /// <summary>Modelo sugerido si la persona no elige uno.</summary>
    string DefaultModel { get; }

    Task<Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(string apiKey, CancellationToken cancellationToken);

    /// <summary>Envía el paquete y devuelve el texto de la respuesta (se espera SOLO JSON; se valida aparte).</summary>
    Task<Result<string>> GenerateJsonAsync(string apiKey, string model, string prompt, CancellationToken cancellationToken);
}

internal static partial class AiProviderCatalog
{
    public const string HttpClientName = "huella-ai";

    public static readonly IReadOnlyList<string> Ids = ["gemini", "openai", "anthropic"];

    /// <summary>Identificadores de modelo: letras, dígitos y <c>.-_</c>; nada que altere la ruta de la URL (ni <c>/</c> ni <c>:</c>).</summary>
    public static bool IsValidModel(string? model) => model is { Length: > 0 and <= 100 } && ModelPattern().IsMatch(model);

    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9._-]*$")]
    private static partial Regex ModelPattern();
}

/// <summary>Base común: envío, lectura acotada y traducción de estados HTTP a errores estables de Huella.</summary>
internal abstract class AiProviderBase(IHttpClientFactory httpClientFactory, ILogger logger) : IAiProvider
{
    private const int MaxResponseBytes = 2 * 1024 * 1024;

    public abstract string Id { get; }

    public abstract string Label { get; }

    public abstract string DefaultModel { get; }

    public abstract Task<Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(string apiKey, CancellationToken cancellationToken);

    public abstract Task<Result<string>> GenerateJsonAsync(string apiKey, string model, string prompt, CancellationToken cancellationToken);

    protected async Task<Result<JsonDocument>> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient(AiProviderCatalog.HttpClientName);
        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return HuellaErrors.AiTimeout;
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning("No se pudo contactar al proveedor de IA {Provider}: {Reason}", Id, ex.HttpRequestError);
            return HuellaErrors.AiUnreachable;
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                // Solo el estado: el cuerpo puede repetir el prompt o datos de la cuenta del proveedor.
                logger.LogWarning("El proveedor de IA {Provider} respondió {Status}", Id, (int)response.StatusCode);
                return response.StatusCode switch
                {
                    HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => HuellaErrors.AiKeyRejected,
                    HttpStatusCode.BadRequest when Id == "gemini" => HuellaErrors.AiKeyOrModelRejected,
                    HttpStatusCode.NotFound => HuellaErrors.AiModelNotFound,
                    HttpStatusCode.TooManyRequests => HuellaErrors.AiQuota,
                    HttpStatusCode.PaymentRequired => HuellaErrors.AiQuota,
                    _ when (int)response.StatusCode >= 500 => HuellaErrors.AiUnreachable,
                    _ => HuellaErrors.AiRequestRejected,
                };
            }

            if (response.Content.Headers.ContentLength > MaxResponseBytes)
            {
                return HuellaErrors.AiBadResponse;
            }

            try
            {
                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var limited = new MemoryStream();
                var buffer = new byte[81920];
                int read;
                while ((read = await stream.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    if (limited.Length + read > MaxResponseBytes)
                    {
                        return HuellaErrors.AiBadResponse;
                    }

                    limited.Write(buffer, 0, read);
                }

                limited.Position = 0;
                return await JsonDocument.ParseAsync(limited, cancellationToken: cancellationToken);
            }
            catch (JsonException)
            {
                return HuellaErrors.AiBadResponse;
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return HuellaErrors.AiTimeout;
            }
        }
    }

    protected static string Str(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? string.Empty : string.Empty;
}

/// <summary>Google Gemini (API de Generative Language). La clave va en <c>x-goog-api-key</c>.</summary>
internal sealed class GeminiProvider(IHttpClientFactory factory, ILogger<GeminiProvider> logger) : AiProviderBase(factory, logger)
{
    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/";

    public override string Id => "gemini";

    public override string Label => "Google Gemini";

    public override string DefaultModel => "gemini-2.5-flash";

    public override async Task<Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(string apiKey, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, BaseUrl + "models?pageSize=200");
        request.Headers.Add("x-goog-api-key", apiKey);
        var json = await SendAsync(request, cancellationToken);
        if (json.IsFailure)
        {
            return json.Error;
        }

        using var doc = json.Value;
        var models = new List<AiModelInfo>();
        if (doc.RootElement.TryGetProperty("models", out var list) && list.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in list.EnumerateArray())
            {
                var supportsGenerate = m.TryGetProperty("supportedGenerationMethods", out var methods) && methods.ValueKind == JsonValueKind.Array
                    && methods.EnumerateArray().Any(x => x.ValueKind == JsonValueKind.String && x.GetString() == "generateContent");
                var id = Str(m, "name").Replace("models/", string.Empty, StringComparison.Ordinal);
                if (supportsGenerate && id.StartsWith("gemini", StringComparison.Ordinal) && AiProviderCatalog.IsValidModel(id))
                {
                    var label = Str(m, "displayName");
                    models.Add(new AiModelInfo(id, label.Length > 0 ? $"{label} ({id})" : id));
                }
            }
        }

        return models;
    }

    public override async Task<Result<string>> GenerateJsonAsync(string apiKey, string model, string prompt, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}models/{model}:generateContent")
        {
            Content = JsonContent.Create(new
            {
                contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
                generationConfig = new { responseMimeType = "application/json", temperature = 0.3 },
            }),
        };
        request.Headers.Add("x-goog-api-key", apiKey);
        var json = await SendAsync(request, cancellationToken);
        if (json.IsFailure)
        {
            return json.Error;
        }

        using var doc = json.Value;
        if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.ValueKind == JsonValueKind.Array
            && candidates.GetArrayLength() > 0
            && candidates[0].TryGetProperty("content", out var content)
            && content.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array)
        {
            var text = string.Concat(parts.EnumerateArray().Select(p => Str(p, "text")));
            if (text.Length > 0)
            {
                return text;
            }
        }

        return HuellaErrors.AiEmptyResponse;
    }
}

/// <summary>OpenAI (Chat Completions con salida JSON). La clave va en <c>Authorization: Bearer</c>.</summary>
internal sealed class OpenAiProvider(IHttpClientFactory factory, ILogger<OpenAiProvider> logger) : AiProviderBase(factory, logger)
{
    private const string BaseUrl = "https://api.openai.com/v1/";

    public override string Id => "openai";

    public override string Label => "OpenAI";

    public override string DefaultModel => "gpt-4.1-mini";

    public override async Task<Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(string apiKey, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, BaseUrl + "models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        var json = await SendAsync(request, cancellationToken);
        if (json.IsFailure)
        {
            return json.Error;
        }

        using var doc = json.Value;
        var models = new List<AiModelInfo>();
        if (doc.RootElement.TryGetProperty("data", out var list) && list.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in list.EnumerateArray())
            {
                var id = Str(m, "id");
                var chat = id.StartsWith("gpt-", StringComparison.Ordinal) || id.StartsWith('o');
                var notChat = id.Contains("audio", StringComparison.Ordinal) || id.Contains("realtime", StringComparison.Ordinal)
                    || id.Contains("tts", StringComparison.Ordinal) || id.Contains("transcribe", StringComparison.Ordinal)
                    || id.Contains("image", StringComparison.Ordinal) || id.Contains("search", StringComparison.Ordinal);
                if (chat && !notChat && AiProviderCatalog.IsValidModel(id))
                {
                    models.Add(new AiModelInfo(id, id));
                }
            }
        }

        return models.OrderBy(m => m.Id, StringComparer.Ordinal).ToList();
    }

    public override async Task<Result<string>> GenerateJsonAsync(string apiKey, string model, string prompt, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl + "chat/completions")
        {
            Content = JsonContent.Create(new
            {
                model,
                messages = new[] { new { role = "user", content = prompt } },
                response_format = new { type = "json_object" },
            }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        var json = await SendAsync(request, cancellationToken);
        if (json.IsFailure)
        {
            return json.Error;
        }

        using var doc = json.Value;
        if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.ValueKind == JsonValueKind.Array && choices.GetArrayLength() > 0
            && choices[0].TryGetProperty("message", out var message))
        {
            var text = Str(message, "content");
            if (text.Length > 0)
            {
                return text;
            }
        }

        return HuellaErrors.AiEmptyResponse;
    }
}

/// <summary>Anthropic (Messages API). La clave va en <c>x-api-key</c>.</summary>
internal sealed class AnthropicProvider(IHttpClientFactory factory, ILogger<AnthropicProvider> logger) : AiProviderBase(factory, logger)
{
    private const string BaseUrl = "https://api.anthropic.com/v1/";
    private const string ApiVersion = "2023-06-01";

    public override string Id => "anthropic";

    public override string Label => "Anthropic Claude";

    public override string DefaultModel => "claude-sonnet-4-5";

    public override async Task<Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(string apiKey, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, BaseUrl + "models?limit=100");
        AddHeaders(request, apiKey);
        var json = await SendAsync(request, cancellationToken);
        if (json.IsFailure)
        {
            return json.Error;
        }

        using var doc = json.Value;
        var models = new List<AiModelInfo>();
        if (doc.RootElement.TryGetProperty("data", out var list) && list.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in list.EnumerateArray())
            {
                var id = Str(m, "id");
                if (AiProviderCatalog.IsValidModel(id))
                {
                    var label = Str(m, "display_name");
                    models.Add(new AiModelInfo(id, label.Length > 0 ? $"{label} ({id})" : id));
                }
            }
        }

        return models;
    }

    public override async Task<Result<string>> GenerateJsonAsync(string apiKey, string model, string prompt, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl + "messages")
        {
            Content = JsonContent.Create(new
            {
                model,
                max_tokens = 8192,
                messages = new[] { new { role = "user", content = prompt } },
            }),
        };
        AddHeaders(request, apiKey);
        var json = await SendAsync(request, cancellationToken);
        if (json.IsFailure)
        {
            return json.Error;
        }

        using var doc = json.Value;
        if (doc.RootElement.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
        {
            var text = string.Concat(content.EnumerateArray().Where(c => Str(c, "type") == "text").Select(c => Str(c, "text")));
            if (text.Length > 0)
            {
                return text;
            }
        }

        return HuellaErrors.AiEmptyResponse;
    }

    private static void AddHeaders(HttpRequestMessage request, string apiKey)
    {
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", ApiVersion);
    }
}
