namespace Pastel.Modules.Agora.Common;

internal sealed record SealVerifierDto(string Name, DateTimeOffset VerifiedAt);

/// <summary>Sello de una pieza: <c>state</c> es <c>pending</c>, <c>verified</c> o <c>modifiedAfterVerification</c>.</summary>
internal sealed record SealDto(string State, int ActiveReviews, int RequiredReviews, IReadOnlyList<SealVerifierDto> Verifiers);

internal sealed record ArticleCardDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    string ContentType,
    string CategorySlug,
    string CategoryName,
    string? SeriesSlug,
    string? SeriesName,
    int? SeriesOrder,
    DateTimeOffset? PublishedAt,
    string AuthorName,
    int ReadingMinutes,
    int SourceCount,
    SealDto Seal);

internal sealed record CategoryDto(string Slug, string Name, string? Description, int ArticleCount);

internal sealed record SeriesDto(string Slug, string Name, string? Description, int ArticleCount);

internal sealed record TagDto(string Slug, string Name, int ArticleCount);

internal sealed record SourceDto(string Title, string? Author, DateOnly? PublishedOn, string Url, string Kind, string? ContextNote);

internal sealed record VideoDto(string YouTubeId, string Title, string? Note);

internal sealed record CorrectionDto(Guid Id, DateTimeOffset CorrectedAt, string Text);

/// <summary>Verificación vigente, con su alcance por escrito («Cómo sabemos esto»). <c>IsCurrent</c> es falso si avaló una versión anterior.</summary>
internal sealed record VerificationDto(Guid Id, string ReviewerName, DateTimeOffset VerifiedAt, string Scope, string? Note, bool IsCurrent);

internal sealed record ArticleDetailDto(
    ArticleCardDto Card,
    string? KnownText,
    string? UnknownText,
    string? WhyItMatters,
    string Body,
    string? PeriodLabel,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<string> Tags,
    IReadOnlyList<SourceDto> Sources,
    VideoDto? Video,
    IReadOnlyList<CorrectionDto> Corrections,
    IReadOnlyList<VerificationDto> Verifications);

internal sealed record NewsDto(Guid Id, string Headline, string Outlet, DateOnly PublishedOn, string Url, string ContextNote, string? Topic, bool IsFeatured);

internal sealed record HomeDto(
    IReadOnlyList<ArticleCardDto> DailyPicks,
    int DailyPicksMinutes,
    IReadOnlyList<ArticleCardDto> Recent,
    IReadOnlyList<SeriesDto> Series,
    IReadOnlyList<CategoryDto> Categories,
    IReadOnlyList<NewsDto> News);

internal sealed record TaxonomyDto(IReadOnlyList<CategoryDto> Categories, IReadOnlyList<SeriesDto> Series, IReadOnlyList<TagDto> Tags);
