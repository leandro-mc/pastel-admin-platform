using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;

namespace Pastel.Platform.Security;

/// <summary>Marca que el endpoint es público a propósito (las pruebas de arquitectura lo exigen).</summary>
public sealed class ExplicitAnonymousMetadata
{
    public static readonly ExplicitAnonymousMetadata Instance = new();
}

/// <summary>Marca que el endpoint solo exige una sesión válida, sin permiso específico (p. ej. «mi cuenta»).</summary>
public sealed class SessionOnlyMetadata
{
    public static readonly SessionOnlyMetadata Instance = new();
}

public static class PermissionPolicy
{
    public const string Prefix = "permission:";

    public static string Name(string permissionCode) => Prefix + permissionCode;
}

/// <summary>Todo endpoint declara <c>RequirePermission</c>, <c>RequireSession</c> o <c>AllowAnonymousExplicit</c>; denegar por defecto.</summary>
public static class EndpointSecurityExtensions
{
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, string permissionCode)
        where TBuilder : IEndpointConventionBuilder =>
        builder.RequireAuthorization(PermissionPolicy.Name(permissionCode));

    public static TBuilder RequireSession<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.RequireAuthorization().WithMetadata(SessionOnlyMetadata.Instance);

    public static TBuilder AllowAnonymousExplicit<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.AllowAnonymous().WithMetadata(ExplicitAnonymousMetadata.Instance);
}
