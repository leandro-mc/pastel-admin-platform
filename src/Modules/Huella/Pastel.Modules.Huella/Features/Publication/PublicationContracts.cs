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
    string? BlockedReason);

internal sealed record PublicationPreview(PublicProfileDocument Profile, string Seed, bool HasCv);

/// <summary>Resultado de publicar o regenerar el enlace. <c>Token</c> solo viaja cuando se acaba de crear: no se puede volver a leer.</summary>
internal sealed record PublicationResult(PublicationStatus Status, string? Token);
