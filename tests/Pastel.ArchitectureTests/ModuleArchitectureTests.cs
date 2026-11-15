using System.Xml.Linq;
using Pastel.Platform.Modules;
using Xunit;

namespace Pastel.ArchitectureTests;

public sealed class ModuleArchitectureTests
{
    private static readonly string RepositoryRoot = FindRepositoryRoot();

    [Fact]
    public void EveryProductionModuleAssemblyHasAnInternalModuleMarker()
    {
        var modules = ModuleLoader.Load();

        Assert.NotEmpty(modules);
        Assert.Contains(modules, module => module.Code == ModuleLoader.IdentityCode);

        foreach (var module in modules)
        {
            Assert.False(module.GetType().IsPublic, $"{module.Code}: module type must be internal.");
            Assert.True(
                module.GetType().Assembly.GetCustomAttributes(typeof(PastelModuleAttribute), inherit: false).Length == 1,
                $"{module.Code}: assembly must have exactly one PastelModuleAttribute.");
            Assert.True(module.GetType().IsAssignableTo(typeof(IPastelModule)));
        }
    }

    [Fact]
    public void PermissionGroupsAndPermissionCodesUseTheirModulePrefix()
    {
        foreach (var module in ModuleLoader.Load())
        {
            foreach (var group in module.Permissions)
            {
                if (module.Code != ModuleLoader.IdentityCode)
                {
                    Assert.Equal(module.Code, group.Code);
                }

                foreach (var permission in group.Permissions)
                {
                    Assert.StartsWith(group.Code + ".", permission.Code, StringComparison.Ordinal);
                }
            }

            var declaredPermissions = module.Permissions
                .SelectMany(group => group.Permissions)
                .Select(permission => permission.Code)
                .ToHashSet(StringComparer.Ordinal);

            foreach (var role in module.SuggestedRoles)
            {
                Assert.All(role.PermissionCodes, code => Assert.Contains(code, declaredPermissions));
            }
        }
    }

    [Fact]
    public void EveryModuleHasBackendAndFrontendModuleDocumentation()
    {
        foreach (var module in ModuleLoader.Load())
        {
            var assemblyName = module.GetType().Assembly.GetName().Name ?? string.Empty;
            const string prefix = "Pastel.Modules.";
            Assert.StartsWith(prefix, assemblyName, StringComparison.Ordinal);
            var directoryName = assemblyName[prefix.Length..];

            var backendDoc = Path.Combine(RepositoryRoot, "src", "Modules", directoryName, "MODULE.md");
            var frontendDoc = Path.Combine(RepositoryRoot, "web", "src", "modules", module.Code, "MODULE.md");

            Assert.True(File.Exists(backendDoc), $"Missing backend MODULE.md: {backendDoc}");
            Assert.True(File.Exists(frontendDoc), $"Missing frontend MODULE.md: {frontendDoc}");
        }
    }

    [Fact]
    public void FeatureTypesAreNotPublicApi()
    {
        foreach (var module in ModuleLoader.Load())
        {
            var featureTypes = module.GetType().Assembly.GetTypes()
                .Where(type => type.Namespace?.Contains(".Features.", StringComparison.Ordinal) == true);

            Assert.All(featureTypes, type =>
                Assert.False(type.IsPublic, $"{type.FullName} must remain internal to its module."));
        }
    }

    [Fact]
    public void EveryFeatureEndpointDeclaresAnExplicitSecurityPolicy()
    {
        var moduleRoot = Path.Combine(RepositoryRoot, "src", "Modules");
        var endpointFiles = Directory.EnumerateFiles(moduleRoot, "*Endpoint.cs", SearchOption.AllDirectories)
            .Where(path => path.Contains($"{Path.DirectorySeparatorChar}Features{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .ToArray();

        Assert.NotEmpty(endpointFiles);

        foreach (var path in endpointFiles)
        {
            var source = File.ReadAllText(path);
            var hasExplicitPolicy =
                source.Contains(".RequirePermission(", StringComparison.Ordinal)
                || source.Contains(".RequireSession(", StringComparison.Ordinal)
                || source.Contains(".AllowAnonymousExplicit()", StringComparison.Ordinal);

            Assert.True(
                hasExplicitPolicy,
                $"{Path.GetRelativePath(RepositoryRoot, path)} must explicitly require permission/session or opt into anonymous access.");
        }
    }

    [Fact]
    public void ProductionModuleProjectsDoNotReferenceOtherModulesDirectly()
    {
        var modulesRoot = Path.GetFullPath(Path.Combine(RepositoryRoot, "src", "Modules"));
        var projectFiles = Directory.EnumerateFiles(modulesRoot, "Pastel.Modules.*.csproj", SearchOption.AllDirectories)
            .Where(path => !path.EndsWith(".Tests.csproj", StringComparison.Ordinal)
                && !path.EndsWith(".Contracts.csproj", StringComparison.Ordinal));

        foreach (var projectPath in projectFiles)
        {
            var sourceRelative = Path.GetRelativePath(modulesRoot, projectPath);
            var sourceModule = sourceRelative.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)[0];
            var document = XDocument.Load(projectPath);

            foreach (var reference in document.Descendants("ProjectReference"))
            {
                var include = (string?)reference.Attribute("Include");
                if (string.IsNullOrWhiteSpace(include))
                {
                    continue;
                }

                var referencedPath = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(projectPath)!, include));
                var targetRelative = Path.GetRelativePath(modulesRoot, referencedPath);
                if (targetRelative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal)
                    || Path.IsPathRooted(targetRelative))
                {
                    continue;
                }

                var targetModule = targetRelative.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)[0];
                Assert.True(
                    string.Equals(sourceModule, targetModule, StringComparison.Ordinal),
                    $"{sourceRelative} references a project in another module: {targetRelative}");
            }
        }
    }

    private static string FindRepositoryRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Pastel.slnx")))
            {
                return directory.FullName;
            }
        }

        throw new DirectoryNotFoundException("Could not locate Pastel.slnx from the architecture-test output directory.");
    }
}
