using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Features.Publication;

internal sealed record PublicationStatus(
    bool IsPublished,
    int? PublishedVersion,
    DateTimeOffset? PublishedAt,
    bool HasLink,
    DateTimeOffset? LinkCreatedAt,
    bool HasUnpublishedChanges,
    bool CanPublish,
    string? BlockedReason,
    string? Token);

internal sealed record PublicationPreview(PublicProfileDocument Profile, string Seed, bool HasCv);

/// <summary>Resultado de publicar o regenerar el enlace. <c>Token</c> viaja al crearlo; también se puede leer después en <see cref="PublicationStatus.Token"/>.</summary>
internal sealed record PublicationResult(PublicationStatus Status, string? Token);
