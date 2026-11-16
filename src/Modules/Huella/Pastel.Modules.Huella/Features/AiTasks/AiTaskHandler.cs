using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Features.Letters;
using Pastel.Modules.Huella.Features.PublicContent;
using Pastel.Modules.Huella.Features.Studio;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.AiTasks;

/// <summary>
/// Datos de una tarea de IA. Cada tarea usa los campos que le corresponden: <c>cv</c> (oferta o enfoque, nivel, papel,
/// idiomas, formato —<c>standard</c> o <c>competencies</c>—, nombre y, opcional, la versión a reemplazar), <c>letter</c> (oferta, idiomas, tono, nombre y, opcional, la carta a
/// reemplazar en <c>VersionId</c>), <c>profile</c> y <c>profile-translate</c> (secciones) y, al
/// importar, <c>Json</c> con la respuesta de la IA externa.
/// </summary>
internal sealed record AiTaskInput(
    Guid? OfferId,
    string? Focus,
    string? Level,
    string? Paper,
    IReadOnlyList<string>? Languages,
    string? Name,
    Guid? VersionId,
    IReadOnlyList<string>? Sections,
    string? Json,
    string? Tone = null,
    string? Today = null,
    string? Format = null);

/// <summary>El prompt completo de una tarea y el nombre sugerido para guardarlo. Es el mismo texto que recibe el proveedor configurado.</summary>
internal sealed record AiTaskPackage(string Kind, string Title, string FileName, string Prompt, string Schema);

/// <summary>Lo que dejó una tarea: líneas aceptadas y rechazadas (con motivo), versiones de CV creadas o secciones del perfil actualizadas.</summary>
internal sealed record AiTaskOutcome(string Kind, int Accepted, IReadOnlyList<string> Rejected, IReadOnlyList<Guid> VersionIds, IReadOnlyList<string> Sections);

/// <summary>
/// Punto único de las acciones de IA de Huella. Toda acción tiene tres rutas con las mismas reglas: <b>paquete</b> (el prompt
/// completo, para llevarlo a una IA externa), <b>ejecutar</b> (lo envía al proveedor configurado y aplica la respuesta) e
/// <b>importar</b> (aplica el JSON que devolvió la IA externa). Nada se guarda sin pasar por el guardián de verdad.
/// </summary>
internal sealed class AiTaskHandler(OwnerProfiles owners, StudioHandler studio, LetterHandler letters, ContentHandler content, AiAssistant ai)
{
    public const string Cv = "cv";
    public const string Letter = "letter";
    public const string Profile = "profile";
    public const string ProfileTranslate = "profile-translate";

    public static bool IsKnown(string? kind) => kind is Cv or Letter or Profile or ProfileTranslate;

    public Task<Result<AiTaskPackage>> PackageAsync(string kind, AiTaskInput input, CancellationToken cancellationToken) =>
        kind switch
        {
            Cv => studio.ComposePackageAsync(input, cancellationToken),
            Letter => letters.ComposePackageAsync(input, cancellationToken),
            Profile => content.GeneratePackageAsync(input.Sections, cancellationToken),
            ProfileTranslate => content.TranslatePackageAsync(input.Sections, cancellationToken),
            _ => Task.FromResult<Result<AiTaskPackage>>(HuellaErrors.NotFound),
        };

    /// <summary>Ejecuta la tarea con el proveedor de IA configurado. La respuesta se valida igual que una importada.</summary>
    public async Task<Result<AiTaskOutcome>> RunAsync(string kind, AiTaskInput input, CancellationToken cancellationToken)
    {
        var package = await PackageAsync(kind, input, cancellationToken);
        if (package.IsFailure)
        {
            return package.Error;
        }

        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var answer = await ai.RunAsync(profile.Value, package.Value.Prompt, cancellationToken);
        return answer.IsFailure ? answer.Error : await ApplyAsync(kind, input, answer.Value, HuellaErrors.AiProviderInvalidJson, cancellationToken);
    }

    /// <summary>Aplica la respuesta pegada o subida desde una IA externa.</summary>
    public Task<Result<AiTaskOutcome>> ImportAsync(string kind, AiTaskInput input, CancellationToken cancellationToken) =>
        ApplyAsync(kind, input, input.Json, HuellaErrors.AiResultInvalid, cancellationToken);

    private Task<Result<AiTaskOutcome>> ApplyAsync(string kind, AiTaskInput input, string? raw, Pastel.SharedKernel.Error invalid, CancellationToken cancellationToken) =>
        kind switch
        {
            Cv => studio.ComposeApplyAsync(input, raw, invalid, cancellationToken),
            Letter => letters.ComposeApplyAsync(input, raw, invalid, cancellationToken),
            Profile => content.ApplyGeneratedAsync(input.Sections, raw, invalid, cancellationToken),
            ProfileTranslate => content.ApplyTranslationAsync(input.Sections, raw, invalid, cancellationToken),
            _ => Task.FromResult<Result<AiTaskOutcome>>(HuellaErrors.NotFound),
        };
}
