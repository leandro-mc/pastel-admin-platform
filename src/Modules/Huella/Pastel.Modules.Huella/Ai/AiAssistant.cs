using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Ai;

internal sealed record AiProviderView(
    string Id,
    string Label,
    string DefaultModel,
    bool Configured,
    bool Readable,
    bool IsActive,
    string? Model,
    string? KeyHint,
    DateTimeOffset? UpdatedAt);

internal sealed record AiSettingsView(string? ActiveProvider, IReadOnlyList<AiProviderView> Providers);

/// <summary><c>ApiKey</c> vacío conserva la clave guardada; <c>MakeActive</c> la convierte en el proveedor en uso.</summary>
internal sealed record AiCredentialInput(string? ApiKey, string? Model, bool? MakeActive);

internal sealed record AiModelsInput(string? ApiKey);

/// <summary>
/// Configuración y uso de la IA automática del propietario. La clave entra una vez, se cifra y nunca sale: la API
/// solo devuelve si está configurada y sus últimos cuatro caracteres. Todo lo que el proveedor devuelve pasa después por
/// las mismas validaciones que el JSON pegado a mano (guardián de verdad).
/// </summary>
internal sealed class AiAssistant(HuellaDbContext db, AiKeyProtector protector, IEnumerable<IAiProvider> providers, IClock clock)
{
    public const int MinKeyLength = 16;
    public const int MaxKeyLength = 512;

    private readonly Dictionary<string, IAiProvider> _providers = providers.ToDictionary(p => p.Id, StringComparer.Ordinal);

    public async Task<AiSettingsView> GetSettingsAsync(Profile profile, CancellationToken cancellationToken)
    {
        var rows = await db.AiCredentials.Where(c => c.ProfileId == profile.Id).ToListAsync(cancellationToken);
        var views = AiProviderCatalog.Ids.Select(id =>
        {
            var provider = _providers[id];
            var row = rows.SingleOrDefault(r => r.Provider == id);
            var readable = row is not null && protector.TryUnprotect(row.EncryptedApiKey, profile.Id, id, out _);
            return new AiProviderView(id, provider.Label, provider.DefaultModel, row is not null, readable, row?.IsActive ?? false, row?.Model, row?.KeyHint, row?.UpdatedAt);
        }).ToList();
        return new AiSettingsView(rows.SingleOrDefault(r => r.IsActive)?.Provider, views);
    }

    public async Task<Result<AiSettingsView>> SaveAsync(Profile profile, string providerId, AiCredentialInput input, CancellationToken cancellationToken)
    {
        if (!_providers.TryGetValue(providerId, out var provider))
        {
            return HuellaErrors.NotFound;
        }

        var errors = new FieldErrors();
        var key = input.ApiKey?.Trim() ?? string.Empty;
        var row = await db.AiCredentials.SingleOrDefaultAsync(c => c.ProfileId == profile.Id && c.Provider == providerId, cancellationToken);
        if (key.Length > 0 && !IsPlausibleKey(key))
        {
            errors.Add("apiKey", $"Pegue la clave completa ({MinKeyLength} a {MaxKeyLength} caracteres, sin espacios).");
        }
        else if (key.Length == 0 && row is null)
        {
            errors.Add("apiKey", "Pegue la clave de su cuenta del proveedor.");
        }

        var model = string.IsNullOrWhiteSpace(input.Model) ? provider.DefaultModel : input.Model.Trim();
        if (!AiProviderCatalog.IsValidModel(model))
        {
            errors.Add("model", "Elija un modelo de la lista.");
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var now = clock.UtcNow;
        var all = await db.AiCredentials.Where(c => c.ProfileId == profile.Id).ToListAsync(cancellationToken);
        if (row is null)
        {
            row = new AiCredential { Id = Guid.CreateVersion7(), ProfileId = profile.Id, Provider = providerId, CreatedAt = now };
            db.AiCredentials.Add(row);
            all.Add(row);
        }

        if (key.Length > 0)
        {
            row.EncryptedApiKey = protector.Protect(key, profile.Id, providerId);
            row.KeyHint = key[^4..];
        }

        row.Model = model;
        row.UpdatedAt = now;
        if (input.MakeActive == true || !all.Any(c => c.IsActive && c != row))
        {
            foreach (var other in all)
            {
                other.IsActive = other == row;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return await GetSettingsAsync(profile, cancellationToken);
    }

    public async Task<Result<AiSettingsView>> DeleteAsync(Profile profile, string providerId, CancellationToken cancellationToken)
    {
        if (!_providers.ContainsKey(providerId))
        {
            return HuellaErrors.NotFound;
        }

        var all = await db.AiCredentials.Where(c => c.ProfileId == profile.Id).ToListAsync(cancellationToken);
        var row = all.SingleOrDefault(c => c.Provider == providerId);
        if (row is not null)
        {
            db.AiCredentials.Remove(row);
            if (row.IsActive && all.FirstOrDefault(c => c != row) is { } next)
            {
                next.IsActive = true;
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return await GetSettingsAsync(profile, cancellationToken);
    }

    /// <summary>Modelos disponibles para una clave: la recién pegada (antes de guardar) o la guardada.</summary>
    public async Task<Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(Profile profile, string providerId, AiModelsInput input, CancellationToken cancellationToken)
    {
        if (!_providers.TryGetValue(providerId, out var provider))
        {
            return HuellaErrors.NotFound;
        }

        var key = input.ApiKey?.Trim() ?? string.Empty;
        if (key.Length > 0)
        {
            if (!IsPlausibleKey(key))
            {
                return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["apiKey"] = [$"Pegue la clave completa ({MinKeyLength} a {MaxKeyLength} caracteres, sin espacios)."] });
            }
        }
        else
        {
            var row = await db.AiCredentials.SingleOrDefaultAsync(c => c.ProfileId == profile.Id && c.Provider == providerId, cancellationToken);
            if (row is null)
            {
                return HuellaErrors.AiNotConfigured;
            }

            if (!protector.TryUnprotect(row.EncryptedApiKey, profile.Id, providerId, out key))
            {
                return HuellaErrors.AiKeyUnreadable;
            }
        }

        return await provider.ListModelsAsync(key, cancellationToken);
    }

    /// <summary>Envía el paquete al proveedor activo y devuelve su texto, sin aplicar nada.</summary>
    public async Task<Result<string>> RunAsync(Profile profile, string prompt, CancellationToken cancellationToken)
    {
        var row = await db.AiCredentials.AsNoTracking().SingleOrDefaultAsync(c => c.ProfileId == profile.Id && c.IsActive, cancellationToken);
        if (row is null || !_providers.TryGetValue(row.Provider, out var provider))
        {
            return HuellaErrors.AiNotConfigured;
        }

        if (!protector.TryUnprotect(row.EncryptedApiKey, profile.Id, row.Provider, out var key))
        {
            return HuellaErrors.AiKeyUnreadable;
        }

        return await provider.GenerateJsonAsync(key, row.Model, prompt, cancellationToken);
    }

    private static bool IsPlausibleKey(string key) =>
        key.Length is >= MinKeyLength and <= MaxKeyLength && key.All(c => c > ' ' && c < 127);
}
