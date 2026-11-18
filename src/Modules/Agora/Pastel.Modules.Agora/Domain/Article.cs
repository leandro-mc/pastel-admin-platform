namespace Pastel.Modules.Agora.Domain;

/// <summary>
/// Pieza de Ágora. <see cref="SubstantiveVersion"/> sube cuando cambia el contenido sustantivo (titular, resumen, bloques,
/// cuerpo, tipo o fuentes): es la versión que una verificación avala (ficha §3).
/// </summary>
internal sealed class Article
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Slug { get; set; }
    public required string Title { get; set; }

    /// <summary>«En 20 segundos» (hasta 280 caracteres).</summary>
    public required string Summary { get; set; }

    public ContentType ContentType { get; set; }
    public string? KnownText { get; set; }
    public string? UnknownText { get; set; }
    public string? WhyItMatters { get; set; }

    /// <summary>Markdown ya sanitizado (<see cref="MarkdownSanitizer"/>).</summary>
    public string Body { get; set; } = string.Empty;

    public Guid CategoryId { get; set; }
    public Guid? SeriesId { get; set; }
    public int? SeriesOrder { get; set; }
    public string? PeriodLabel { get; set; }
    public ArticleStatus Status { get; set; } = ArticleStatus.Draft;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }

    /// <summary>Quien creó la pieza. Sin clave foránea: Identity vive en otro esquema.</summary>
    public Guid AuthorUserId { get; set; }

    /// <summary>Nombre visible del autor al crear la pieza (copia; evita consultar otro esquema).</summary>
    public required string AuthorName { get; set; }

    public int SubstantiveVersion { get; set; } = 1;
    public int ReadingMinutes { get; set; } = 1;

    /// <summary>Posición (1 a 5) en «Hoy en 5 minutos»; <c>null</c> si no está elegida por el equipo editorial.</summary>
    public int? DailyPickOrder { get; set; }

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

internal sealed class ArticleTag
{
    public Guid ArticleId { get; set; }
    public Guid TagId { get; set; }
}

/// <summary>Quién ha escrito o editado la pieza. Quien figura aquí no puede verificarla (separación de funciones).</summary>
internal sealed class ArticleContributor
{
    public Guid ArticleId { get; set; }
    public Guid UserId { get; set; }
}

internal sealed class Source
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ArticleId { get; set; }
    public int Position { get; set; }
    public required string Title { get; set; }
    public string? Author { get; set; }
    public DateOnly? PublishedOn { get; set; }
    public required string Url { get; set; }
    public SourceKind Kind { get; set; }
    public string? ContextNote { get; set; }
}

internal sealed class VideoEmbed
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ArticleId { get; set; }

    /// <summary>Identificador de YouTube validado (11 caracteres). Nunca una URL.</summary>
    public required string YouTubeId { get; set; }

    public required string Title { get; set; }
    public string? Note { get; set; }
}

internal sealed class Correction
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ArticleId { get; set; }
    public DateTimeOffset CorrectedAt { get; set; }
    public required string Text { get; set; }
    public Guid CreatedByUserId { get; set; }
}
