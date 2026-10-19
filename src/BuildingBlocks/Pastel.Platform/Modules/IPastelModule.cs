using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pastel.Platform.Modules;

/// <summary>Permiso declarado por un módulo. El código tiene el formato <c>&lt;grupo&gt;.&lt;recurso&gt;.&lt;accion&gt;</c>.</summary>
public sealed record PermissionInfo(string Code, string Name, string Description);

/// <summary>Grupo de permisos de un módulo. El código del grupo es el prefijo de todos sus permisos y es lo que se activa o desactiva.</summary>
public sealed record PermissionGroup(string Code, string Name, int SortOrder, IReadOnlyList<PermissionInfo> Permissions);

/// <summary>Rol sugerido. Se crea una sola vez si no existe; nunca se sobrescribe lo que administración haya editado.</summary>
public sealed record SuggestedRole(string Name, string Description, IReadOnlyList<string> PermissionCodes);

/// <summary>Contrato de un módulo de Pastel (ver <c>docs/ARCHITECTURE.md</c> sección 4).</summary>
public interface IPastelModule
{
    /// <summary>Código en minúsculas: carpeta, esquema de base de datos, ruta <c>/api/&lt;code&gt;</c> y prefijo de permisos.</summary>
    string Code { get; }

    string Name { get; }

    /// <summary>Orden de arranque y de migración. Identity es 0.</summary>
    int Order { get; }

    IReadOnlyList<PermissionGroup> Permissions { get; }

    IReadOnlyList<SuggestedRole> SuggestedRoles { get; }

    void ConfigureServices(IServiceCollection services, IConfiguration configuration);

    /// <summary>Recibe el grupo <c>/api/&lt;code&gt;</c>.</summary>
    void MapEndpoints(IEndpointRouteBuilder api);

    /// <summary>
    /// Rutas fuera de <c>/api/&lt;code&gt;</c>. Solo Identity las usa (<c>/api/auth</c>, <c>/api/admin</c>) para conservar
    /// los contratos existentes. Recibe el grupo raíz <c>/api</c>.
    /// </summary>
    void MapRootEndpoints(IEndpointRouteBuilder apiRoot)
    {
    }

    Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken);

    /// <summary>Indica si quedan migraciones pendientes. Lo usa <c>/health/ready</c>.</summary>
    Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken);
}

/// <summary>Marca el ensamblado de un módulo: <c>[assembly: PastelModule(typeof(CosechaModule))]</c>.</summary>
[AttributeUsage(AttributeTargets.Assembly, AllowMultiple = false)]
public sealed class PastelModuleAttribute(Type moduleType) : Attribute
{
    public Type ModuleType { get; } = moduleType;
}

/// <summary>Tarea de arranque de un módulo (catálogo, siembra, validaciones). Se ejecuta tras migrar, por orden ascendente.</summary>
public interface IPastelStartupTask
{
    int Order { get; }

    Task RunAsync(IServiceProvider services, CancellationToken cancellationToken);
}
