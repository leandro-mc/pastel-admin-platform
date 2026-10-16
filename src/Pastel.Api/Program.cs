using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pastel.Api.Middleware;
using Pastel.Application.Abstractions;
using Pastel.Domain.Entities;
using Pastel.Infrastructure.Persistence;
using Pastel.Infrastructure.Security;
using Pastel.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddHttpContextAccessor();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddOptions<JwtOptions>().Validate(x => Encoding.UTF8.GetByteCount(x.SigningKey) >= 32, "Jwt:SigningKey must contain at least 32 UTF-8 bytes.").Validate(x => x.AccessTokenMinutes is >= 5 and <= 30, "Access token lifetime must be between 5 and 30 minutes.").ValidateOnStart();

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString,
    npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name!)));
builder.Services.AddScoped<IAppDbContext>(services => services.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.Configure<PasswordHasherOptions>(options => options.IterationCount = 600_000);
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdministrationService, AdministrationService>();
builder.Services.AddSingleton<ITokenService, JwtTokenService>();

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, PermissionAuthorizationHandler>();

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwt.Issuer,
        ValidateAudience = true,
        ValidAudience = jwt.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = signingKey,
        ValidateLifetime = true,
        RequireExpirationTime = true,
        RequireSignedTokens = true,
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = "name",
        RoleClaimType = "role"
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.TryGetValue(AuthController.AccessCookieName, out var cookieToken)) context.Token = cookieToken;
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var subject = context.Principal?.FindFirst("sub")?.Value;
            var versionText = context.Principal?.FindFirst("token_version")?.Value;
            if (!Guid.TryParse(subject, out var userId) || !int.TryParse(versionText, out var tokenVersion))
            {
                context.Fail("Token subject/version missing.");
                return;
            }
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var user = await db.Users.AsNoTracking().Where(x => x.Id == userId)
                .Select(x => new { x.IsActive, x.LockoutEnd, x.TokenVersion }).SingleOrDefaultAsync(context.HttpContext.RequestAborted);
            if (user is null || !user.IsActive || user.LockoutEnd > DateTimeOffset.UtcNow || user.TokenVersion != tokenVersion)
                context.Fail("Account inactive or token invalidated.");
        }
    };
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions { PermitLimit = 12, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Trust only the reverse proxy's static address in Docker Compose; do not trust arbitrary X-Forwarded-* headers.
    options.KnownProxies.Add(IPAddress.Parse(builder.Configuration["ReverseProxy:TrustedAddress"] ?? "172.30.0.2"));
    options.ForwardLimit = 1;
});

var app = builder.Build();
app.UseForwardedHeaders();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseRouting();
app.UseMiddleware<CsrfProtectionMiddleware>();
app.UseAuthentication();
app.UseMiddleware<ForcePasswordChangeMiddleware>();
app.UseRateLimiter();
app.UseAuthorization();

if (app.Environment.IsDevelopment()) app.MapOpenApi().AllowAnonymous();
app.MapHealthChecks("/health/live").AllowAnonymous();
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseStartup");
    var migrationIds = db.Database.GetMigrations().ToArray();
    if (migrationIds.Length == 0)
    {
        var migrationsAssembly = typeof(AppDbContext).Assembly.GetName().Name;
        throw new InvalidOperationException($"No EF Core migrations were discovered in '{migrationsAssembly}'. Ensure migrations are compiled into the infrastructure assembly and runtime EF Core versions are aligned.");
    }

    logger.LogInformation("Discovered {MigrationCount} EF Core migration(s): {MigrationIds}", migrationIds.Length, string.Join(", ", migrationIds));
    if (app.Configuration.GetValue("Database:ApplyMigrationsAtStartup", true))
    {
        await db.Database.MigrateAsync();
    }
    else
    {
        var pendingMigrations = await db.Database.GetPendingMigrationsAsync();
        if (pendingMigrations.Any())
            throw new InvalidOperationException("Database migrations are pending. Apply them in the deployment migration stage before starting the API.");
    }
    await DatabaseSeeder.InitializeAsync(db, app.Configuration, hasher, logger);
}

app.Run();

public partial class Program { }
