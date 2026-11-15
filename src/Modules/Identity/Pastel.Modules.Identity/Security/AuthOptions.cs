namespace Pastel.Modules.Identity.Security;

/// <summary>Opciones de acceso (<c>Auth:*</c>). Contraseña local y Google se activan por configuración.</summary>
internal sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public LocalAuthOptions Local { get; init; } = new();
    public GoogleAuthOptions Google { get; init; } = new();
    public RefreshOptions Refresh { get; init; } = new();
}

internal sealed class LocalAuthOptions
{
    public bool Enabled { get; init; } = true;

    /// <summary>Autorregistro con contraseña. Desactivado por defecto: las cuentas las crea administración o Google.</summary>
    public bool SelfRegistrationEnabled { get; init; }
}

internal sealed class GoogleAuthOptions
{
    /// <summary>Permite crear una cuenta <c>Member</c> al ingresar por primera vez con Google.</summary>
    public bool AllowSignUp { get; init; } = true;
}

internal sealed class RefreshOptions
{
    /// <summary>Segundos en que un refresh token ya rotado todavía se acepta (dos pestañas legítimas al mismo tiempo).</summary>
    public int ReuseGraceSeconds { get; init; } = 10;
}
