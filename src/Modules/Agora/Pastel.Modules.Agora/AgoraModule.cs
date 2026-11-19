using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Features;
using Pastel.Modules.Agora.Features.Share;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Agora;

/// <summary>Módulo Ágora. Ver <c>MODULE.md</c> y <c>docs/modules/AGORA.md</c> para el alcance de producto.</summary>
internal sealed class AgoraModule : IPastelModule
{
    public string Code => AgoraPermissions.Code;

    public string Name => "Ágora";

    public int Order => 30;

    public IReadOnlyList<PermissionGroup> Permissions => AgoraPermissions.Groups;

    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } =
    [
        new("Ágora — Autor", "Crea, edita y publica contenido.", [AgoraPermissions.Access, AgoraPermissions.ContentManage]),
        new("Ágora — Revisor", "Revisa y verifica piezas como especialista.", [AgoraPermissions.Access, AgoraPermissions.ContentReview]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddPastelDbContext<AgoraDbContext>(configuration, AgoraDbContext.Schema);
        services.Configure<AgoraOptions>(configuration.GetSection(AgoraOptions.SectionName));
        services.AddAgoraRateLimits();

        // La tarjeta PNG depende de CCR-2 (Pastel.Documents): mientras no exista, no hay imagen. Otra implementación la reemplaza.
        services.TryAddSingleton<IShareCardRenderer, UnavailableShareCardRenderer>();
    }

    public void MapEndpoints(IEndpointRouteBuilder api) => AgoraEndpoints.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<AgoraDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<AgoraDbContext>(services, cancellationToken);
}
