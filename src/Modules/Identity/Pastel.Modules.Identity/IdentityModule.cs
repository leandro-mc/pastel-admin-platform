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
            .Validate(x => !string.IsNullOrWhiteSpace(x.SigningKeyId) && x.SigningKeyId.Length <= 64, "Jwt:SigningKeyId es obligatorio y admite hasta 64 caracteres.")
            .Validate(x => string.IsNullOrWhiteSpace(x.PreviousSigningKey)
                || System.Text.Encoding.UTF8.GetByteCount(x.PreviousSigningKey) >= 32, "Jwt:PreviousSigningKey debe tener al menos 32 bytes UTF-8.")
            .Validate(x => string.IsNullOrWhiteSpace(x.PreviousSigningKey)
                ? string.IsNullOrWhiteSpace(x.PreviousSigningKeyId)
                : !string.IsNullOrWhiteSpace(x.PreviousSigningKeyId)
                    && x.PreviousSigningKeyId.Length <= 64
                    && !string.Equals(x.SigningKeyId, x.PreviousSigningKeyId, StringComparison.Ordinal)
                    && !string.Equals(x.SigningKey, x.PreviousSigningKey, StringComparison.Ordinal),
                "La clave JWT anterior debe tener un identificador distinto y una clave distinta de la actual.")
            .Validate(x => x.AccessTokenMinutes is >= 5 and <= 30, "La vida del token de acceso debe estar entre 5 y 30 minutos.")
            .ValidateOnStart();
        services.AddOptions<AuthOptions>()
            .Bind(configuration.GetSection(AuthOptions.SectionName))
            .Validate(x => x.Refresh.ReuseGraceSeconds is >= 0 and <= 60, "Auth:Refresh:ReuseGraceSeconds debe estar entre 0 y 60.")
            .ValidateOnStart();

        services.AddOptions<IdentityRetentionOptions>()
            .Bind(configuration.GetSection(IdentityRetentionOptions.SectionName))
            .Validate(x => x.ExpiredRefreshTokenDays is >= 30 and <= 3650, "Identity:Retention:ExpiredRefreshTokenDays debe estar entre 30 y 3650.")
            .Validate(x => x.AuditLogRetentionDays is >= 30 and <= 3650, "Identity:Retention:AuditLogRetentionDays debe estar entre 30 y 3650.")
            .Validate(x => x.CleanupIntervalHours is >= 1 and <= 168, "Identity:Retention:CleanupIntervalHours debe estar entre 1 y 168.")
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
        services.AddGoogleSignIn(configuration);
        // El redirect_uri de Google debe coincidir exacto con App:PublicBaseUrl, sin depender de cómo llegue el proxy.
        services.Configure<PublicBaseUrlOptions>(options => options.PathPrefixes.Add("/api/auth/google"));
        services.AddIdentityFeatures();

        services.AddSingleton<IPastelStartupTask, ProductionSecurityValidationTask>();
        services.AddSingleton<IPastelStartupTask, CatalogSyncTask>();
        services.AddSingleton<IPastelStartupTask, BootstrapAdminTask>();
        services.AddHostedService<IdentityRetentionService>();

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
