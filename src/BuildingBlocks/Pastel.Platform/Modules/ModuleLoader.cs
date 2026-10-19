using System.Reflection;
using System.Runtime.Loader;
using System.Text.RegularExpressions;

namespace Pastel.Platform.Modules;

/// <summary>Descubre los módulos presentes en el directorio de la aplicación (<c>Pastel.Modules.*.dll</c>).</summary>
public static partial class ModuleLoader
{
    public const string IdentityCode = "identity";

    public static IReadOnlyList<IPastelModule> Load(string? directory = null)
    {
        directory ??= AppContext.BaseDirectory;
        var assemblies = new List<Assembly>();
        foreach (var path in Directory.EnumerateFiles(directory, "Pastel.Modules.*.dll"))
        {
            var name = Path.GetFileNameWithoutExtension(path);
            if (name.EndsWith(".Tests", StringComparison.Ordinal) || name.EndsWith(".Contracts", StringComparison.Ordinal))
            {
                continue;
            }

            var loaded = AppDomain.CurrentDomain.GetAssemblies().FirstOrDefault(a => a.GetName().Name == name);
            assemblies.Add(loaded ?? AssemblyLoadContext.Default.LoadFromAssemblyPath(path));
        }

        var modules = assemblies
            .SelectMany(a => a.GetCustomAttributes<PastelModuleAttribute>())
            .Select(a => (IPastelModule)Activator.CreateInstance(a.ModuleType, nonPublic: true)!)
            .OrderBy(m => m.Order)
            .ThenBy(m => m.Code, StringComparer.Ordinal)
            .ToArray();

        Validate(modules);
        return modules;
    }

    internal static void Validate(IReadOnlyList<IPastelModule> modules)
    {
        if (modules.All(m => m.Code != IdentityCode))
        {
            throw new InvalidOperationException("Falta el módulo Identity: es obligatorio en todo despliegue.");
        }

        var duplicated = modules.GroupBy(m => m.Code).FirstOrDefault(g => g.Count() > 1);
        if (duplicated is not null)
        {
            throw new InvalidOperationException($"El código de módulo '{duplicated.Key}' está repetido.");
        }

        foreach (var module in modules)
        {
            if (!ModuleCodeRegex().IsMatch(module.Code))
            {
                throw new InvalidOperationException($"El código de módulo '{module.Code}' no es válido (minúsculas y números, 2 a 32 caracteres).");
            }

            foreach (var group in module.Permissions)
            {
                if (module.Code != IdentityCode && group.Code != module.Code)
                {
                    throw new InvalidOperationException($"El grupo de permisos '{group.Code}' debe llamarse igual que su módulo '{module.Code}'.");
                }

                foreach (var permission in group.Permissions)
                {
                    if (!permission.Code.StartsWith(group.Code + ".", StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException($"El permiso '{permission.Code}' debe empezar por '{group.Code}.'.");
                    }
                }
            }
        }
    }

    [GeneratedRegex("^[a-z][a-z0-9]{1,31}$", RegexOptions.CultureInvariant)]
    private static partial Regex ModuleCodeRegex();
}

/// <summary>Módulos cargados en este proceso. Se registra como singleton.</summary>
public sealed class ModuleCatalog(IReadOnlyList<IPastelModule> modules)
{
    public IReadOnlyList<IPastelModule> Modules { get; } = modules;

    public IEnumerable<PermissionGroup> AllGroups => Modules.SelectMany(m => m.Permissions);
}
