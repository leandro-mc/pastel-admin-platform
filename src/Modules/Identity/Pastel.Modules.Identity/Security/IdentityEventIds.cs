using Microsoft.Extensions.Logging;

namespace Pastel.Modules.Identity.Security;

/// <summary>Identificadores de evento de Identity (rango 1000–1999).</summary>
internal static class IdentityEventIds
{
    public static readonly EventId CatalogSynced = new(1001, nameof(CatalogSynced));
    public static readonly EventId BootstrapAdmin = new(1002, nameof(BootstrapAdmin));
    public static readonly EventId LoginSucceeded = new(1010, nameof(LoginSucceeded));
    public static readonly EventId LoginFailed = new(1011, nameof(LoginFailed));
    public static readonly EventId AccountLocked = new(1012, nameof(AccountLocked));
    public static readonly EventId SessionRefreshed = new(1020, nameof(SessionRefreshed));
    public static readonly EventId RefreshReuseDetected = new(1021, nameof(RefreshReuseDetected));
    public static readonly EventId PasswordChanged = new(1030, nameof(PasswordChanged));
    public static readonly EventId PrivilegeDenied = new(1040, nameof(PrivilegeDenied));
    public static readonly EventId AdminChange = new(1050, nameof(AdminChange));
    public static readonly EventId GoogleLogin = new(1060, nameof(GoogleLogin));
    public static readonly EventId GoogleLinked = new(1061, nameof(GoogleLinked));
    public static readonly EventId GoogleRejected = new(1062, nameof(GoogleRejected));
}
