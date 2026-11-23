using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Pastel.Modules.Huella.Cv;

/// <summary>Una sección de la versión hermana que cambió y todavía no se refleja aquí: <c>Before</c> es cómo estaba antes de editarse.</summary>
internal sealed record PairChange(string Section, string Before);

/// <summary>Una sección que hay que pedirle a la IA: cómo estaba el origen antes y cómo está ahora, y cómo está hoy el destino.</summary>
internal sealed record PairAiSection(string Name, string Before, string After, string Current);

/// <summary>Qué hay que hacer para poner al día una versión: copiar datos neutrales y/o pedirle a la IA las secciones afectadas.</summary>
internal sealed record PairPlan(CvDocument Source, CvDocument Target, IReadOnlyList<PairChange> Pending, bool CopyHeader, IReadOnlyList<PairAiSection> Ai, string? Prompt);

/// <summary>El resultado de aplicar la respuesta: el documento resultante, qué se actualizó, qué se rechazó y qué sigue pendiente.</summary>
internal sealed record PairApplied(CvDocumentInput Input, IReadOnlyList<string> Applied, IReadOnlyList<string> Rejected, IReadOnlyList<PairChange> Remaining);

/// <summary>
/// Mantiene al día las dos versiones (español e inglés) que se generaron juntas. Cuando se edita una, se anotan en la otra
/// las secciones que cambiaron (<see cref="Record"/>, solo cómo estaban antes); después, la IA deja la sección del destino
/// como una traducción fiel de la sección nueva del origen, conservando tal cual el texto que no cambió. Todo lo que
/// devuelve la IA se valida: misma estructura que el origen (mismo número de cargos, viñetas, grupos y elementos) y ninguna
/// cifra que no esté ya en el origen o en el destino. Lo que no pasa se rechaza y la sección queda pendiente.
/// Puro: sin base de datos ni IA, para poder probarlo con respuestas simuladas.
/// </summary>
internal static class CvPairSync
{
    public static readonly IReadOnlyList<string> Sections = ["header", "summary", "skills", "competencies", "experience", "projects", "education", "extras"];

    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private static readonly Dictionary<string, string> Titles = new()
    {
        ["header"] = "Encabezado",
        ["headline"] = "Titular",
        ["summary"] = "Perfil profesional",
        ["skills"] = "Herramientas",
        ["competencies"] = "Competencias",
        ["experience"] = "Trayectoria",
        ["projects"] = "Proyectos",
        ["education"] = "Educación",
        ["extras"] = "Otros datos",
    };

    public static string Title(string section) => Titles.TryGetValue(section, out var title) ? title : section;

    // ───────────────────────────── Lo pendiente ─────────────────────────────
    public static List<PairChange> ReadPending(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<PairChange>>(json, Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string? WritePending(IReadOnlyList<PairChange> pending) => pending.Count == 0 ? null : JsonSerializer.Serialize(pending, Options);

    /// <summary>
    /// Anota en lo pendiente de la hermana las secciones que cambiaron entre <paramref name="before"/> y <paramref name="after"/>.
    /// Se conserva el estado más antiguo de cada sección; si una sección vuelve a como estaba al principio, deja de estar pendiente.
    /// </summary>
    public static List<PairChange> Record(IReadOnlyList<PairChange> pending, CvDocument before, CvDocument after)
    {
        var b = SectionsOf(before);
        var a = SectionsOf(after);
        var result = pending.ToList();
        foreach (var section in Sections)
        {
            var index = result.FindIndex(c => c.Section == section);
            if (index < 0)
            {
                if (b[section] != a[section])
                {
                    result.Add(new PairChange(section, b[section]));
                }
            }
            else if (result[index].Before == a[section])
            {
                result.RemoveAt(index);
            }
        }

        return result;
    }

    // ───────────────────────────── Plan y pedido ─────────────────────────────
    public static PairPlan Plan(CvDocument source, CvDocument target, IReadOnlyList<PairChange> pending, string sourceLanguage, string targetLanguage)
    {
        var now = SectionsOf(source);
        var current = SectionsOf(target);
        var ai = new List<PairAiSection>();
        var copyHeader = false;
        foreach (var change in pending)
        {
            if (change.Section == "header")
            {
                var before = ParseObject(change.Before);
                if (before is null)
                {
                    continue;
                }

                var cur = (JsonObject)HeaderNode(source);
                copyHeader |= before["name"]?.ToJsonString(Options) != cur["name"]?.ToJsonString(Options)
                    || before["contactLine1"]?.ToJsonString(Options) != cur["contactLine1"]?.ToJsonString(Options)
                    || before["contactLine2"]?.ToJsonString(Options) != cur["contactLine2"]?.ToJsonString(Options);
                var beforeHeadline = before["headline"]?.GetValue<string>() ?? string.Empty;
                if (beforeHeadline != source.Header.Headline)
                {
                    ai.Add(new PairAiSection("headline", Quote(beforeHeadline), Quote(source.Header.Headline), Quote(target.Header.Headline)));
                }
            }
            else if (now.TryGetValue(change.Section, out var after) && after != change.Before)
            {
                ai.Add(new PairAiSection(change.Section, change.Before, after, current[change.Section]));
            }
        }

        return new PairPlan(source, target, pending, copyHeader, ai, ai.Count == 0 ? null : Prompt(ai, sourceLanguage, targetLanguage));
    }

    private static string Language(string code) => code == "en" ? "inglés" : "español";

    private static string Prompt(IReadOnlyList<PairAiSection> sections, string sourceLanguage, string targetLanguage)
    {
        var source = Language(sourceLanguage);
        var target = Language(targetLanguage);
        var items = new JsonArray();
        foreach (var s in sections)
        {
            items.Add(new JsonObject
            {
                ["seccion"] = s.Name,
                [$"origen_antes_{sourceLanguage}"] = JsonNode.Parse(s.Before),
                [$"origen_despues_{sourceLanguage}"] = JsonNode.Parse(s.After),
                [$"destino_actual_{targetLanguage}"] = JsonNode.Parse(s.Current),
            });
        }

        var schemas = string.Join('\n', sections.Select(s => $"- {s.Name}: {SchemaOf(s.Name)}"));
        var shape = "{\"sections\": {\"<seccion>\": <contenido>}}";
        return $$"""
            Eres un traductor técnico de currículos. La misma persona tiene dos versiones de su CV: el ORIGEN, en {{source}}, y el DESTINO, en {{target}}. Editó el ORIGEN y debes poner al día el DESTINO para que diga lo mismo que el ORIGEN dice ahora, tocando solo lo afectado.

            Para cada sección de la lista:
            1. Parte del DESTINO actual.
            2. Aplica únicamente las diferencias entre «origen antes» y «origen después».
            3. Devuelve la sección completa en {{target}}.

            Reglas (se validan en el servidor; lo que no las cumpla se descarta):
            - Todo lo que no cambió en el origen déjalo EXACTAMENTE igual que en el destino actual: no lo reescribas ni lo mejores.
            - Sé fiel al origen: no agregues, quites ni inventes datos, logros, tecnologías ni cifras. No cambies números, fechas (solo su idioma), nombres propios, empresas, productos ni tecnologías.
            - Misma estructura que «origen después»: el mismo número de entradas, en el mismo orden, y el mismo número de viñetas, grupos o elementos que tiene el origen.
            - Meses, tipos de experiencia («Práctica profesional supervisada», «Proyecto académico»…) y títulos en {{target}}, con el mismo registro profesional del destino actual.
            - Responde SOLO con un objeto JSON, sin texto antes ni después, con la forma {{shape}} y únicamente las secciones pedidas.

            Forma del contenido de cada sección pedida:
            {{schemas}}

            Secciones:
            {{items.ToJsonString(Options)}}
            """;
    }

    private static string SchemaOf(string section) => section switch
    {
        "headline" or "summary" => "un texto",
        "skills" => "[{\"label\":\"\",\"items\":[\"\"]}]",
        "competencies" => "[{\"kind\":\"\",\"label\":\"\",\"items\":[{\"name\":\"\",\"note\":\"\"}]}]",
        "experience" or "projects" => "[{\"title\":\"\",\"subtitle\":\"\",\"location\":\"\",\"context\":\"\",\"dates\":\"\",\"bullets\":[\"\"]}]",
        "education" => "[{\"degree\":\"\",\"institution\":\"\",\"dates\":\"\",\"detail\":\"\"}]",
        "extras" => "{\"label\":\"\",\"items\":[\"\"]}",
        _ => "un texto",
    };

    // ───────────────────────────── Aplicar la respuesta ─────────────────────────────
    public static PairApplied Apply(PairPlan plan, string? raw)
    {
        var input = InputOf(plan.Target);
        var applied = new List<string>();
        var rejected = new List<string>();
        var failed = new HashSet<string>();

        if (plan.CopyHeader)
        {
            // Nombre y contacto no se traducen: se copian tal cual del origen.
            input = input with { Header = new CvHeaderInput(plan.Source.Header.Name, input.Header?.Headline, plan.Source.Header.ContactLine1, plan.Source.Header.ContactLine2) };
            applied.Add(Title("header"));
        }

        if (plan.Ai.Count > 0)
        {
            using var json = CvAiResult.TryParse(raw);
            if (json is null || !json.RootElement.TryGetProperty("sections", out var sections) || sections.ValueKind != JsonValueKind.Object)
            {
                rejected.Add("La IA respondió con algo que no es el JSON esperado. No se cambió nada.");
                failed.UnionWith(plan.Ai.Select(s => s.Name));
            }
            else
            {
                foreach (var section in plan.Ai)
                {
                    if (!sections.TryGetProperty(section.Name, out var element))
                    {
                        rejected.Add($"La IA no devolvió «{Title(section.Name)}».");
                        failed.Add(section.Name);
                        continue;
                    }

                    var reason = Fill(section, element, plan, ref input);
                    if (reason is null)
                    {
                        applied.Add(Title(section.Name));
                    }
                    else
                    {
                        rejected.Add($"«{Title(section.Name)}»: {reason}");
                        failed.Add(section.Name);
                    }
                }
            }
        }

        var remaining = plan.Pending.Where(c => failed.Contains(c.Section) || (c.Section == "header" && failed.Contains("headline"))).ToList();
        return new PairApplied(input, applied, rejected, remaining);
    }

    /// <summary>Valida la sección que devolvió la IA y la pone en el documento. Devuelve el motivo del rechazo, o <c>null</c> si se aplicó.</summary>
    private static string? Fill(PairAiSection section, JsonElement element, PairPlan plan, ref CvDocumentInput input)
    {
        var source = plan.Source;
        switch (section.Name)
        {
            case "headline":
            case "summary":
            {
                if (element.ValueKind != JsonValueKind.String)
                {
                    return "se esperaba un texto.";
                }

                var text = (element.GetString() ?? string.Empty).Trim();
                if (NewNumbers(section, text) is { } bad)
                {
                    return bad;
                }

                input = section.Name == "headline" ? input with { Header = input.Header! with { Headline = text } } : input with { Summary = text };
                return null;
            }

            case "skills":
            {
                var groups = new List<CvSkillGroupInput>();
                if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() != source.Skills.Count)
                {
                    return "no respetó el número de categorías del origen.";
                }

                for (var i = 0; i < source.Skills.Count; i++)
                {
                    var g = element[i];
                    var items = Strings(g, "items");
                    if (g.ValueKind != JsonValueKind.Object || items is null || items.Count != source.Skills[i].Items.Count)
                    {
                        return "no respetó el número de habilidades de una categoría.";
                    }

                    groups.Add(new CvSkillGroupInput(Str(g, "label"), items));
                }

                if (NewNumbers(section, Flatten(groups.Select(g => g.Label).Concat(groups.SelectMany(g => g.Items!)))) is { } bad)
                {
                    return bad;
                }

                input = input with { Skills = groups };
                return null;
            }

            case "competencies":
            {
                if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() != source.Competencies.Count)
                {
                    return "no respetó el número de grupos del origen.";
                }

                var groups = new List<CvCompetencyGroupInput>();
                for (var i = 0; i < source.Competencies.Count; i++)
                {
                    var g = element[i];
                    var src = source.Competencies[i];
                    if (g.ValueKind != JsonValueKind.Object || !g.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array || items.GetArrayLength() != src.Items.Count)
                    {
                        return "no respetó el número de competencias de un grupo.";
                    }

                    // Las competencias son las mismas del catálogo en los dos idiomas: conservan el id del origen.
                    var list = src.Items.Select((c, j) => new CvCompetencyInput(c.Id, Str(items[j], "name"), Str(items[j], "note"))).ToList();
                    groups.Add(new CvCompetencyGroupInput(src.Kind, Str(g, "label"), list));
                }

                if (NewNumbers(section, Flatten(groups.SelectMany(g => g.Items!.Select(c => c.Name + " " + c.Note)))) is { } bad)
                {
                    return bad;
                }

                input = input with { Competencies = groups };
                return null;
            }

            case "experience":
            case "projects":
            {
                var sourceEntries = section.Name == "experience" ? source.Experience : source.Projects;
                if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() != sourceEntries.Count)
                {
                    return "no respetó el número de entradas del origen.";
                }

                var entries = new List<CvEntryInput>();
                var all = new List<string>();
                for (var i = 0; i < sourceEntries.Count; i++)
                {
                    var e = element[i];
                    var bullets = Strings(e, "bullets");
                    if (e.ValueKind != JsonValueKind.Object || bullets is null || bullets.Count != sourceEntries[i].Bullets.Count)
                    {
                        return "no respetó el número de viñetas de una entrada.";
                    }

                    // Las viñetas citan los mismos logros que las del origen (el logro es el mismo en los dos idiomas).
                    var items = bullets.Select((text, j) => new CvBulletInput(text, sourceEntries[i].Bullets[j].SourceIds)).ToList();
                    entries.Add(new CvEntryInput(Str(e, "title"), Str(e, "subtitle"), Str(e, "location"), Str(e, "context"), Str(e, "dates"), items));
                    all.AddRange(new[] { Str(e, "title"), Str(e, "subtitle"), Str(e, "dates") }.Concat(bullets));
                }

                if (NewNumbers(section, Flatten(all)) is { } bad)
                {
                    return bad;
                }

                input = section.Name == "experience" ? input with { Experience = entries } : input with { Projects = entries };
                return null;
            }

            case "education":
            {
                if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() != source.Education.Count)
                {
                    return "no respetó el número de estudios del origen.";
                }

                var rows = Enumerable.Range(0, source.Education.Count)
                    .Select(i => new CvEducationInput(Str(element[i], "degree"), Str(element[i], "institution"), Str(element[i], "dates"), Str(element[i], "detail")))
                    .ToList();
                if (NewNumbers(section, Flatten(rows.Select(r => r.Degree + " " + r.Institution + " " + r.Dates + " " + r.Detail))) is { } bad)
                {
                    return bad;
                }

                input = input with { Education = rows };
                return null;
            }

            case "extras":
            {
                var items = element.ValueKind == JsonValueKind.Object ? Strings(element, "items") : null;
                if (items is null || items.Count != source.Extras.Count)
                {
                    return "no respetó el número de elementos del origen.";
                }

                if (NewNumbers(section, Flatten(items)) is { } bad)
                {
                    return bad;
                }

                // Si el origen usa el título de siempre, el destino también (se traduce solo por idioma).
                var label = source.ExtrasLabel is null ? null : Str(element, "label");
                input = input with { Extras = items, ExtrasLabel = string.IsNullOrWhiteSpace(label) ? null : label };
                return null;
            }

            default:
                return "sección desconocida.";
        }
    }

    // ───────────────────────────── Validación de cifras ─────────────────────────────
    /// <summary>Ninguna cifra del texto nuevo puede faltar en el origen (antes o después) ni en el destino actual: la IA traduce, no agrega.</summary>
    private static string? NewNumbers(PairAiSection section, string produced)
    {
        var known = new HashSet<string>(Digits(section.Before).Concat(Digits(section.After)).Concat(Digits(section.Current)), StringComparer.Ordinal);
        var unknown = Digits(produced).FirstOrDefault(n => !known.Contains(n));
        return unknown is null ? null : $"incluye la cifra {unknown}, que no está en el origen ni en la versión actual.";
    }

    private static IEnumerable<string> Digits(string text) => Regex.Matches(text, @"\d+").Select(m => m.Value);

    private static string Flatten(IEnumerable<string?> texts) => string.Join('\n', texts.Where(t => !string.IsNullOrEmpty(t)));

    private static string Str(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var v) && v.ValueKind == JsonValueKind.String ? (v.GetString() ?? string.Empty).Trim() : string.Empty;

    private static List<string>? Strings(JsonElement element, string property)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(property, out var v) || v.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var list = new List<string>();
        foreach (var item in v.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            list.Add((item.GetString() ?? string.Empty).Trim());
        }

        return list;
    }

    // ───────────────────────────── Documento ⇄ secciones ─────────────────────────────
    /// <summary>El documento completo como lo recibe la edición libre.</summary>
    public static CvDocumentInput InputOf(CvDocument doc) => new(
        new CvHeaderInput(doc.Header.Name, doc.Header.Headline, doc.Header.ContactLine1, doc.Header.ContactLine2),
        doc.Summary,
        doc.Skills.Select(g => new CvSkillGroupInput(g.Label, g.Items)).ToList(),
        doc.Competencies.Select(g => new CvCompetencyGroupInput(g.Kind, g.Label, g.Items.Select(c => new CvCompetencyInput(c.Id, c.Name, c.Note)).ToList())).ToList(),
        doc.Experience.Select(EntryInput).ToList(),
        doc.Projects.Select(EntryInput).ToList(),
        doc.Education.Select(e => new CvEducationInput(e.Degree, e.Institution, e.Dates, e.Detail)).ToList(),
        doc.Extras,
        doc.ExtrasLabel);

    private static CvEntryInput EntryInput(CvEntry e) =>
        new(e.Title, e.Subtitle, e.Location, e.Context, e.Dates, e.Bullets.Select(b => new CvBulletInput(b.Text, b.SourceIds)).ToList());

    /// <summary>
    /// Cada sección como texto JSON comparable (sin ids ni fuentes: solo lo que dice). Sirve para detectar qué cambió y es lo
    /// que ve la IA.
    /// </summary>
    public static Dictionary<string, string> SectionsOf(CvDocument d) => new()
    {
        ["header"] = HeaderNode(d).ToJsonString(Options),
        ["summary"] = Quote(d.Summary),
        ["skills"] = new JsonArray(d.Skills.Select(g => (JsonNode)new JsonObject { ["label"] = g.Label, ["items"] = Strs(g.Items) }).ToArray()).ToJsonString(Options),
        ["competencies"] = new JsonArray(d.Competencies.Select(g => (JsonNode)new JsonObject
        {
            ["kind"] = g.Kind,
            ["label"] = g.Label,
            ["items"] = new JsonArray(g.Items.Select(c => (JsonNode)new JsonObject { ["name"] = c.Name, ["note"] = c.Note }).ToArray()),
        }).ToArray()).ToJsonString(Options),
        ["experience"] = EntriesNode(d.Experience).ToJsonString(Options),
        ["projects"] = EntriesNode(d.Projects).ToJsonString(Options),
        ["education"] = new JsonArray(d.Education.Select(e => (JsonNode)new JsonObject { ["degree"] = e.Degree, ["institution"] = e.Institution, ["dates"] = e.Dates, ["detail"] = e.Detail }).ToArray()).ToJsonString(Options),
        ["extras"] = new JsonObject { ["label"] = d.ExtrasLabel, ["items"] = Strs(d.Extras) }.ToJsonString(Options),
    };

    private static JsonNode HeaderNode(CvDocument d) => new JsonObject
    {
        ["name"] = d.Header.Name,
        ["headline"] = d.Header.Headline,
        ["contactLine1"] = Strs(d.Header.ContactLine1),
        ["contactLine2"] = Strs(d.Header.ContactLine2),
    };

    private static JsonArray EntriesNode(IEnumerable<CvEntry> entries) => new(entries.Select(e => (JsonNode)new JsonObject
    {
        ["title"] = e.Title,
        ["subtitle"] = e.Subtitle,
        ["location"] = e.Location,
        ["context"] = e.Context,
        ["dates"] = e.Dates,
        ["bullets"] = Strs(e.Bullets.Select(b => b.Text)),
    }).ToArray());

    private static JsonArray Strs(IEnumerable<string> values) => new(values.Select(v => (JsonNode)JsonValue.Create(v)!).ToArray());

    private static string Quote(string text) => JsonValue.Create(text)!.ToJsonString(Options);

    private static JsonObject? ParseObject(string json)
    {
        try
        {
            return JsonNode.Parse(json) as JsonObject;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
