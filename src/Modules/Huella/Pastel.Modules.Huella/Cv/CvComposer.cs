using System.Globalization;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// Compone un CV a partir del banco, sin IA: elige los logros más relevantes para la oferta o el enfoque dentro del
/// presupuesto de líneas de cada nivel y usa las variantes larga y corta que el propietario ya revisó. No reescribe ni
/// inventa: el resultado es la base que la IA puede mejorar (siempre devolviendo JSON validado por <see cref="CvGuardian"/>).
/// </summary>
internal static class CvComposer
{
    public static CvDocument Compose(BankData bank, CvRequestOptions options, OfferAnalysis analysis, CvLimits limits)
    {
        var vocabulary = TermMatcher.Vocabulary(bank);
        var doc = new CvDocument
        {
            Language = options.Language,
            Header = new CvHeader
            {
                Name = bank.Header.Name,
                Headline = bank.Header.Headline,
                ContactLine1 = [.. bank.Header.ContactLine1],
                ContactLine2 = [.. bank.Header.ContactLine2],
            },
            Summary = Truncate(bank.ProfileSummary.Length > 0 ? bank.ProfileSummary : bank.Header.Headline, limits.SummaryMax),
        };

        var experiences = bank.Experiences.OrderByDescending(e => e.End ?? DateOnly.MaxValue).ThenByDescending(e => e.Start).Take(limits.Entries).ToList();
        for (var rank = 0; rank < experiences.Count; rank++)
        {
            var e = experiences[rank];
            var budget = rank < limits.EntryLines.Count ? limits.EntryLines[rank] : 0;
            var entry = new CvEntry
            {
                Title = e.Role,
                Subtitle = e.Company,
                Location = e.Location,
                Dates = MonthDate.CvRange(e.Start, e.End, options.Language),
                LineBudget = budget,
            };
            var used = 0;
            foreach (var (a, score) in e.Achievements.Select(x => (x, Score(x, rank, analysis, vocabulary))).OrderByDescending(x => x.Item2))
            {
                var longLines = Lines(a.LongText.Length, limits.BulletCharsPerLine);
                var shortLines = Lines(a.ShortText.Length, limits.BulletCharsPerLine);
                if (budget > 0 && used + longLines <= budget)
                {
                    entry.Bullets.Add(Bullet(a.LongText, a, score));
                    used += longLines;
                }
                else if (budget > 0 && used + shortLines <= budget)
                {
                    entry.Bullets.Add(Bullet(a.ShortText, a, score));
                    used += shortLines;
                }
            }

            doc.Experience.Add(entry);
        }

        var projects = bank.Projects
            .Where(p => p.Achievements.Count > 0)
            .Select(x => (project: x, score: x.Achievements.Max(y => Score(y, 0, analysis, vocabulary))))
            .OrderByDescending(x => x.score)
            .Take(limits.ProjectCount)
            .ToList();
        for (var i = 0; i < projects.Count; i++)
        {
            var p = projects[i].project;
            var budget = i < limits.ProjectLines.Count ? limits.ProjectLines[i] : 0;
            var entry = new CvEntry { Title = p.Name, Subtitle = p.Stack, LineBudget = budget };
            var used = 0;
            foreach (var a in p.Achievements.OrderByDescending(x => Score(x, 0, analysis, vocabulary)))
            {
                var text = Lines(a.LongText.Length, limits.BulletCharsPerLine) + used <= budget ? a.LongText : a.ShortText;
                var lines = Lines(text.Length, limits.BulletCharsPerLine);
                if (used + lines > budget)
                {
                    continue;
                }

                entry.Bullets.Add(Bullet(text, a, Score(a, 0, analysis, vocabulary)));
                used += lines;
            }

            doc.Projects.Add(entry);
        }

        doc.Skills = SkillGroups(bank, analysis, vocabulary, limits);

        var education = bank.Education.Take(limits.EducationCount).ToList();
        for (var i = 0; i < education.Count; i++)
        {
            var ed = education[i];
            var detail = limits.Level != "senior" && i == 0 ? ed.Note : null;
            doc.Education.Add(new CvEducation
            {
                Degree = ed.Degree,
                Institution = ed.Institution,
                Dates = YearRange(ed.StartYear, ed.EndYear),
                Detail = string.IsNullOrWhiteSpace(detail) ? null : Truncate(detail, 90),
            });
        }

        doc.Extras = bank.Certifications.Take(limits.CertificationCount)
            .Select(c => c.Year is { } y ? $"{c.Name} ({y.ToString(CultureInfo.InvariantCulture)})" : c.Name)
            .ToList();
        if (bank.Languages.Count > 0)
        {
            doc.Extras.Add(string.Join(" | ", bank.Languages.Select(l => $"{l.Language}: {l.Level}")));
        }

        return doc;
    }

    private static CvBullet Bullet(string text, BankAchievement a, double score) =>
        new() { Text = text, SourceIds = [a.Id], ShortText = a.ShortText, Score = Math.Round(score, 2) };

    /// <summary>Fuerza declarada, recencia y cobertura de los términos de la oferta (los obligatorios pesan 3; los deseables, 1).</summary>
    public static double Score(BankAchievement a, int rank, OfferAnalysis analysis, IReadOnlyList<(string Term, string[] Synonyms)> vocabulary)
    {
        var folded = TermMatcher.Fold(a.ShortText + " " + a.LongText + " " + string.Join(' ', a.Skills));
        var score = (a.Strength * 0.5) - (rank * 0.3);
        foreach (var term in analysis.Terms)
        {
            if (TermMatcher.SynonymsOf(term.Term, vocabulary).Any(s => TermMatcher.Contains(folded, s)))
            {
                score += term.Weight;
            }
        }

        return score;
    }

    private static List<CvSkillGroup> SkillGroups(BankData bank, OfferAnalysis analysis, IReadOnlyList<(string Term, string[] Synonyms)> vocabulary, CvLimits limits)
    {
        bool Relevant(BankSkill s) => analysis.Terms.Any(t => TermMatcher.SynonymsOf(t.Term, vocabulary).Contains(TermMatcher.Fold(s.Name)));

        var groups = bank.Skills
            .GroupBy(s => s.Category.Length == 0 ? "Otras" : s.Category)
            .Select(g => (label: g.Key, items: g.OrderByDescending(Relevant).ThenByDescending(s => s.Evidence).ToList(), relevant: g.Any(Relevant)))
            .OrderByDescending(g => g.relevant)
            .ThenByDescending(g => g.items.Sum(s => s.Evidence))
            .Take(limits.SkillGroups)
            .ToList();

        var total = 0;
        var result = new List<CvSkillGroup>();
        foreach (var (label, items, _) in groups)
        {
            var group = new CvSkillGroup { Label = label.Length > 24 ? label[..24] : label };
            foreach (var skill in items)
            {
                if (total >= limits.SkillsTotal)
                {
                    break;
                }

                var candidate = new CvSkillGroup { Label = group.Label, Items = [.. group.Items, skill.Name] };
                if (candidate.Line.Length > limits.SkillLineChars)
                {
                    break;
                }

                group.Items.Add(skill.Name);
                total++;
            }

            if (group.Items.Count > 0)
            {
                result.Add(group);
            }
        }

        return result;
    }

    public static int Lines(int chars, int perLine) => Math.Max(1, (int)Math.Ceiling(chars / (double)perLine));

    public static string Truncate(string text, int max)
    {
        if (text.Length <= max)
        {
            return text;
        }

        var cut = text[..max];
        var space = cut.LastIndexOf(' ');
        return (space > max / 2 ? cut[..space] : cut).TrimEnd(',', ';', ':') + (cut.EndsWith('.') ? string.Empty : ".");
    }

    public static string YearRange(int? start, int? end) => (start, end) switch
    {
        ({ } s, { } e) => $"{s.ToString(CultureInfo.InvariantCulture)} - {e.ToString(CultureInfo.InvariantCulture)}",
        (null, { } e) => e.ToString(CultureInfo.InvariantCulture),
        ({ } s, null) => s.ToString(CultureInfo.InvariantCulture),
        _ => string.Empty,
    };
}

/// <summary>Presupuesto de líneas (LU) de un CV y escalera de ajuste a la página (§6 y §7.6).</summary>
internal static class CvLayout
{
    public const double HeaderLu = 5.5;

    public static double EntryLines(CvEntry entry, CvLimits limits) =>
        entry.Bullets.Sum(b => CvComposer.Lines(b.Text.Length, limits.BulletCharsPerLine));

    public static double Total(CvDocument doc, CvLimits limits)
    {
        var summary = 2 + CvComposer.Lines(doc.Summary.Length, limits.CharsPerLine);
        var skills = 2 + doc.Skills.Sum(g => CvComposer.Lines(g.Line.Length, limits.CharsPerLine));
        var experience = 2 + doc.Experience.Sum(e => 1.5 + EntryLines(e, limits));
        var projects = doc.Projects.Count == 0 ? 0 : 2 + doc.Projects.Sum(p => 1.5 + EntryLines(p, limits));
        var education = 2 + doc.Education.Sum(e => 1.5 + (e.Detail is null ? 0 : CvComposer.Lines(e.Detail.Length, limits.CharsPerLine)));
        var extras = 2 + doc.Extras.Sum(x => CvComposer.Lines(x.Length, limits.CharsPerLine));
        return HeaderLu + summary + skills + experience + projects + education + extras;
    }

    /// <summary>Páginas estimadas a partir del presupuesto (el conteo real lo da el compilador cuando exista el motor de PDF).</summary>
    public static int EstimatedPages(CvDocument doc, CvLimits limits) =>
        Math.Max(1, (int)Math.Ceiling(Total(doc, limits) / (limits.CapacityLu / (double)limits.Pages)));

    /// <summary>
    /// Escalera de ajuste: 1) variante corta, 2) retirar la viñeta de menor puntuación, 3) retirar proyectos o recortar
    /// habilidades, 5) fallar con guía. Nunca se reduce la fuente. Devuelve el registro de pasos, en español.
    /// </summary>
    public static List<string> Fit(CvDocument doc, CvLimits limits)
    {
        var log = new List<string> { $"Borrador: {Fmt(Total(doc, limits))} LU frente a un cupo de {limits.CapacityLu} LU ({limits.Pages} pág.)." };
        if (doc.Summary.Length > limits.SummaryMax)
        {
            var before = doc.Summary.Length;
            doc.Summary = CvComposer.Truncate(doc.Summary, limits.SummaryMax);
            log.Add($"Paso 1 · Perfil comprimido de {before} a {doc.Summary.Length} caracteres (tope {limits.SummaryMax}).");
        }

        foreach (var entry in doc.Experience.Concat(doc.Projects))
        {
            while (EntryLines(entry, limits) > entry.LineBudget && entry.Bullets.Count > 0)
            {
                var lowest = entry.Bullets.OrderBy(b => b.Score).ToList();
                var shorter = lowest.FirstOrDefault(b => b.ShortText is { } s && s != b.Text
                    && CvComposer.Lines(s.Length, limits.BulletCharsPerLine) < CvComposer.Lines(b.Text.Length, limits.BulletCharsPerLine));
                if (shorter is not null)
                {
                    log.Add($"Paso 1 · {Name(entry)}: variante corta de una viñeta.");
                    shorter.Text = shorter.ShortText!;
                    continue;
                }

                var removed = lowest[0];
                entry.Bullets.Remove(removed);
                log.Add($"Paso 2 · {Name(entry)}: se retira la viñeta menos relevante (puntuación {Fmt(removed.Score)}).");
            }
        }

        var guard = 60;
        while (Total(doc, limits) > limits.CapacityLu && guard-- > 0)
        {
            if (doc.Projects.Count > 1)
            {
                var project = doc.Projects[^1];
                doc.Projects.RemoveAt(doc.Projects.Count - 1);
                log.Add($"Paso 3 · se retira el proyecto «{project.Title}».");
            }
            else if (doc.Skills.LastOrDefault(g => g.Items.Count > 3) is { } group)
            {
                group.Items.RemoveAt(group.Items.Count - 1);
                log.Add("Paso 3 · se recorta la última habilidad de un grupo.");
            }
            else if (doc.Experience.Where(e => e.Bullets.Count > 1).OrderBy(e => e.Bullets.Min(b => b.Score)).FirstOrDefault() is { } entry)
            {
                var removed = entry.Bullets.OrderBy(b => b.Score).First();
                entry.Bullets.Remove(removed);
                log.Add($"Paso 2 · {Name(entry)}: se retira la viñeta menos relevante para caber en el cupo.");
            }
            else
            {
                break;
            }
        }

        var total = Total(doc, limits);
        log.Add(total > limits.CapacityLu
            ? $"Paso 5 · Aún excede el cupo por {Fmt(total - limits.CapacityLu)} LU: quite contenido del banco o elija otro nivel. No se reduce la fuente bajo 10 pt."
            : $"Resultado: {Fmt(total)} LU de {limits.CapacityLu} LU. Cupo garantizado{(log.Count == 1 ? " sin ajustes" : string.Empty)}.");
        return log;
    }

    /// <summary>Empresa en una experiencia (tiene fechas); nombre en un proyecto.</summary>
    private static string Name(CvEntry entry) => entry.Dates.Length > 0 ? entry.Subtitle : entry.Title;

    public static string Fmt(double value) => value.ToString("0.#", CultureInfo.InvariantCulture).Replace('.', ',');
}
