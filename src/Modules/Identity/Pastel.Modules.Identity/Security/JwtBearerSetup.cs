using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Security;

/// <summary>Autenticación por JWT en cookie. Una sola proyección del estado de sesión por petición (hallazgo B3).</summary>
internal static class JwtBearerSetup
{
    /// <summary>Resumen de la persona de la petición, cargado junto con el estado de sesión (misma consulta).</summary>
    public const string SessionUserItemKey = "identity.session-user";

    public static IServiceCollection AddIdentityAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((options, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;
                var signingKeys = new List<SecurityKey>
                {
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)) { KeyId = jwt.SigningKeyId },
                };
                if (!string.IsNullOrWhiteSpace(jwt.PreviousSigningKey) && !string.IsNullOrWhiteSpace(jwt.PreviousSigningKeyId))
                {
                    signingKeys.Add(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.PreviousSigningKey))
                    {
                        KeyId = jwt.PreviousSigningKeyId,
                    });
                }

                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeyResolver = (_, _, kid, _) => kid is null
                        ? signingKeys
                        : signingKeys.Where(key => string.Equals(key.KeyId, kid, StringComparison.Ordinal)).ToArray(),
                    ValidateLifetime = true,
                    RequireExpirationTime = true,
                    RequireSignedTokens = true,
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "name",
                    RoleClaimType = "role",
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (context.Request.Cookies.TryGetValue(PastelCookies.Access, out var cookieToken))
                        {
                            context.Token = cookieToken;
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ValidateSessionAsync,
                };
            });
        return services;
    }

    private static async Task ValidateSessionAsync(TokenValidatedContext context)
    {
        var subject = context.Principal?.FindFirst("sub")?.Value;
        var versionText = context.Principal?.FindFirst("token_version")?.Value;
        if (!Guid.TryParse(subject, out var userId) || !int.TryParse(versionText, out var tokenVersion))
        {
            context.Fail("Falta el sujeto o la versión del token.");
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<IdentityDbContext>();
        var row = await db.Users.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.DisplayName,
                x.IsActive,
                x.MustChangePassword,
                x.AccessFailedCount,
                x.LockoutEnd,
                x.CreatedAt,
                x.TokenVersion,
                Roles = x.UserRoles.Select(r => r.Role.Name).ToList(),
            })
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);
        if (row is null || !row.IsActive || row.TokenVersion != tokenVersion)
        {
            context.Fail("Cuenta inactiva o token invalidado.");
            return;
        }

        var state = new PastelSessionState(row.IsActive, row.TokenVersion, row.MustChangePassword);
        context.HttpContext.Items[SessionUserItemKey] = new UserSummary(
            row.Id, row.Email, row.DisplayName, row.IsActive, row.MustChangePassword, row.AccessFailedCount, row.LockoutEnd, row.CreatedAt,
            row.Roles.OrderBy(x => x, StringComparer.Ordinal).ToArray());
        context.HttpContext.Items[PastelSessionState.ItemKey] = state;
    }
}

internal static class SessionUserExtensions
{
    public static UserSummary? GetSessionUser(this Microsoft.AspNetCore.Http.HttpContext context) =>
        context.Items.TryGetValue(JwtBearerSetup.SessionUserItemKey, out var value) ? value as UserSummary : null;
}
