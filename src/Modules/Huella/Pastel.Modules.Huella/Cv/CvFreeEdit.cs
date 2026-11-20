using Pastel.Modules.Huella.Domain;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Cv;

// ── Edición libre del CV: el documento completo, tal como lo deja la persona ──

internal sealed record CvDocumentInput(
    CvHeaderInput? Header,
    string? Summary,
    IReadOnlyList<CvSkillGroupInput>? Skills,
    IReadOnlyList<CvCompetencyGroupInput>? Competencies,
    IReadOnlyList<CvEntryInput>? Experience,
    IReadOnlyList<CvEntryInput>? Projects,
    IReadOnlyList<CvEducationInput>? Education,
    IReadOnlyList<string>? Extras,
    string? ExtrasLabel);

internal sealed record CvHeaderInput(string? Name, string? Headline, IReadOnlyList<string>? ContactLine1, IReadOnlyList<string>? ContactLine2);

internal sealed record CvSkillGroupInput(string? Label, IReadOnlyList<string>? Items);

internal sealed record CvCompetencyGroupInput(string? Kind, string? Label, IReadOnlyList<CvCompetencyInput>? Items);

internal sealed record CvCompetencyInput(Guid? Id, string? Name, string? Note);

internal sealed record CvEntryInput(string? Title, string? Subtitle, string? Location, string? Context, string? Dates, IReadOnlyList<CvBulletInput>? Bullets);

internal sealed record CvBulletInput(string? Text, IReadOnlyList<Guid>? SourceIds);

internal sealed record CvEducationInput(string? Degree, string? Institution, string? Dates, string? Detail);

/// <summary>
/// Construye el documento del CV a partir de lo que la persona editó a mano. A diferencia de la redacción con IA y de
/// «editar una línea», aquí <b>no hay tope de caracteres, de viñetas ni de páginas</b> ni el guardián de cifras: lo decide
/// la persona, y el PDF mantiene su estilo normal (las páginas que haga falta). Lo único que se conserva es lo de seguridad:
/// texto plano (sin etiquetas HTML ni caracteres de control) y un tope técnico, muy por encima de cualquier uso real, que
/// evita documentos absurdos. Las filas vacías se descartan; solo el nombre del encabezado es obligatorio.
/// </summary>
internal static class CvFreeEdit
{
    // Topes técnicos de seguridad (no de estilo): un CV real queda muy por debajo de todos.
    public const int MaxLine = 2000;
    public const int MaxEntries = 60;
    public const int MaxBullets = 60;
    public const int MaxSkillGroups = 40;
    public const int MaxItems = 150;
    public const int MaxContact = 12;
    public const int MaxEducation = 30;
    public const int MaxExtras = 80;
    public const int MaxSourceIds = 20;

    public static Result<CvDocument> Build(CvDocumentInput input, CvDocument current)
    {
        var errors = new FieldErrors();
        var header = input.Header;
        var document = new CvDocument
        {
            // Lo que define qué tipo de CV es no se edita aquí.
            Language = current.Language,
            Format = current.Format,
            Header = new CvHeader
            {
                Name = errors.RequiredLine("header.name", header?.Name, MaxLine),
                Headline = errors.OptionalLine("header.headline", header?.Headline, MaxLine) ?? string.Empty,
                ContactLine1 = Lines(errors, "header.contactLine1", header?.ContactLine1, MaxContact),
                ContactLine2 = Lines(errors, "header.contactLine2", header?.ContactLine2, MaxContact),
            },
            Summary = errors.OptionalLine("summary", input.Summary, MaxLine * 3) ?? string.Empty,
            ExtrasLabel = errors.OptionalLine("extrasLabel", input.ExtrasLabel, MaxLine),
            Extras = Lines(errors, "extras", input.Extras, MaxExtras),
            Experience = Entries(errors, "experience", input.Experience),
            Projects = Entries(errors, "projects", input.Projects),
        };

        var skills = input.Skills ?? [];
        CheckCount(errors, "skills", skills.Count, MaxSkillGroups);
        for (var i = 0; i < Math.Min(skills.Count, MaxSkillGroups); i++)
        {
            var items = Lines(errors, $"skills[{i}].items", skills[i].Items, MaxItems);
            var label = errors.OptionalLine($"skills[{i}].label", skills[i].Label, MaxLine) ?? string.Empty;
            if (items.Count > 0 || label.Length > 0)
            {
                document.Skills.Add(new CvSkillGroup { Label = label, Items = items });
            }
        }

        var groups = input.Competencies ?? [];
        CheckCount(errors, "competencies", groups.Count, MaxSkillGroups);
        for (var i = 0; i < Math.Min(groups.Count, MaxSkillGroups); i++)
        {
            var kind = (groups[i].Kind ?? string.Empty).Trim();
            if (!CompetencyKinds.All.Contains(kind))
            {
                errors.Add($"competencies[{i}].kind", "Tipo de competencia no válido.");
                continue;
            }

            var group = new CvCompetencyGroup { Kind = kind, Label = errors.OptionalLine($"competencies[{i}].label", groups[i].Label, MaxLine) ?? string.Empty };
            var items = groups[i].Items ?? [];
            CheckCount(errors, $"competencies[{i}].items", items.Count, MaxItems);
            for (var j = 0; j < Math.Min(items.Count, MaxItems); j++)
            {
                var name = errors.OptionalLine($"competencies[{i}].items[{j}].name", items[j].Name, MaxLine);
                if (name is null)
                {
                    continue;
                }

                // Una competencia nueva (escrita a mano) no es del catálogo: lleva un id propio.
                group.Items.Add(new CvCompetency
                {
                    Id = items[j].Id is { } id && id != Guid.Empty ? id : Guid.CreateVersion7(),
                    Name = name,
                    Note = errors.OptionalLine($"competencies[{i}].items[{j}].note", items[j].Note, MaxLine),
                });
            }

            if (group.Items.Count > 0)
            {
                document.Competencies.Add(group);
            }
        }

        var education = input.Education ?? [];
        CheckCount(errors, "education", education.Count, MaxEducation);
        for (var i = 0; i < Math.Min(education.Count, MaxEducation); i++)
        {
            var e = education[i];
            var degree = errors.OptionalLine($"education[{i}].degree", e.Degree, MaxLine) ?? string.Empty;
            var institution = errors.OptionalLine($"education[{i}].institution", e.Institution, MaxLine) ?? string.Empty;
            var dates = errors.OptionalLine($"education[{i}].dates", e.Dates, MaxLine) ?? string.Empty;
            var detail = errors.OptionalLine($"education[{i}].detail", e.Detail, MaxLine);
            if (degree.Length > 0 || institution.Length > 0 || dates.Length > 0 || detail is not null)
            {
                document.Education.Add(new CvEducation { Degree = degree, Institution = institution, Dates = dates, Detail = detail });
            }
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        return document;
    }

    private static List<CvEntry> Entries(FieldErrors errors, string section, IReadOnlyList<CvEntryInput>? input)
    {
        var list = input ?? [];
        CheckCount(errors, section, list.Count, MaxEntries);
        var entries = new List<CvEntry>();
        for (var i = 0; i < Math.Min(list.Count, MaxEntries); i++)
        {
            var e = list[i];
            var prefix = $"{section}[{i}]";
            var bullets = new List<CvBullet>();
            var raw = e.Bullets ?? [];
            CheckCount(errors, prefix + ".bullets", raw.Count, MaxBullets);
            for (var j = 0; j < Math.Min(raw.Count, MaxBullets); j++)
            {
                var text = errors.OptionalLine($"{prefix}.bullets[{j}].text", raw[j].Text, MaxLine);
                if (text is not null)
                {
                    bullets.Add(new CvBullet { Text = text, SourceIds = (raw[j].SourceIds ?? []).Where(id => id != Guid.Empty).Distinct().Take(MaxSourceIds).ToList() });
                }
            }

            var entry = new CvEntry
            {
                Title = errors.OptionalLine(prefix + ".title", e.Title, MaxLine) ?? string.Empty,
                Subtitle = errors.OptionalLine(prefix + ".subtitle", e.Subtitle, MaxLine) ?? string.Empty,
                Location = errors.OptionalLine(prefix + ".location", e.Location, MaxLine),
                Context = errors.OptionalLine(prefix + ".context", e.Context, MaxLine),
                Dates = errors.OptionalLine(prefix + ".dates", e.Dates, MaxLine) ?? string.Empty,
                Bullets = bullets,
            };

            // Una entrada sin nada escrito no tiene sentido en el CV.
            if (entry.Title.Length > 0 || entry.Subtitle.Length > 0 || entry.Context is not null || entry.Dates.Length > 0 || bullets.Count > 0)
            {
                entries.Add(entry);
            }
        }

        return entries;
    }

    /// <summary>Lista de líneas sin las vacías, con el tope técnico de cantidad.</summary>
    private static List<string> Lines(FieldErrors errors, string field, IReadOnlyList<string>? input, int max)
    {
        var list = input ?? [];
        CheckCount(errors, field, list.Count, max);
        var lines = new List<string>();
        for (var i = 0; i < Math.Min(list.Count, max); i++)
        {
            if (errors.OptionalLine($"{field}[{i}]", list[i], MaxLine) is { } line)
            {
                lines.Add(line);
            }
        }

        return lines;
    }

    private static void CheckCount(FieldErrors errors, string field, int count, int max)
    {
        if (count > max)
        {
            errors.Add(field, $"Son demasiados elementos: el máximo es {max}.");
        }
    }
}
