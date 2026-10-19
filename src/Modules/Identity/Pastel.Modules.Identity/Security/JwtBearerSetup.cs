using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Security;

/// <summary>Autenticación por JWT en cookie. Una sola proyección del estado de sesión por petición (hallazgo B3).</summary>
internal static class JwtBearerSetup
{
    public static IServiceCollection AddIdentityAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((options, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
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
        var state = await db.Users.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new PastelSessionState(x.IsActive, x.TokenVersion, x.MustChangePassword))
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        if (state is null || !state.IsActive || state.TokenVersion != tokenVersion)
        {
            context.Fail("Cuenta inactiva o token invalidado.");
            return;
        }

        context.HttpContext.Items[PastelSessionState.ItemKey] = state;
    }
}
