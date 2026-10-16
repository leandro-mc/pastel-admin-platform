namespace Pastel.Application.Contracts;

public static class PasswordPolicy
{
    public static bool IsStrong(string? password) => password is { Length: >= 12 and <= 128 }
        && password.Any(char.IsUpper)
        && password.Any(char.IsLower)
        && password.Any(char.IsDigit)
        && password.Any(c => !char.IsLetterOrDigit(c));
}
