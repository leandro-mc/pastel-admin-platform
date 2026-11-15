using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class PublicProfilePrivacyTests
{
    // Criterio 5: correo y teléfono ocultos por defecto; nunca en el JSON público si están ocultos. Además, lo privado no sale.
    [Fact]
    public void PublicDocumentHidesContactAndPrivateContentByDefault()
    {
        var now = DateTimeOffset.UtcNow;
        var profileId = Guid.CreateVersion7();
        var profile = new Profile
        {
            Id = profileId,
            DisplayName = "Marta Solís",
            Headline = "QA Engineer",
            Location = "Heredia, Costa Rica",
            ContactEmail = "marta.privada@correo.test",
            ContactPhone = "+506 8888-0000",
            CreatedAt = now,
            UpdatedAt = now,
        };
        var visible = new Experience { Id = Guid.CreateVersion7(), ProfileId = profileId, Role = "QA", Company = "Empresa Visible", StartDate = new(2022, 3, 1), IsVisible = true };
        var hidden = new Experience { Id = Guid.CreateVersion7(), ProfileId = profileId, Role = "QA", Company = "Empresa Oculta", StartDate = new(2020, 1, 1), IsVisible = false };
        Achievement Make(Guid parent, string text, string visibility) => new()
        {
            Id = Guid.CreateVersion7(),
            ExperienceId = parent,
            ShortText = text,
            LongText = text,
            RawText = "RELATO-PRIVADO",
            ImpactType = "other",
            Source = "manual",
            Visibility = visibility,
            Strength = 3,
        };
        var records = new BankRecords(
            [],
            [visible, hidden],
            [],
            [Make(visible.Id, "Logro publico", "both"), Make(visible.Id, "Logro solo CV", "cv"), Make(visible.Id, "Logro nunca", "never"), Make(hidden.Id, "Logro de empresa oculta", "both")],
            [],
            [],
            [],
            [],
            []);

        var json = HuellaJson.Serialize(PublicProfileBuilder.Build(profile, records, 2026, hasCv: false));

        Assert.DoesNotContain("marta.privada@correo.test", json, StringComparison.Ordinal);
        Assert.DoesNotContain("8888-0000", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Heredia", json, StringComparison.Ordinal);
        Assert.DoesNotContain("RELATO-PRIVADO", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Logro solo CV", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Logro nunca", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Empresa Oculta", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Logro de empresa oculta", json, StringComparison.Ordinal);
        Assert.Contains("Logro publico", json, StringComparison.Ordinal);

        profile.ShowContactEmail = true;
        var enabled = HuellaJson.Serialize(PublicProfileBuilder.Build(profile, records, 2026, hasCv: false));
        Assert.Contains("marta.privada@correo.test", enabled, StringComparison.Ordinal);
        Assert.DoesNotContain("8888-0000", enabled, StringComparison.Ordinal);
    }
}
