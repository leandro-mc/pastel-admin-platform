using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Features.AiSettings;
using Pastel.Modules.Huella.Features.AiTasks;
using Pastel.Modules.Huella.Features.Bank;
using Pastel.Modules.Huella.Features.Common;
using Pastel.Modules.Huella.Features.Emails;
using Pastel.Modules.Huella.Features.Letters;
using Pastel.Modules.Huella.Features.MyProfile;
using Pastel.Modules.Huella.Features.PublicContent;
using Pastel.Modules.Huella.Features.PublicProfile;
using Pastel.Modules.Huella.Features.Publication;
using Pastel.Modules.Huella.Features.Studio;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;

namespace Pastel.Modules.Huella.Features;

/// <summary>
/// Rutas de Huella bajo <c>/api/huella</c>. Todas las del panel exigen <c>huella.access</c> (lectura) o
/// <c>huella.profile.manage</c> (escritura, publicación) y se resuelven desde la sesión: ninguna recibe el identificador
/// del perfil. Las dos rutas públicas son anónimas de forma explícita, con límite de tasa y el token en una cabecera.
/// </summary>
internal static class HuellaEndpoints
{
    public const string PublicRateLimit = "huella-public";
    public const string TokenHeader = "X-Huella-Token";

    public static IServiceCollection AddHuellaHandlers(this IServiceCollection services)
    {
        services.AddScoped<Persistence.OwnerProfiles>();
        services.AddScoped<Persistence.BankLoader>();
        services.AddScoped<ProfileHandler>();
        services.AddScoped<BankHandler>();
        services.AddScoped<BankBackupHandler>();
        services.AddScoped<StudioHandler>();
        services.AddScoped<ContentHandler>();
        services.AddScoped<LetterHandler>();
        services.AddScoped<EmailHandler>();
        services.AddScoped<OfferTracking>();
        services.AddScoped<AiTaskHandler>();
        services.AddScoped<PublicationHandler>();
        services.AddScoped<PublicProfileHandler>();
        services.AddSingleton<Cv.ICvRenderer, Cv.TypstCvRenderer>();
        services.AddScoped<AiSettingsHandler>();
        services.AddScoped<Ai.AiAssistant>();
        services.AddSingleton<Ai.AiKeyProtector>();
        services.AddSingleton<Ai.IAiProvider, Ai.GeminiProvider>();
        services.AddSingleton<Ai.IAiProvider, Ai.OpenAiProvider>();
        services.AddSingleton<Ai.IAiProvider, Ai.AnthropicProvider>();
        services.AddHttpClient(Ai.AiProviderCatalog.HttpClientName, client =>
        {
            // nginx da 150 s a las rutas ai-run; el cliente corta antes para responder con un error claro.
            client.Timeout = TimeSpan.FromSeconds(120);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Pastel-Huella/1.0");
        }).RedactLoggedHeaders(_ => true);
        return services;
    }

    /// <summary>El archivo de respaldo va con sangría: se puede leer, comparar y corregir a mano.</summary>
    private static readonly JsonSerializerOptions BackupJson = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void Map(IEndpointRouteBuilder api)
    {
        const string read = HuellaPermissions.Access;
        const string write = HuellaPermissions.ProfileManage;

        // Perfil
        api.MapGet("/profile", async (ProfileHandler h, HttpContext http, CancellationToken ct) => (await h.GetAsync(ct)).ToResponse(http)).RequirePermission(read);
        api.MapPut("/profile", async (ProfileInput input, ProfileHandler h, HttpContext http, CancellationToken ct) => (await h.SaveAsync(input, ct)).ToResponse(http)).RequirePermission(write);

        // Contenido del perfil público (español editable, inglés sincronizado por IA), por secciones.
        api.MapGet("/profile/content", async (ContentHandler h, HttpContext http, CancellationToken ct) => (await h.GetAsync(ct)).ToResponse(http)).RequirePermission(read);
        api.MapPut("/profile/content/{section}", async (string section, ContentDoc input, ContentHandler h, HttpContext http, CancellationToken ct) => (await h.SaveSectionAsync(section, input, ct)).ToResponse(http)).RequirePermission(write);

        // Acciones de IA: cada una con su prompt para una IA externa (ai-package), su ejecución con el proveedor configurado
        // (ai-run; nginx le da 150 s) y la importación de la respuesta de una IA externa (ai-result). Mismas reglas en las tres.
        var tasks = api.MapGroup("/tasks/{kind}");
        tasks.MapPost("/ai-package", async (string kind, AiTaskInput input, AiTaskHandler h, HttpContext http, CancellationToken ct) =>
            AiTaskHandler.IsKnown(kind) ? (await h.PackageAsync(kind, input, ct)).ToResponse(http) : PastelProblem.From(HuellaErrors.NotFound, http)).RequirePermission(write);
        tasks.MapPost("/ai-run", async (string kind, AiTaskInput input, AiTaskHandler h, HttpContext http, CancellationToken ct) =>
            AiTaskHandler.IsKnown(kind) ? (await h.RunAsync(kind, input, ct)).ToResponse(http) : PastelProblem.From(HuellaErrors.NotFound, http)).RequirePermission(write);
        tasks.MapPost("/ai-result", async (string kind, AiTaskInput input, AiTaskHandler h, HttpContext http, CancellationToken ct) =>
            AiTaskHandler.IsKnown(kind) ? (await h.ImportAsync(kind, input, ct)).ToResponse(http) : PastelProblem.From(HuellaErrors.NotFound, http)).RequirePermission(write);

        // Banco
        var bank = api.MapGroup("/bank");
        bank.MapGet("/", async (BankHandler h, HttpContext http, CancellationToken ct) => (await h.GetAsync(ct)).ToResponse(http)).RequirePermission(read);

        // Respaldo: descargar el perfil y el banco como JSON portable e importarlo (reemplaza todo, todo o nada).
        bank.MapGet("/export", async (BankBackupHandler h, HttpContext http, CancellationToken ct) =>
        {
            var export = await h.ExportAsync(ct);
            if (export.IsFailure)
            {
                return PastelProblem.From(export.Error, http);
            }

            // Datos personales: que ningún intermediario ni el navegador lo guarde.
            http.Response.Headers.CacheControl = "no-store";
            var bytes = JsonSerializer.SerializeToUtf8Bytes(export.Value, BackupJson);
            return Results.File(bytes, "application/json", $"huella-banco-{export.Value.ExportedAt:yyyy-MM-dd}.json");
        }).RequirePermission(read);
        bank.MapPost("/import", async (BankBackup input, BankBackupHandler h, HttpContext http, CancellationToken ct) => (await h.ImportAsync(input, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/notes", async (NotesInput i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveNotesAsync(i, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/experiences", async (ListInput<ExperienceInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveExperiencesAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/projects", async (ListInput<ProjectInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveProjectsAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/skills", async (ListInput<SkillInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveSkillsAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/competencies", async (ListInput<CompetencyInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveCompetenciesAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/education", async (ListInput<EducationInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveEducationsAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/certifications", async (ListInput<CertificationInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveCertificationsAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);
        bank.MapPut("/languages", async (ListInput<LanguageInput> i, BankHandler h, HttpContext http, CancellationToken ct) => (await h.SaveLanguagesAsync(i.Items, ct)).ToResponse(http)).RequirePermission(write);

        // Logros de una experiencia o de un proyecto ({kind}: experiences | projects)
        var parents = bank.MapGroup("/{kind:regex(^(experiences|projects)$)}/{parentId:guid}");
        parents.MapPut("/achievements", async (string kind, Guid parentId, ListInput<AchievementInput> i, BankHandler h, HttpContext http, CancellationToken ct) =>
            (await h.SaveAchievementsAsync(kind, parentId, i.Items, ct)).ToResponse(http)).RequirePermission(write);
        parents.MapPost("/derive", async (string kind, Guid parentId, BankHandler h, HttpContext http, CancellationToken ct) =>
            (await h.DeriveAsync(kind, parentId, ct)).ToResponse(http)).RequirePermission(write);
        parents.MapPost("/ai-package", async (string kind, Guid parentId, BankHandler h, HttpContext http, CancellationToken ct) =>
            (await h.AiPackageAsync(kind, parentId, ct)).ToResponse(http)).RequirePermission(write);
        parents.MapPost("/ai-run", async (string kind, Guid parentId, BankHandler h, HttpContext http, CancellationToken ct) =>
            (await h.RunAiAsync(kind, parentId, ct)).ToResponse(http)).RequirePermission(write);
        parents.MapPost("/ai-result", async (string kind, Guid parentId, AiResultInput i, BankHandler h, HttpContext http, CancellationToken ct) =>
            (await h.AiResultAsync(kind, parentId, i, ct)).ToResponse(http)).RequirePermission(write);

        // Estudio de CV
        var studio = api.MapGroup("/studio");
        studio.MapGet("/offers", async (StudioHandler h, HttpContext http, CancellationToken ct) => (await h.ListOffersAsync(ct)).ToResponse(http)).RequirePermission(read);
        studio.MapPost("/offers", async (OfferInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.CreateOfferAsync(i, ct)).ToResponse(http, StatusCodes.Status201Created)).RequirePermission(write);
        studio.MapGet("/offers/{offerId:guid}", async (Guid offerId, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.GetOfferAsync(offerId, ct)).ToResponse(http)).RequirePermission(read);
        studio.MapDelete("/offers/{offerId:guid}", async (Guid offerId, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.DeleteOfferAsync(offerId, ct)).ToNoContent(http)).RequirePermission(write);
        studio.MapGet("/versions", async (StudioHandler h, HttpContext http, CancellationToken ct) => (await h.ListVersionsAsync(ct)).ToResponse(http)).RequirePermission(read);
        studio.MapPost("/versions", async (GenerateCvInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.GenerateAsync(i, ct)).ToResponse(http, StatusCodes.Status201Created)).RequirePermission(write);
        studio.MapGet("/versions/{versionId:guid}", async (Guid versionId, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.GetVersionAsync(versionId, ct)).ToResponse(http)).RequirePermission(read);
        studio.MapDelete("/versions/{versionId:guid}", async (Guid versionId, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.DeleteVersionAsync(versionId, ct)).ToNoContent(http)).RequirePermission(write);
        studio.MapPut("/versions/{versionId:guid}/name", async (Guid versionId, RenameInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.RenameAsync(versionId, i, ct)).ToResponse(http)).RequirePermission(write);
        // Regenera una sola sección del CV con la IA configurada contra su oferta (no guarda: devuelve la sección); termina en ai-run (nginx da 150 s).
        studio.MapPost("/versions/{versionId:guid}/section/ai-run", async (Guid versionId, CvSectionInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.RegenerateSectionAsync(versionId, i, ct)).ToResponse(http)).RequirePermission(write);
        // Pone al día esta versión con los cambios de su pareja (español/inglés) usando la IA configurada; la ruta termina en ai-run (nginx da 150 s).
        studio.MapPost("/versions/{versionId:guid}/sync/ai-run", async (Guid versionId, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.SyncPairAsync(versionId, ct)).ToResponse(http)).RequirePermission(write);
        studio.MapPut("/versions/{versionId:guid}/document", async (Guid versionId, CvDocumentInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.SaveDocumentAsync(versionId, i, ct)).ToResponse(http)).RequirePermission(write);
        studio.MapPut("/versions/{versionId:guid}/line", async (Guid versionId, EditLineInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.EditLineAsync(versionId, i, ct)).ToResponse(http)).RequirePermission(write);
        studio.MapPut("/offers/{offerId:guid}/tracking", async (Guid offerId, OfferTrackingInput i, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.UpdateTrackingAsync(offerId, i, ct)).ToResponse(http)).RequirePermission(write);
        studio.MapPut("/versions/{versionId:guid}/sent", async (Guid versionId, bool sent, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.SetSentAsync(versionId, sent, ct)).ToResponse(http)).RequirePermission(write);
        studio.MapPut("/versions/{versionId:guid}/public", async (Guid versionId, bool isPublic, StudioHandler h, HttpContext http, CancellationToken ct) => (await h.SetPublicAsync(versionId, isPublic, ct)).ToResponse(http)).RequirePermission(write);
        studio.MapGet("/versions/{versionId:guid}/pdf", async (Guid versionId, StudioHandler h, HttpContext http, CancellationToken ct) =>
        {
            var pdf = await h.RenderPdfAsync(versionId, ct);
            return pdf.IsFailure ? PastelProblem.From(pdf.Error, http) : Results.File(pdf.Value, "application/pdf", "cv.pdf");
        }).RequirePermission(read);
        studio.MapGet("/versions/{versionId:guid}/docx", async (Guid versionId, StudioHandler h, HttpContext http, CancellationToken ct) =>
        {
            var docx = await h.RenderDocxAsync(versionId, ct);
            return docx.IsFailure ? PastelProblem.From(docx.Error, http) : Results.File(docx.Value, CvDocx.ContentType, "cv.docx");
        }).RequirePermission(read);

        // Cartas de presentación (se redactan con las acciones de IA `letter`; aquí se leen, editan, envían y descargan)
        var letters = studio.MapGroup("/letters");
        letters.MapGet("/", async (LetterHandler h, HttpContext http, CancellationToken ct) => (await h.ListAsync(ct)).ToResponse(http)).RequirePermission(read);
        letters.MapGet("/{letterId:guid}", async (Guid letterId, LetterHandler h, HttpContext http, CancellationToken ct) => (await h.GetAsync(letterId, ct)).ToResponse(http)).RequirePermission(read);
        letters.MapPut("/{letterId:guid}/content", async (Guid letterId, LetterEditInput i, LetterHandler h, HttpContext http, CancellationToken ct) => (await h.SaveAsync(letterId, i, ct)).ToResponse(http)).RequirePermission(write);
        letters.MapPut("/{letterId:guid}/name", async (Guid letterId, RenameInput i, LetterHandler h, HttpContext http, CancellationToken ct) => (await h.RenameAsync(letterId, i, ct)).ToResponse(http)).RequirePermission(write);
        letters.MapPut("/{letterId:guid}/sent", async (Guid letterId, bool sent, LetterHandler h, HttpContext http, CancellationToken ct) => (await h.SetSentAsync(letterId, sent, ct)).ToResponse(http)).RequirePermission(write);
        letters.MapDelete("/{letterId:guid}", async (Guid letterId, LetterHandler h, HttpContext http, CancellationToken ct) => (await h.DeleteAsync(letterId, ct)).ToNoContent(http)).RequirePermission(write);
        letters.MapGet("/{letterId:guid}/pdf", async (Guid letterId, LetterHandler h, HttpContext http, CancellationToken ct) =>
        {
            var pdf = await h.RenderPdfAsync(letterId, ct);
            return pdf.IsFailure ? PastelProblem.From(pdf.Error, http) : Results.File(pdf.Value, "application/pdf", "carta.pdf");
        }).RequirePermission(read);
        letters.MapGet("/{letterId:guid}/docx", async (Guid letterId, LetterHandler h, HttpContext http, CancellationToken ct) =>
        {
            var docx = await h.RenderDocxAsync(letterId, ct);
            return docx.IsFailure ? PastelProblem.From(docx.Error, http) : Results.File(docx.Value, CvDocx.ContentType, "carta.docx");
        }).RequirePermission(read);

        // Correos de postulación (se redactan con las acciones de IA `email`; aquí se leen, editan y envían)
        var emails = studio.MapGroup("/emails");
        emails.MapGet("/", async (EmailHandler h, HttpContext http, CancellationToken ct) => (await h.ListAsync(ct)).ToResponse(http)).RequirePermission(read);
        emails.MapGet("/{emailId:guid}", async (Guid emailId, EmailHandler h, HttpContext http, CancellationToken ct) => (await h.GetAsync(emailId, ct)).ToResponse(http)).RequirePermission(read);
        emails.MapPut("/{emailId:guid}/content", async (Guid emailId, EmailEditInput i, EmailHandler h, HttpContext http, CancellationToken ct) => (await h.SaveAsync(emailId, i, ct)).ToResponse(http)).RequirePermission(write);
        emails.MapPut("/{emailId:guid}/name", async (Guid emailId, RenameInput i, EmailHandler h, HttpContext http, CancellationToken ct) => (await h.RenameAsync(emailId, i, ct)).ToResponse(http)).RequirePermission(write);
        emails.MapPut("/{emailId:guid}/sent", async (Guid emailId, bool sent, EmailHandler h, HttpContext http, CancellationToken ct) => (await h.SetSentAsync(emailId, sent, ct)).ToResponse(http)).RequirePermission(write);
        emails.MapDelete("/{emailId:guid}", async (Guid emailId, EmailHandler h, HttpContext http, CancellationToken ct) => (await h.DeleteAsync(emailId, ct)).ToNoContent(http)).RequirePermission(write);

        // IA automática: la clave entra una vez, se guarda cifrada y nunca se devuelve. Solo quien edita el perfil la gestiona.
        var ai = api.MapGroup("/ai");
        ai.MapGet("/settings", async (AiSettingsHandler h, HttpContext http, CancellationToken ct) => (await h.GetAsync(ct)).ToResponse(http)).RequirePermission(write);
        ai.MapPut("/settings/{provider}", async (string provider, Ai.AiCredentialInput i, AiSettingsHandler h, HttpContext http, CancellationToken ct) => (await h.SaveAsync(provider, i, ct)).ToResponse(http)).RequirePermission(write);
        ai.MapDelete("/settings/{provider}", async (string provider, AiSettingsHandler h, HttpContext http, CancellationToken ct) => (await h.DeleteAsync(provider, ct)).ToResponse(http)).RequirePermission(write);
        ai.MapPost("/settings/{provider}/models", async (string provider, Ai.AiModelsInput i, AiSettingsHandler h, HttpContext http, CancellationToken ct) => (await h.ModelsAsync(provider, i, ct)).ToResponse(http)).RequirePermission(write);

        // Publicación
        var publication = api.MapGroup("/publication");
        publication.MapGet("/", async (PublicationHandler h, HttpContext http, CancellationToken ct) => (await h.GetStatusAsync(ct)).ToResponse(http)).RequirePermission(read);
        publication.MapGet("/preview", async (PublicationHandler h, HttpContext http, CancellationToken ct) => (await h.PreviewAsync(ct)).ToResponse(http)).RequirePermission(read);
        publication.MapGet("/preview/cv", async (PublicationHandler h, HttpContext http, CancellationToken ct) => (await h.PreviewCvAsync(ct)).ToResponse(http)).RequirePermission(read);
        publication.MapPost("/publish", async (PublicationHandler h, HttpContext http, CancellationToken ct) => (await h.PublishAsync(ct)).ToResponse(http)).RequirePermission(write);
        publication.MapPost("/unpublish", async (PublicationHandler h, HttpContext http, CancellationToken ct) => (await h.UnpublishAsync(ct)).ToResponse(http)).RequirePermission(write);
        publication.MapPost("/link", async (PublicationHandler h, HttpContext http, CancellationToken ct) => (await h.RegenerateLinkAsync(ct)).ToResponse(http)).RequirePermission(write);

        // Público (sin sesión): el token va en una cabecera para que no quede en registros ni en el historial.
        var open = api.MapGroup("/public");
        open.MapGet("/profile", async (PublicProfileHandler h, HttpContext http, CancellationToken ct) =>
            (await h.GetProfileAsync(Token(http), ct)).ToResponse(http)).AllowAnonymousExplicit().RequireRateLimiting(PublicRateLimit);
        open.MapGet("/cv", async (PublicProfileHandler h, HttpContext http, CancellationToken ct) =>
            (await h.GetCvAsync(Token(http), ct)).ToResponse(http)).AllowAnonymousExplicit().RequireRateLimiting(PublicRateLimit);
        open.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
            context.HttpContext.Response.Headers["Referrer-Policy"] = "no-referrer";
            return await next(context);
        });
    }

    private static string? Token(HttpContext http) => http.Request.Headers[TokenHeader].FirstOrDefault();
}
