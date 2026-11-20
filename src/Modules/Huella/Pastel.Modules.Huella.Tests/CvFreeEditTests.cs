using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvFreeEditTests
{
    private static CvDocument Current(string format = CvFormats.Standard) => new() { Language = "es", Format = format };

    private static CvDocumentInput Input(
        string? name = "Ana Pérez",
        IReadOnlyList<CvEntryInput>? experience = null,
        IReadOnlyList<CvSkillGroupInput>? skills = null,
        IReadOnlyList<CvCompetencyGroupInput>? competencies = null) =>
        new(new CvHeaderInput(name, "Ingeniera", ["Heredia", "ana@example.com"], ["github.com/ana"]), "Resumen.", skills, competencies, experience, null, null, null, null);

    private static CvEntryInput Entry(params string[] bullets) =>
        new("Desarrolladora", "Empresa", null, null, "2024 - Presente", bullets.Select(b => new CvBulletInput(b, null)).ToList());

    // Decisión del propietario: en la edición libre no hay tope de caracteres ni de viñetas (a diferencia de la redacción
    // con IA, donde una viñeta admite dos líneas y cada entrada pocas viñetas).
    [Fact]
    public void FreeEditHasNoStyleLimitsOnBulletsOrTheirLength()
    {
        var longBullet = string.Join(' ', Enumerable.Repeat("Reduje el tiempo de gestión con un módulo nuevo.", 20));
        var bullets = Enumerable.Range(1, 12).Select(i => $"Viñeta {i}: {longBullet}").ToArray();

        var result = CvFreeEdit.Build(Input(experience: [Entry(bullets)]), Current());

        Assert.True(result.IsSuccess);
        Assert.Equal(12, result.Value.Experience[0].Bullets.Count);
        Assert.All(result.Value.Experience[0].Bullets, b => Assert.True(b.Text.Length > 600));
    }

    // Quitar una sección o una viñeta es poder dejarla vacía; las filas sin nada escrito no llegan al CV.
    [Fact]
    public void EmptyRowsAreDroppedAndSectionsCanBeRemoved()
    {
        var experience = new List<CvEntryInput> { Entry("Una", "   ", ""), new(null, null, null, null, null, []) };
        var skills = new List<CvSkillGroupInput> { new("Lenguajes", ["Java", " ", "Kotlin"]), new("", []) };

        var result = CvFreeEdit.Build(Input(experience: experience, skills: skills), Current());

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value.Experience);
        Assert.Single(result.Value.Experience[0].Bullets);
        Assert.Equal(["Java", "Kotlin"], result.Value.Skills.Single().Items);
        Assert.Empty(result.Value.Projects);
        Assert.Empty(result.Value.Education);
    }

    // Seguridad: aunque no haya tope de estilo, el texto sigue siendo texto plano.
    [Fact]
    public void TextIsStillSanitizedAndTheNameIsRequired()
    {
        var result = CvFreeEdit.Build(Input(experience: [Entry("Hice <script>alert(1)</script> algo <img onerror=x>")]), Current());

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain("<", result.Value.Experience[0].Bullets[0].Text);

        var noName = CvFreeEdit.Build(Input(name: "  "), Current());
        Assert.True(noName.IsFailure);
        Assert.Contains("header.name", noName.Error.Details!.Keys);
    }

    // El tipo de CV no se cambia desde aquí, y el tope técnico evita documentos absurdos.
    [Fact]
    public void TheFormatIsKeptAndAbsurdSizesAreRejected()
    {
        var kept = CvFreeEdit.Build(Input(), Current(CvFormats.Competencies));
        Assert.Equal(CvFormats.Competencies, kept.Value.Format);
        Assert.Equal("es", kept.Value.Language);

        var badKind = CvFreeEdit.Build(Input(competencies: [new("otra", "X", [new(null, "Adaptabilidad", null)])]), Current(CvFormats.Competencies));
        Assert.True(badKind.IsFailure);

        var tooMany = CvFreeEdit.Build(Input(experience: [Entry(Enumerable.Repeat("x", CvFreeEdit.MaxBullets + 1).ToArray())]), Current());
        Assert.True(tooMany.IsFailure);

        var tooLong = CvFreeEdit.Build(Input(experience: [Entry(new string('a', CvFreeEdit.MaxLine + 1))]), Current());
        Assert.True(tooLong.IsFailure);
    }

    // Una competencia escrita a mano recibe su propio id (no es del catálogo) y una existente conserva el suyo.
    [Fact]
    public void ACustomCompetencyGetsItsOwnIdAndAnExistingOneKeepsIt()
    {
        var existing = Guid.NewGuid();
        var group = new CvCompetencyGroupInput("personal", "Personales", [new(existing, "Adaptabilidad", "nota"), new(null, "Iniciativa", null)]);

        var result = CvFreeEdit.Build(Input(competencies: [group]), Current(CvFormats.Competencies));

        var items = result.Value.Competencies.Single().Items;
        Assert.Equal(existing, items[0].Id);
        Assert.NotEqual(Guid.Empty, items[1].Id);
    }
}
