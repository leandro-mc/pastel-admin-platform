using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Editorial;

internal sealed record SourceInput(string? Title, string? Author, DateOnly? PublishedOn, string? Url, string? Kind, string? ContextNote);

/// <summary><c>Url</c> acepta el identificador de YouTube o una dirección de YouTube; solo se guarda el identificador.</summary>
internal sealed record VideoInput(string? Url, string? Title, string? Note);

/// <summary>Cuerpo de <c>POST</c> y <c>PUT /api/agora/editorial/articles</c>. <c>Version</c> es obligatoria al actualizar (concurrencia).</summary>
internal sealed record ArticleInput(
    string? Title,
    string? Summary,
    string? ContentType,
    string? KnownText,
    string? UnknownText,
    string? WhyItMatters,
    string? Body,
    Guid? CategoryId,
    Guid? SeriesId,
    int? SeriesOrder,
    string? PeriodLabel,
    string[]? Tags,
    SourceInput[]? Sources,
    VideoInput? Video,
    long? Version);

internal sealed record TagValue(string Slug, string Name);

internal sealed record VideoValue(string YouTubeId, string Title, string? Note);

/// <summary>Pieza ya validada y normalizada (texto recortado, Markdown sanitizado, identificadores comprobados).</summary>
internal sealed record ValidArticle(
    string Title,
    string Summary,
    ContentType ContentType,
    string? KnownText,
    string? UnknownText,
    string? WhyItMatters,
    string Body,
    Guid CategoryId,
    Guid? SeriesId,
    int? SeriesOrder,
    string? PeriodLabel,
    IReadOnlyList<TagValue> Tags,
    IReadOnlyList<SourceContent> Sources,
    VideoValue? Video)
{
    public SubstantiveContent Substantive() =>
        new(Title, Summary, ContentType, KnownText, UnknownText, WhyItMatters, Body, Sources);
}

/// <summary>Validación de una pieza (AG-EDI-01). Devuelve todos los errores a la vez, por campo, en español de Costa Rica.</summary>
internal static class ArticleInputValidator
{
    public const int MaxTags = 8;
    public const int MaxSources = 20;

    public static async Task<Result<ValidArticle>> ValidateAsync(AgoraDbContext db, ArticleInput input, CancellationToken cancellationToken)
    {
        var errors = new FieldErrors();

        var title = Clean(input.Title);
        if (title.Length is < 5 or > 90)
        {
            errors.Add("title", "El titular debe tener entre 5 y 90 caracteres.");
        }

        var summary = Clean(input.Summary);
        if (summary.Length is 0 or > 280)
        {
            errors.Add("summary", "El resumen «En 20 segundos» es obligatorio y admite hasta 280 caracteres.");
        }

        if (!Wire.TryParse<ContentType>(input.ContentType, out var contentType))
        {
            errors.Add("contentType", "Indique si la pieza es de hechos, análisis u opinión.");
        }

        var known = Optional(input.KnownText, "knownText", 600, "«Lo que se sabe»", errors);
        var unknown = Optional(input.UnknownText, "unknownText", 400, "«Lo que no se sabe»", errors);
        var why = Optional(input.WhyItMatters, "whyItMatters", 400, "«Por qué importa»", errors);
        var period = Optional(input.PeriodLabel, "periodLabel", 80, "El periodo", errors);

        var rawBody = input.Body ?? string.Empty;
        if (rawBody.Length > MarkdownSanitizer.MaxLength)
        {
            errors.Add("body", $"El cuerpo admite hasta {MarkdownSanitizer.MaxLength:N0} caracteres.");
        }

        var body = rawBody.Length > MarkdownSanitizer.MaxLength ? string.Empty : MarkdownSanitizer.Sanitize(rawBody);

        if (input.CategoryId is not { } categoryId || !await db.Categories.AnyAsync(c => c.Id == categoryId, cancellationToken))
        {
            errors.Add("categoryId", "Elija una categoría existente.");
        }

        Guid? seriesId = null;
        if (input.SeriesId is { } requestedSeries)
        {
            if (await db.Series.AnyAsync(s => s.Id == requestedSeries, cancellationToken))
            {
                seriesId = requestedSeries;
            }
            else
            {
                errors.Add("seriesId", "La serie elegida no existe.");
            }
        }

        var tags = ParseTags(input.Tags, errors);
        var sources = ParseSources(input.Sources, errors);
        var video = ParseVideo(input.Video, errors);

        if (errors.Any)
        {
            return errors.ToError("agora.article.invalid");
        }

        return new ValidArticle(
            title, summary, contentType, known, unknown, why, body, input.CategoryId!.Value, seriesId,
            seriesId is null ? null : input.SeriesOrder, period, tags, sources, video);
    }

    private static string Clean(string? value) => (value ?? string.Empty).Trim();

    private static string? Optional(string? value, string field, int max, string label, FieldErrors errors)
    {
        var text = Clean(value);
        if (text.Length > max)
        {
            errors.Add(field, $"{label} admite hasta {max} caracteres.");
        }

        return text.Length == 0 ? null : text;
    }

    private static List<TagValue> ParseTags(string[]? raw, FieldErrors errors)
    {
        var tags = new List<TagValue>();
        var names = (raw ?? []).Select(Clean).Where(name => name.Length > 0).ToList();
        if (names.Count > MaxTags)
        {
            errors.Add("tags", $"Use hasta {MaxTags} etiquetas.");
        }

        foreach (var name in names.Take(MaxTags))
        {
            if (name.Length is < 2 or > 40)
            {
                errors.Add("tags", "Cada etiqueta debe tener entre 2 y 40 caracteres.");
                continue;
            }

            var slug = Slugs.From(name, 60);
            if (tags.All(tag => tag.Slug != slug))
            {
                tags.Add(new TagValue(slug, name));
            }
        }

        return tags;
    }

    private static List<SourceContent> ParseSources(SourceInput[]? raw, FieldErrors errors)
    {
        var sources = new List<SourceContent>();
        var items = raw ?? [];
        if (items.Length > MaxSources)
        {
            errors.Add("sources", $"Use hasta {MaxSources} fuentes.");
        }

        for (var i = 0; i < Math.Min(items.Length, MaxSources); i++)
        {
            var item = items[i];
            var title = Clean(item.Title);
            var url = Clean(item.Url);
            if (title.Length is 0 or > 200)
            {
                errors.Add($"sources[{i}].title", "El título de la fuente es obligatorio (hasta 200 caracteres).");
            }

            if (url.Length > 500 || !MarkdownSanitizer.IsHttpUrl(url))
            {
                errors.Add($"sources[{i}].url", "Escriba una dirección web válida que empiece con http:// o https://.");
            }

            var kind = SourceKind.Other;
            if (!string.IsNullOrWhiteSpace(item.Kind) && !Wire.TryParse(item.Kind, out kind))
            {
                errors.Add($"sources[{i}].kind", "El tipo de fuente no existe.");
            }

            var author = Optional(item.Author, $"sources[{i}].author", 150, "El autor o entidad", errors);
            var note = Optional(item.ContextNote, $"sources[{i}].contextNote", 400, "La nota de contexto", errors);
            sources.Add(new SourceContent(title, url, kind, author, item.PublishedOn, note));
        }

        return sources;
    }

    private static VideoValue? ParseVideo(VideoInput? raw, FieldErrors errors)
    {
        if (raw is null || string.IsNullOrWhiteSpace(raw.Url))
        {
            return null;
        }

        if (!YouTubeVideoId.TryNormalize(raw.Url, out var youTubeId))
        {
            errors.Add("video.url", "Use el identificador o la dirección de un video de YouTube.");
        }

        var title = Clean(raw.Title);
        if (title.Length is 0 or > 120)
        {
            errors.Add("video.title", "El título del video es obligatorio (hasta 120 caracteres).");
        }

        var note = Optional(raw.Note, "video.note", 300, "La nota del video", errors);
        return new VideoValue(youTubeId, title, note);
    }
}
