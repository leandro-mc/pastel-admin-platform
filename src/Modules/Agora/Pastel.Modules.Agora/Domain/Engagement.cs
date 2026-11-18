namespace Pastel.Modules.Agora.Domain;

internal sealed class Verification
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ArticleId { get; set; }
    public Guid ReviewerUserId { get; set; }
    public required string ReviewerName { get; set; }
    public DateTimeOffset VerifiedAt { get; set; }

    /// <summary>Alcance revisado, por escrito: lo que el sello avala y lo que no.</summary>
    public required string Scope { get; set; }

    public string? Note { get; set; }
    public VerificationStatus Status { get; set; } = VerificationStatus.Active;

    /// <summary>Versión sustantiva de la pieza que esta persona revisó.</summary>
    public int SubstantiveVersion { get; set; }

    public DateTimeOffset? WithdrawnAt { get; set; }
    public Guid? WithdrawnByUserId { get; set; }
    public string? WithdrawalNote { get; set; }
}

internal sealed class NewsLink
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Headline { get; set; }
    public required string Outlet { get; set; }
    public DateOnly PublishedOn { get; set; }
    public required string Url { get; set; }

    /// <summary>Contexto propio de Ágora. Nunca se copia el texto ajeno.</summary>
    public required string ContextNote { get; set; }

    public string? Topic { get; set; }
    public bool IsFeatured { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
}

internal sealed class SavedArticle
{
    public Guid UserId { get; set; }
    public Guid ArticleId { get; set; }
    public DateTimeOffset SavedAt { get; set; }
}

internal sealed class FollowedCategory
{
    public Guid UserId { get; set; }
    public Guid CategoryId { get; set; }
    public DateTimeOffset FollowedAt { get; set; }
}

internal sealed class Reaction
{
    public Guid ArticleId { get; set; }
    public Guid UserId { get; set; }
    public ReactionKind Kind { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

internal sealed class ErrorReport
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ArticleId { get; set; }
    public Guid ReporterUserId { get; set; }
    public required string Text { get; set; }
    public ErrorReportStatus Status { get; set; } = ErrorReportStatus.Received;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public Guid? ResolvedByUserId { get; set; }
    public string? ResolutionNote { get; set; }
}
