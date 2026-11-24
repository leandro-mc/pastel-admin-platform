using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.AiSettings;

/// <summary>Configuración de la IA automática del propietario (proveedor, modelo y clave cifrada).</summary>
internal sealed class AiSettingsHandler(OwnerProfiles owners, AiAssistant ai)
{
    public async Task<Result<AiSettingsView>> GetAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return profile.IsFailure ? profile.Error : await ai.GetSettingsAsync(profile.Value, cancellationToken);
    }

    public async Task<Result<AiSettingsView>> SaveAsync(string provider, AiCredentialInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return profile.IsFailure ? profile.Error : await ai.SaveAsync(profile.Value, provider, input, cancellationToken);
    }

    public async Task<Result<AiSettingsView>> DeleteAsync(string provider, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return profile.IsFailure ? profile.Error : await ai.DeleteAsync(profile.Value, provider, cancellationToken);
    }

    public async Task<Result<IReadOnlyList<AiModelInfo>>> ModelsAsync(string provider, AiModelsInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return profile.IsFailure ? profile.Error : await ai.ListModelsAsync(profile.Value, provider, input, cancellationToken);
    }
}
