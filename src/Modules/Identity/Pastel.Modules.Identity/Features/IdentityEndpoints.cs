using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Features.BlockUser;
using Pastel.Modules.Identity.Features.ChangePassword;
using Pastel.Modules.Identity.Features.CreateRole;
using Pastel.Modules.Identity.Features.CreateUser;
using Pastel.Modules.Identity.Features.GetCsrfToken;
using Pastel.Modules.Identity.Features.GetCurrentUser;
using Pastel.Modules.Identity.Features.GetUserPermissions;
using Pastel.Modules.Identity.Features.ListAudit;
using Pastel.Modules.Identity.Features.ListModules;
using Pastel.Modules.Identity.Features.ListPermissions;
using Pastel.Modules.Identity.Features.ListRoles;
using Pastel.Modules.Identity.Features.ListUsers;
using Pastel.Modules.Identity.Features.Login;
using Pastel.Modules.Identity.Features.Logout;
using Pastel.Modules.Identity.Features.Refresh;
using Pastel.Modules.Identity.Features.Register;
using Pastel.Modules.Identity.Features.ResetUserPassword;
using Pastel.Modules.Identity.Features.SetModuleEnabled;
using Pastel.Modules.Identity.Features.SetRolePermissions;
using Pastel.Modules.Identity.Features.SetUserPermissions;
using Pastel.Modules.Identity.Features.SetUserRoles;
using Pastel.Modules.Identity.Features.UnblockUser;
using Pastel.Modules.Identity.Security;

namespace Pastel.Modules.Identity.Features;

/// <summary>
/// Punto único donde se enlazan los slices de <c>Features/</c> con las rutas <c>/api/auth/*</c> y <c>/api/admin/*</c>.
/// Cada slice expone <c>Map(IEndpointRouteBuilder)</c> y su manejador se registra en <see cref="AddIdentityFeatures"/>.
/// </summary>
internal static class IdentityEndpoints
{
    public static IServiceCollection AddIdentityFeatures(this IServiceCollection services)
    {
        services.AddSingleton<SessionCookies>();
        services.AddScoped<SessionIssuer>();
        services.AddScoped<IPrivilegeGuard, PrivilegeGuard>();
        services.AddScoped<LoginHandler>();
        services.AddScoped<RegisterHandler>();
        services.AddScoped<RefreshHandler>();
        services.AddScoped<LogoutHandler>();
        services.AddScoped<ChangePasswordHandler>();
        services.AddScoped<ListUsersHandler>();
        services.AddScoped<CreateUserHandler>();
        services.AddScoped<SetUserRolesHandler>();
        services.AddScoped<SetUserPermissionsHandler>();
        services.AddScoped<BlockUserHandler>();
        services.AddScoped<ResetUserPasswordHandler>();
        services.AddScoped<CreateRoleHandler>();
        services.AddScoped<SetRolePermissionsHandler>();
        services.AddScoped<ListAuditHandler>();
        return services;
    }

    public static void Map(IEndpointRouteBuilder apiRoot)
    {
        var auth = apiRoot.MapGroup("/auth");
        GetCsrfTokenEndpoint.Map(auth);
        LoginEndpoint.Map(auth);
        RegisterEndpoint.Map(auth);
        RefreshEndpoint.Map(auth);
        LogoutEndpoint.Map(auth);
        GetCurrentUserEndpoint.Map(auth);
        ChangePasswordEndpoint.Map(auth);

        var users = apiRoot.MapGroup("/admin/users");
        ListUsersEndpoint.Map(users);
        CreateUserEndpoint.Map(users);
        SetUserRolesEndpoint.Map(users);
        GetUserPermissionsEndpoint.Map(users);
        SetUserPermissionsEndpoint.Map(users);
        BlockUserEndpoint.Map(users);
        UnblockUserEndpoint.Map(users);
        ResetUserPasswordEndpoint.Map(users);

        var roles = apiRoot.MapGroup("/admin/roles");
        ListRolesEndpoint.Map(roles);
        CreateRoleEndpoint.Map(roles);
        SetRolePermissionsEndpoint.Map(roles);

        ListPermissionsEndpoint.Map(apiRoot.MapGroup("/admin/permissions"));

        var modules = apiRoot.MapGroup("/admin/modules");
        ListModulesEndpoint.Map(modules);
        SetModuleEnabledEndpoint.Map(modules);

        ListAuditEndpoint.Map(apiRoot.MapGroup("/admin/audit"));
    }
}
