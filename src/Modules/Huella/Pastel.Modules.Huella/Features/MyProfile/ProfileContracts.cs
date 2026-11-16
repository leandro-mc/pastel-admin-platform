namespace Pastel.Modules.Huella.Features.MyProfile;

internal sealed record ProfileLinkView(Guid Id, string Kind, string Label, string Url, bool IsPublic, string? Icon);

internal sealed record ProfileView(
    string DisplayName,
    string Headline,
    string Summary,
    string? Location,
    string? Availability,
    string? ContactEmail,
    string? ContactPhone,
    bool ShowContactEmail,
    bool ShowContactPhone,
    bool ShowLocation,
    bool ShowAvailability,
    IReadOnlyList<ProfileLinkView> Links,
    bool IsPublished,
    DateTimeOffset UpdatedAt);

internal sealed record ProfileLinkInput(Guid? Id, string? Kind, string? Label, string? Url, bool? IsPublic, string? Icon = null);

internal sealed record ProfileInput(
    string? DisplayName,
    string? Headline,
    string? Summary,
    string? Location,
    string? Availability,
    string? ContactEmail,
    string? ContactPhone,
    bool? ShowContactEmail,
    bool? ShowContactPhone,
    bool? ShowLocation,
    bool? ShowAvailability,
    IReadOnlyList<ProfileLinkInput>? Links);
