using System.Reflection;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Platform.Errors;
using Pastel.Platform.Modules;
using Pastel.Platform.Observability;
using Pastel.Platform.Security;
using Serilog;
using Pastel.SharedKernel;
using Serilog.Formatting.Compact;

namespace Pastel.Platform.Hosting;

/// <summary>Composición de la plataforma. <c>Program.cs</c> solo encadena estas llamadas.</summary>
public static class PastelHostingExtensions
{
    public const string AuthRateLimit = "auth";
    public const string GoogleRateLimit = "google";
    public const string ClientErrorsRateLimit = "client-errors";

    /// <summary>Serilog en JSON a la salida estándar, con enriquecimiento y una línea de resumen por petición.</summary>
    public static WebApplicationBuilder AddPastelObservability(this WebApplicationBuilder builder)
    {
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton<LogHasher>();
        var version = typeof(PastelHostingExtensions).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "dev";
        builder.Host.UseSerilog((context, services, configuration) => configuration
            .ReadFrom.Configuration(context.Configuration)
            .Enrich.FromLogContext()
            .Enrich.With(new PastelLogEnricher(services.GetRequiredService<IHttpContextAccessor>()))
            .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
            .Enrich.WithProperty("Version", version)
            .WriteTo.Console(new CompactJsonFormatter()));
        return builder;
    }

    /// <summary>Errores, proxy confiable, límites de tasa y autorización por permiso.</summary>
    public static WebApplicationBuilder AddPastelSecurity(this WebApplicationBuilder builder)
    {
        var services = builder.Services;
        var configuration = builder.Configuration;

        services.TryAddSingleton<IClock, SystemClock>();
        services.AddSingleton(provider =>
        {
            var map = new UniqueViolationMap();
            foreach (var source in provider.GetServices<IUniqueViolationSource>())
            {
                source.Register(map);
            }

            return map;
        });
        services.AddExceptionHandler<PastelExceptionHandler>();
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
        {
            context.ProblemDetails.Extensions["traceId"] = PastelProblem.TraceId(context.HttpContext);
            context.ProblemDetails.Extensions.TryAdd("code", $"platform.http_{context.ProblemDetails.Status}");
        });

        services.AddSingleton<DeniedAccessThrottle>();
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
        services.AddSingleton<IAuthorizationMiddlewareResultHandler, PastelAuthorizationResultHandler>();
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        });

        services.Configure<ForcePasswordChangeOptions>(_ => { });
        services.Configure<PublicBaseUrlOptions>(options =>
        {
            if (Uri.TryCreate(configuration["App:PublicBaseUrl"], UriKind.Absolute, out var uri))
            {
                options.BaseUri = uri;
            }
        });

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
            options.ForwardLimit = configuration.GetValue("ReverseProxy:ForwardLimit", 1);
            options.KnownProxies.Clear();
            options.KnownIPNetworks.Clear();
            var networks = configuration["ReverseProxy:TrustedNetworks"] ?? "127.0.0.0/8;::1/128;172.16.0.0/12";
            var configuredNetworks = networks.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (configuredNetworks.Length == 0)
            {
                throw new InvalidOperationException("ReverseProxy:TrustedNetworks debe contener al menos una subred CIDR confiable.");
            }

            foreach (var text in configuredNetworks)
            {
                if (!IPNetwork.TryParse(text, out var network))
                {
                    throw new InvalidOperationException("ReverseProxy:TrustedNetworks contiene una subred CIDR inválida.");
                }

                options.KnownIPNetworks.Add(network);
            }
        });

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(AuthRateLimit, context => PerIp(context, 12));
            options.AddPolicy(GoogleRateLimit, context => PerIp(context, 20));
            options.AddPolicy(ClientErrorsRateLimit, context => PerIp(context, 10));
            options.OnRejected = async (context, cancellationToken) =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Pastel.RateLimit");
                logger.LogWarning(PastelEventIds.RateLimited, "Límite de tasa alcanzado en {Path}", context.HttpContext.Request.Path.Value);
                await PastelProblem.From(PlatformErrors.RateLimited(), context.HttpContext).ExecuteAsync(context.HttpContext);
            };
        });
        return builder;
    }

    /// <summary>Descubre los módulos, registra sus servicios y la comprobación de disponibilidad.</summary>
    public static WebApplicationBuilder AddPastelModules(this WebApplicationBuilder builder)
    {
        var modules = ModuleLoader.Load();
        builder.Services.AddSingleton(new ModuleCatalog(modules));
        foreach (var module in modules)
        {
            module.ConfigureServices(builder.Services, builder.Configuration);
        }

        builder.Services.AddHealthChecks().AddCheck<ModulesReadyHealthCheck>("modules", tags: ["ready"]);
        return builder;
    }

    /// <summary>Orden del canal HTTP: errores, proxy, URL pública, cabeceras, registro, CSRF, autenticación, contraseña temporal, límite, autorización.</summary>
    public static WebApplication UsePastelPipeline(this WebApplication app)
    {
        app.UseForwardedHeaders();
        app.UseMiddleware<TraceIdMiddleware>();
        app.UseExceptionHandler();
        app.UseSerilogRequestLogging(options =>
        {
            options.IncludeQueryInRequestPath = false;
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} respondió {StatusCode} en {Elapsed:0.0} ms";
            options.GetLevel = (context, _, exception) =>
                exception is not null || context.Response.StatusCode >= 500 ? Serilog.Events.LogEventLevel.Error
                : context.Request.Path.StartsWithSegments("/health") ? Serilog.Events.LogEventLevel.Verbose
                : Serilog.Events.LogEventLevel.Information;
            options.EnrichDiagnosticContext = (diagnostics, context) =>
            {
                if (context.GetEndpoint() is RouteEndpoint endpoint
                    && endpoint.RoutePattern.RawText is { } routeTemplate)
                {
                    diagnostics.Set("RouteTemplate", routeTemplate);
                }
            };
        });
        app.UseMiddleware<PublicBaseUrlMiddleware>();
        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseStatusCodePages();
        app.UseRouting();
        app.UseMiddleware<CsrfProtectionMiddleware>();
        app.UseAuthentication();
        app.UseMiddleware<ForcePasswordChangeMiddleware>();
        app.UseRateLimiter();
        app.UseAuthorization();
        return app;
    }

    /// <summary>Salud, errores del cliente y las rutas de cada módulo.</summary>
    public static WebApplication MapPastelEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health/live", new() { Predicate = _ => false }).AllowAnonymousExplicit();
        app.MapHealthChecks("/health/ready", new() { Predicate = check => check.Tags.Contains("ready") }).AllowAnonymousExplicit();
        app.MapClientErrors();

        var api = app.MapGroup("/api");
        foreach (var module in app.Services.GetRequiredService<ModuleCatalog>().Modules)
        {
            module.MapRootEndpoints(api);
            module.MapEndpoints(api.MapGroup("/" + module.Code));
        }

        return app;
    }

    /// <summary>Migra cada módulo en orden y ejecuta las tareas de arranque (catálogo, siembra, validaciones).</summary>
    public static async Task InitializePastelAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Pastel.Startup");
        var catalog = app.Services.GetRequiredService<ModuleCatalog>();
        var tasks = app.Services.GetServices<IPastelStartupTask>().OrderBy(t => t.Order).ToArray();

        foreach (var task in tasks.Where(t => t.Order < 0))
        {
            await task.RunAsync(app.Services, cancellationToken);
        }

        if (app.Configuration.GetValue("Database:ApplyMigrationsAtStartup", true))
        {
            foreach (var module in catalog.Modules)
            {
                logger.LogInformation(PastelEventIds.Startup, "Migrando el esquema del módulo {ModuleCode}", module.Code);
                await module.MigrateAsync(app.Services, cancellationToken);
            }
        }
        else
        {
            foreach (var module in catalog.Modules)
            {
                if (await module.HasPendingMigrationsAsync(app.Services, cancellationToken))
                {
                    throw new InvalidOperationException($"Hay migraciones pendientes del módulo {module.Code}. Aplíquelas antes de iniciar la API.");
                }
            }
        }

        foreach (var task in tasks.Where(t => t.Order >= 0))
        {
            await task.RunAsync(app.Services, cancellationToken);
        }
    }

    private static RateLimitPartition<string> PerIp(HttpContext context, int permitsPerMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            });
}

/// <summary>Disponibilidad: la base responde y ningún módulo tiene migraciones pendientes.</summary>
internal sealed class ModulesReadyHealthCheck(ModuleCatalog catalog, IServiceProvider services) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            foreach (var module in catalog.Modules)
            {
                if (await module.HasPendingMigrationsAsync(services, cancellationToken))
                {
                    return HealthCheckResult.Unhealthy($"Migraciones pendientes en {module.Code}.");
                }
            }

            return HealthCheckResult.Healthy();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return HealthCheckResult.Unhealthy("La base de datos no responde.", ex);
        }
    }
}
