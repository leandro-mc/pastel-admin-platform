using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.MyProfile;

/// <summary>Datos del perfil del propietario y sus enlaces. Todo se resuelve desde la sesión: no hay identificador en la ruta.</summary>
internal sealed class ProfileHandler(HuellaDbContext db, OwnerProfiles owners, IClock clock)
{
    public const int MaxLinks = 8;

    private static readonly string[] LinkKinds = ["github", "linkedin", "website", "other"];

    public async Task<Result<ProfileView>> GetAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return profile.IsFailure ? profile.Error : await ViewAsync(profile.Value, cancellationToken);
    }

    public async Task<Result<ProfileView>> SaveAsync(ProfileInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var errors = new FieldErrors();
        var displayName = errors.RequiredLine("displayName", input.DisplayName, HuellaLimits.Profile.DisplayName);
        var headline = errors.RequiredLine("headline", input.Headline, HuellaLimits.Profile.Headline);
        var summary = errors.Text("summary", input.Summary, HuellaLimits.Profile.Summary);
        var location = errors.OptionalLine("location", input.Location, HuellaLimits.Profile.Location);
        var availability = errors.OptionalLine("availability", input.Availability, HuellaLimits.Profile.Availability);
        var email = errors.OptionalLine("contactEmail", input.ContactEmail, HuellaLimits.Profile.ContactEmail);
        if (email is not null && !ContactRules.IsEmail(email))
        {
            errors.Add("contactEmail", "Escriba un correo válido.");
        }

        var phone = errors.OptionalLine("contactPhone", input.ContactPhone, HuellaLimits.Profile.ContactPhone);
        if (phone is not null && !ContactRules.IsPhone(phone))
        {
            errors.Add("contactPhone", "Escriba un teléfono válido (dígitos, espacios, +, guiones o paréntesis).");
        }

        var links = input.Links ?? [];
        if (links.Count > MaxLinks)
        {
            errors.Add("links", $"Puede guardar como máximo {MaxLinks} enlaces.");
        }

        var cleaned = new List<(ProfileLinkInput Input, string Kind, string? Icon, string Label, string Url)>();
        for (var i = 0; i < Math.Min(links.Count, MaxLinks); i++)
        {
            var link = links[i];
            var prefix = $"links[{i}].";
            var kind = errors.OneOf(prefix + "kind", link.Kind, LinkKinds, "other");
            var icon = string.IsNullOrWhiteSpace(link.Icon) ? null : errors.OneOf(prefix + "icon", link.Icon, LinkIcons.Keys, "link");
            var label = errors.RequiredLine(prefix + "label", link.Label, HuellaLimits.ProfileLink.Label);
            var url = errors.OptionalLink(prefix + "url", link.Url);
            if (url is null && string.IsNullOrWhiteSpace(link.Url))
            {
                errors.Add(prefix + "url", "Escriba una dirección https válida.");
            }

            cleaned.Add((link, kind, icon, label, url ?? string.Empty));
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var existing = await db.ProfileLinks.Where(l => l.ProfileId == profile.Value.Id).ToListAsync(cancellationToken);
        var byId = existing.ToDictionary(l => l.Id);
        var requested = cleaned.Where(c => c.Input.Id is not null).Select(c => c.Input.Id!.Value).ToList();
        if (requested.Count != requested.Distinct().Count() || requested.Any(id => !byId.ContainsKey(id)))
        {
            return HuellaErrors.NotFound;
        }

        var now = clock.UtcNow;
        var p = profile.Value;
        p.DisplayName = displayName;
        p.Headline = headline;
        p.Summary = summary;
        p.Location = location;
        p.Availability = availability;
        p.ContactEmail = email;
        p.ContactPhone = phone;
        p.ShowContactEmail = (input.ShowContactEmail ?? false) && email is not null;
        p.ShowContactPhone = (input.ShowContactPhone ?? false) && phone is not null;
        p.ShowLocation = (input.ShowLocation ?? false) && location is not null;
        p.ShowAvailability = (input.ShowAvailability ?? false) && availability is not null;
        p.UpdatedAt = now;

        for (var i = 0; i < cleaned.Count; i++)
        {
            var (item, kind, icon, label, url) = cleaned[i];
            var entity = item.Id is { } id ? byId[id] : new ProfileLink { Id = Guid.CreateVersion7(), ProfileId = p.Id };
            if (item.Id is null)
            {
                db.ProfileLinks.Add(entity);
            }

            entity.Kind = kind;
            entity.Icon = icon;
            entity.Label = label;
            entity.Url = url;
            entity.IsPublic = item.IsPublic ?? true;
            entity.SortOrder = i;
        }

        var keep = requested.ToHashSet();
        db.ProfileLinks.RemoveRange(existing.Where(l => !keep.Contains(l.Id)));
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(p, cancellationToken);
    }

    private async Task<ProfileView> ViewAsync(Profile p, CancellationToken cancellationToken)
    {
        var links = await db.ProfileLinks.Where(l => l.ProfileId == p.Id).OrderBy(l => l.SortOrder).ToListAsync(cancellationToken);
        return new ProfileView(
            p.DisplayName, p.Headline, p.Summary, p.Location, p.Availability, p.ContactEmail, p.ContactPhone,
            p.ShowContactEmail, p.ShowContactPhone, p.ShowLocation, p.ShowAvailability,
            links.Select(l => new ProfileLinkView(l.Id, l.Kind, l.Label, l.Url, l.IsPublic, l.Icon)).ToList(),
            p.IsPublished, p.UpdatedAt);
    }
}
