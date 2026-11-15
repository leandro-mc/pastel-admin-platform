using System.Globalization;
using System.Text.RegularExpressions;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Cv;

/// <summary>Coincidencia de términos con sinónimos (JS ↔ JavaScript) sobre texto sin tildes ni mayúsculas.</summary>
internal static class TermMatcher
{
    /// <summary>Diccionario base de herramientas y prácticas con sus sinónimos. Se amplía con las habilidades del banco.</summary>
    public static readonly IReadOnlyList<(string Term, string[] Synonyms)> Known =
    [
        ("Playwright", ["playwright"]), ("Cypress", ["cypress"]), ("Selenium", ["selenium"]), ("E2E", ["e2e", "end-to-end"]),
        ("CI/CD", ["ci/cd", "github actions", "pipeline", "integracion continua"]), ("GitHub Actions", ["github actions"]),
        ("API", ["api", "endpoints", "rest"]), ("k6", ["k6"]), ("JMeter", ["jmeter"]), ("Docker", ["docker"]),
        ("Kubernetes", ["kubernetes", "k8s"]), ("TypeScript", ["typescript"]), ("JavaScript", ["javascript"]), ("C#", ["c#", ".net"]),
        ("Java", ["java"]), ("Kotlin", ["kotlin"]), ("React", ["react"]), ("Angular", ["angular"]), ("Python", ["python"]),
        ("SQL", ["sql", "postgres", "postgresql"]), ("AWS", ["aws", "amazon web services"]), ("Azure", ["azure"]),
        ("Mentoría", ["mentoria", "mentor"]), ("Liderazgo", ["liderazgo", "lidere", "lider tecnico"]),
        ("Estrategia de pruebas", ["estrategia de pruebas", "estrategia de regresion"]), ("Inglés", ["ingles", "english"]),
        ("Scrum", ["scrum", "agile", "agil"]),
    ];

    /// <summary>Sustitutos honestos: si falta el término pero existe el adyacente, la brecha se presenta como parcial.</summary>
    public static readonly IReadOnlyDictionary<string, string> Adjacent = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["Kubernetes"] = "Docker",
        ["JMeter"] = "k6",
        ["Cypress"] = "Playwright",
        ["Selenium"] = "Playwright",
    };

    public static string Fold(string? value) => TextInput.Fold(value);

    /// <summary>Busca un patrón ya normalizado respetando límites de palabra (para no confundir «java» con «javascript»).</summary>
    public static bool Contains(string foldedText, string foldedPattern)
    {
        if (foldedPattern.Length < 2)
        {
            return false;
        }

        var from = 0;
        while (from <= foldedText.Length - foldedPattern.Length)
        {
            var index = foldedText.IndexOf(foldedPattern, from, StringComparison.Ordinal);
            if (index < 0)
            {
                return false;
            }

            var end = index + foldedPattern.Length;
            var before = index == 0 || !char.IsLetterOrDigit(foldedText[index - 1]);
            var after = end >= foldedText.Length || !char.IsLetterOrDigit(foldedText[end]) || foldedPattern.Length > 3;
            if (before && after)
            {
                return true;
            }

            from = index + 1;
        }

        return false;
    }

    /// <summary>Términos conocidos: diccionario base más las habilidades del banco (con sus alias).</summary>
    public static IReadOnlyList<(string Term, string[] Synonyms)> Vocabulary(BankData bank)
    {
        var list = new List<(string Term, string[] Synonyms)>();
        foreach (var (term, synonyms) in Known)
        {
            list.Add((term, synonyms.Select(Fold).ToArray()));
        }

        foreach (var skill in bank.Skills)
        {
            var existing = list.FindIndex(k => Fold(k.Term) == Fold(skill.Name));
            var synonyms = new[] { skill.Name }.Concat(skill.Aliases).Select(Fold).Where(s => s.Length > 1).Distinct().ToArray();
            if (existing >= 0)
            {
                list[existing] = (list[existing].Term, list[existing].Synonyms.Concat(synonyms).Distinct().ToArray());
            }
            else
            {
                list.Add((skill.Name, synonyms));
            }
        }

        return list;
    }

    public static string[] SynonymsOf(string term, IReadOnlyList<(string Term, string[] Synonyms)> vocabulary)
    {
        foreach (var (t, synonyms) in vocabulary)
        {
            if (string.Equals(t, term, StringComparison.Ordinal))
            {
                return synonyms;
            }
        }

        return [Fold(term)];
    }
}

internal sealed record OfferTerm(string Term, int Weight);

internal sealed record OfferAnalysis(string Title, IReadOnlyList<OfferTerm> Terms);

/// <summary><c>ok</c> (hay logros que lo demuestran), <c>partial</c> (habilidad declarada o adyacente) o <c>gap</c> (brecha).</summary>
internal sealed record EvidenceItem(string Term, int Weight, string Status, int Count, string? Note);

internal sealed record HardFilterRow(string Requirement, string Mine, string Status, string Advice);

/// <summary>
/// Análisis determinista de una oferta o de un enfoque. La oferta es un dato no confiable: solo se buscan en ella
/// términos del vocabulario; nada de su texto se ejecuta ni se trata como instrucción.
/// </summary>
internal static partial class OfferAnalyzer
{
    public const int MaxOfferChars = 20000;

    public static OfferAnalysis Analyze(string text, bool isFocus, BankData bank)
    {
        var folded = TermMatcher.Fold(text);
        var niceFrom = isFocus ? -1 : NiceToHave().Match(folded) is { Success: true } m ? m.Index : -1;
        var terms = new List<OfferTerm>();
        foreach (var (term, synonyms) in TermMatcher.Vocabulary(bank))
        {
            var first = -1;
            foreach (var synonym in synonyms)
            {
                if (TermMatcher.Contains(folded, synonym))
                {
                    var index = folded.IndexOf(synonym, StringComparison.Ordinal);
                    first = first < 0 ? index : Math.Min(first, index);
                }
            }

            if (first >= 0)
            {
                terms.Add(new OfferTerm(term, niceFrom > -1 && first > niceFrom ? 1 : 3));
            }
        }

        var firstLine = text.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
        var title = isFocus ? "Perfil enfocado" : firstLine.Length > 120 ? firstLine[..120] : firstLine;
        return new OfferAnalysis(title, terms.Take(40).ToList());
    }

    public static IReadOnlyList<EvidenceItem> Evidence(OfferAnalysis analysis, BankData bank)
    {
        var vocabulary = TermMatcher.Vocabulary(bank);
        return analysis.Terms.Select(t => EvidenceFor(t.Term, t.Weight, bank, vocabulary, depth: 0)).ToList();
    }

    private static EvidenceItem EvidenceFor(string term, int weight, BankData bank, IReadOnlyList<(string Term, string[] Synonyms)> vocabulary, int depth)
    {
        var synonyms = TermMatcher.SynonymsOf(term, vocabulary);
        var hits = bank.AllAchievements().Count(a =>
            a.Skills.Any(s => synonyms.Contains(TermMatcher.Fold(s)))
            || synonyms.Any(s => TermMatcher.Contains(TermMatcher.Fold(a.ShortText + " " + a.LongText + " " + a.RawText), s)));
        if (hits > 0)
        {
            return new EvidenceItem(term, weight, "ok", hits, null);
        }

        if (term == "Inglés" && bank.Languages.Any(l => TermMatcher.Fold(l.Language).StartsWith("ingl", StringComparison.Ordinal)))
        {
            return new EvidenceItem(term, weight, "ok", 1, "idiomas");
        }

        if (bank.Skills.Any(s => synonyms.Contains(TermMatcher.Fold(s.Name))))
        {
            return new EvidenceItem(term, weight, "partial", 0, "figura en habilidades, sin logro que lo respalde");
        }

        if (depth == 0 && TermMatcher.Adjacent.TryGetValue(term, out var adjacent)
            && EvidenceFor(adjacent, weight, bank, vocabulary, depth + 1).Status == "ok")
        {
            return new EvidenceItem(term, weight, "partial", 0, "adyacente: " + adjacent);
        }

        return new EvidenceItem(term, weight, "gap", 0, null);
    }

    private static readonly IReadOnlyDictionary<string, int> Cefr = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        ["A1"] = 1, ["A2"] = 2, ["B1"] = 3, ["B2"] = 4, ["C1"] = 5, ["C2"] = 6, ["Nativo"] = 7,
    };

    /// <summary>Requisitos eliminatorios comparados con los datos privados, antes de generar (§7.2 y prototipo).</summary>
    public static IReadOnlyList<HardFilterRow> HardFilters(string offerText, BankData bank)
    {
        var rows = new List<HardFilterRow>();
        var folded = TermMatcher.Fold(offerText);
        var p = bank.Private;

        var years = YearsRequired().Match(folded);
        if (years.Success && int.TryParse(years.Groups[1].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var need))
        {
            var mine = bank.ProfessionalYears();
            var ok = mine >= need;
            rows.Add(new HardFilterRow(
                $"{need} años de experiencia", $"{mine} años según su experiencia profesional", ok ? "ok" : "no",
                ok ? "Cumple." : "No cumple: considere no aplicar o explique experiencia equivalente con evidencia real."));
        }

        if (folded.Contains("remot", StringComparison.Ordinal))
        {
            var ok = TermMatcher.Fold(p.WorkMode).Contains("remot", StringComparison.Ordinal);
            rows.Add(new HardFilterRow("Trabajo remoto", Or(p.WorkMode), ok ? "ok" : "no", ok ? "Cumple." : "Su preferencia no es remoto: responda con honestidad."));
        }

        if (folded.Contains("presencial", StringComparison.Ordinal))
        {
            var ok = TermMatcher.Fold(p.WorkMode).Contains("presencial", StringComparison.Ordinal);
            rows.Add(new HardFilterRow("Trabajo presencial", Or(p.WorkMode), ok ? "ok" : "no", ok ? "Cumple." : "Su preferencia no incluye presencial."));
        }

        if (folded.Contains("costa rica", StringComparison.Ordinal))
        {
            var ok = TermMatcher.Fold(p.Residence).Contains("costa rica", StringComparison.Ordinal);
            rows.Add(new HardFilterRow("Ubicación: Costa Rica", Or(p.Residence), ok ? "ok" : "no", ok ? "Cumple." : "Revise su ubicación y autorización de trabajo."));
        }

        var english = EnglishLevel().Match(offerText);
        if (english.Success)
        {
            var needLevel = english.Groups[1].Value.ToUpperInvariant();
            var mine = bank.Languages.FirstOrDefault(l => TermMatcher.Fold(l.Language).StartsWith("ingl", StringComparison.Ordinal))?.Level ?? "—";
            var ok = Cefr.TryGetValue(mine, out var have) && have >= Cefr[needLevel];
            rows.Add(new HardFilterRow($"Inglés {needLevel}", mine, ok ? "ok" : "no", ok ? "Cumple." : "Nivel insuficiente o sin declarar."));
        }

        if (Degree().IsMatch(folded))
        {
            var degree = bank.Education.FirstOrDefault(e => Degree().IsMatch(TermMatcher.Fold(e.Degree)));
            rows.Add(new HardFilterRow("Título universitario", degree?.Degree ?? "—", degree is null ? "no" : "ok",
                degree is null ? "Falta el título en el banco." : "Cumple."));
        }

        return rows;
    }

    private static string Or(string value) => value.Length == 0 ? "—" : value;

    [GeneratedRegex("valoramos|deseable|nice to have|plus|se valora", RegexOptions.CultureInvariant)]
    private static partial Regex NiceToHave();

    [GeneratedRegex(@"(\d{1,2})\+?\s*anos?\s+de\s+experiencia", RegexOptions.CultureInvariant)]
    private static partial Regex YearsRequired();

    [GeneratedRegex(@"ingl[eé]s[^.\n]{0,40}?\b(A1|A2|B1|B2|C1|C2)\b", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex EnglishLevel();

    [GeneratedRegex("bachiller|licenciatura|grado universitario|ingenieria|degree", RegexOptions.CultureInvariant)]
    private static partial Regex Degree();
}
