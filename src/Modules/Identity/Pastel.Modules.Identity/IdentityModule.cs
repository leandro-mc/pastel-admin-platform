using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity;
using Pastel.Modules.Identity.Catalog;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Features;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Modules.Identity.Startup;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;
using Pastel.Platform.Security;

[assembly: PastelModule(typeof(IdentityModule))]

namespace Pastel.Modules.Identity;

/// <summary>
/// Módulo Identity: acceso, sesión, usuarios, roles, permisos, módulos y auditoría.
/// Conserva <c>/api/auth/*</c> y <c>/api/admin/*</c> mediante <see cref="MapRootEndpoints"/>.
/// </summary>
internal sealed class IdentityModule : IPastelModule
{
    public string Code => ModuleLoader.IdentityCode;

    public string Name => "Identidad y acceso";

    public int Order => 0;

    public IReadOnlyList<PermissionGroup> Permissions => IdentityPermissions.Groups;

    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } =
    [
        new("Member", "Acceso básico al panel.", [IdentityPermissions.DashboardView]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddPastelDbContext<IdentityDbContext>(configuration, IdentityDbContext.Schema);

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(x => System.Text.Encoding.UTF8.GetByteCount(x.SigningKey) >= 32, "Jwt:SigningKey debe tener al menos 32 bytes UTF-8.")
            .Validate(x => x.AccessTokenMinutes is >= 5 and <= 30, "La vida del token de acceso debe estar entre 5 y 30 minutos.")
            .ValidateOnStart();
        services.AddOptions<AuthOptions>()
            .Bind(configuration.GetSection(AuthOptions.SectionName))
            .Validate(x => x.Refresh.ReuseGraceSeconds is >= 0 and <= 60, "Auth:Refresh:ReuseGraceSeconds debe estar entre 0 y 60.")
            .ValidateOnStart();

        services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
        services.Configure<PasswordHasherOptions>(options => options.IterationCount = 600_000);

        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<RefreshGraceProtector>();
        services.AddSingleton<LoginAccountRateLimiter>();
        services.AddScoped<IPermissionEvaluator, PermissionEvaluator>();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<IAuditTrail, AuditTrail>();
        services.AddSingleton<IUniqueViolationSource, IdentityUniqueViolations>();
        services.AddIdentityAuthentication();
        services.AddIdentityFeatures();

        services.AddSingleton<IPastelStartupTask, CatalogSyncTask>();
        services.AddSingleton<IPastelStartupTask, BootstrapAdminTask>();

        // Con contraseña temporal solo se permite lo necesario para cambiarla o salir.
        services.Configure<ForcePasswordChangeOptions>(options =>
        {
            options.AllowedPaths.Add("/api/auth/me");
            options.AllowedPaths.Add("/api/auth/change-password");
            options.AllowedPaths.Add("/api/auth/logout");
        });
    }

    /// <summary>Identity no expone rutas bajo <c>/api/identity</c>: conserva <c>/api/auth</c> y <c>/api/admin</c>.</summary>
    public void MapEndpoints(IEndpointRouteBuilder api)
    {
    }

    public void MapRootEndpoints(IEndpointRouteBuilder apiRoot) => IdentityEndpoints.Map(apiRoot);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<IdentityDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<IdentityDbContext>(services, cancellationToken);
}

/// <summary>Nombres de índice únicos de Identity que la persona usuaria puede provocar, con el campo y mensaje que se le muestran.</summary>
internal sealed class IdentityUniqueViolations : IUniqueViolationSource
{
    public void Register(UniqueViolationMap map)
    {
        map.Register("users_NormalizedEmail", "email", "Ya existe una cuenta con ese correo.");
        map.Register("roles_NormalizedName", "name", "Ya existe un rol con ese nombre.");
    }
}
