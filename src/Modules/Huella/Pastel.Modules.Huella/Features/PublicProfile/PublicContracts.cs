using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Features.PublicProfile;

internal sealed record PublicProfileView(PublicProfileDocument Profile, string Seed, int Version, DateTimeOffset PublishedAt);
