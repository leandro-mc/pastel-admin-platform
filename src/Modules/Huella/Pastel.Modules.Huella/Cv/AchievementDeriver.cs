using System.Text.RegularExpressions;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Cv;

/// <summary>Logro propuesto a partir del relato. No entra al banco hasta que el propietario lo confirma.</summary>
internal sealed record AchievementProposal(
    string ShortText,
    string LongText,
    string RawText,
    string? ResultValue,
    string? ResultUnit,
    IReadOnlyList<string> Skills,
    int Strength,
    string ImpactType,
    bool NeedsFigure);

/// <summary>
/// Derivación por reglas del relato largo a logros (formato XYZ: verbo + qué + cómo + resultado). Es la misma lógica que
/// demostró el prototipo y funciona sin red ni claves. Con IA, el contrato de salida es el mismo y pasa por las mismas
/// validaciones (<see cref="AchievementRules"/>). Nunca inventa: cada línea sale de una frase escrita por el propietario.
/// </summary>
internal static partial class AchievementDeriver
{
    public const int MaxProposals = 30;

    private static readonly HashSet<string> TrailingStopWords = new(StringComparer.Ordinal)
    {
        "de", "la", "el", "y", "en", "a", "con", "que", "los", "las", "un", "una", "por", "para", "al", "del", "antes",
        "como", "se", "su", "sus", "propia", "propias", "propio", "propios", "misma", "mismo", "and", "the", "of", "to", "with",
    };

    /// <param name="requireVerb">En experiencias solo cuentan las frases que empiezan por un verbo de acción; en proyectos, todas.</param>
    public static IReadOnlyList<AchievementProposal> Derive(string narrative, bool requireVerb, IReadOnlyList<(string Term, string[] Synonyms)> vocabulary)
    {
        var proposals = new List<AchievementProposal>();
        foreach (var sentence in Sentences(narrative))
        {
            var clean = Spaces().Replace(sentence, " ").TrimEnd('.');
            if (requireVerb && !ActionVerb().IsMatch(clean.TrimStart('«', '"')))
            {
                continue;
            }

            var folded = TermMatcher.Fold(clean);
            var skills = vocabulary.Where(v => v.Synonyms.Any(s => TermMatcher.Contains(folded, s))).Select(v => v.Term).Distinct().ToList();
            var figure = Figure().Match(clean);
            var hasDigit = clean.Any(char.IsDigit);
            var strength = !hasDigit ? 2 : StrongUnit().IsMatch(folded) ? 5 : 4;
            proposals.Add(new AchievementProposal(
                Tidy(clean, HuellaLimits.Achievement.ShortText),
                Tidy(clean, HuellaLimits.Achievement.LongText),
                clean.Length > HuellaLimits.Achievement.RawText ? clean[..HuellaLimits.Achievement.RawText] : clean,
                figure.Success ? figure.Groups["value"].Value : null,
                figure.Success && figure.Groups["pct"].Success ? "%" : null,
                skills,
                strength,
                ImpactOf(folded),
                !hasDigit));
            if (proposals.Count == MaxProposals)
            {
                break;
            }
        }

        return proposals;
    }

    /// <summary>Frases de al menos 20 caracteres, cortadas al terminar en punto y empezar con mayúscula.</summary>
    public static IEnumerable<string> Sentences(string text) =>
        SentenceBreak().Split(Spaces().Replace(text ?? string.Empty, " "))
            .Select(s => s.Trim())
            .Where(s => s.Length >= 20);

    /// <summary>Recorta una frase al tope sin partir palabras, prefiriendo cortar en un punto y coma que conserve la cifra.</summary>
    public static string Tidy(string sentence, int max)
    {
        var text = sentence;
        if (text.Length > max - 1)
        {
            var semicolon = text.IndexOf(';', StringComparison.Ordinal);
            var cutAtSemicolon = semicolon >= 45 && semicolon <= max - 1
                && (text[..semicolon].Any(char.IsDigit) || !text[(semicolon + 1)..].Any(char.IsDigit));
            if (cutAtSemicolon)
            {
                text = text[..semicolon];
            }
            else
            {
                text = text[..(max - 1)];
                var space = text.LastIndexOf(' ');
                if (space > 0)
                {
                    text = text[..space];
                }
            }
        }

        var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
        while (words.Count > 3 && TrailingStopWords.Contains(TermMatcher.Fold(words[^1])))
        {
            words.RemoveAt(words.Count - 1);
        }

        var result = string.Join(' ', words).TrimEnd(';', ',', ':', '.');
        return result.Length == 0 ? result : result + ".";
    }

    private static string ImpactOf(string folded)
    {
        if (Leadership().IsMatch(folded))
        {
            return "leadership";
        }

        if (Quality().IsMatch(folded))
        {
            return "quality";
        }

        if (Scale().IsMatch(folded))
        {
            return "scale";
        }

        if (Performance().IsMatch(folded))
        {
            return "performance";
        }

        return "delivery";
    }

    [GeneratedRegex(@"^(tambien\s+|también\s+)?(automaticé|integré|diseñé|construí|reduje|definí|acompañé|elevé|corregí|escribí|creé|optimicé|documenté|coordiné|mejoré|desarrollé|configuré|implementé|migré|lideré|ayudé|publiqué|presenté|capacité|analicé|gestioné|negocié|organicé|aumenté|logré|establecí|resolví|dirigí|entregué|lancé|automated|built|designed|reduced|led|implemented|migrated|improved|created|developed|integrated)(?!\p{L})", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ActionVerb();

    [GeneratedRegex(@"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«""])", RegexOptions.CultureInvariant)]
    private static partial Regex SentenceBreak();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex Spaces();

    [GeneratedRegex(@"(?<value>\d+(?:[.,]\d+)?)\s*(?<pct>%)?", RegexOptions.CultureInvariant)]
    private static partial Regex Figure();

    [GeneratedRegex("%|hora|dia|minuto|semana|mes|cliente|persona|usuario|estrella|equipo", RegexOptions.CultureInvariant)]
    private static partial Regex StrongUnit();

    [GeneratedRegex("mentor|acompan|lider|capacite|dirigi", RegexOptions.CultureInvariant)]
    private static partial Regex Leadership();

    [GeneratedRegex("cobertura|defecto|fallo|calidad|error", RegexOptions.CultureInvariant)]
    private static partial Regex Quality();

    [GeneratedRegex("cliente|usuario|estrella|equipos|endpoints", RegexOptions.CultureInvariant)]
    private static partial Regex Scale();

    [GeneratedRegex("reduj|bajar|ahorr|tiempo|rapid|minuto|hora", RegexOptions.CultureInvariant)]
    private static partial Regex Performance();
}

/// <summary>Valores admitidos y validaciones de los logros (los usan el banco, la derivación por reglas y la IA).</summary>
internal static partial class AchievementRules
{
    public static readonly IReadOnlyList<string> ImpactTypes = ["performance", "quality", "revenue", "cost", "scale", "leadership", "delivery", "other"];
    public static readonly IReadOnlyList<string> Visibilities = ["both", "cv", "public", "never"];

    /// <summary>Cifras de un texto (enteros o decimales), para el guardián de verdad.</summary>
    public static IReadOnlySet<string> Numbers(string? text) =>
        Number().Matches(text ?? string.Empty).Select(m => m.Value.Replace(',', '.')).ToHashSet(StringComparer.Ordinal);

    [GeneratedRegex(@"\d+(?:[.,]\d+)?", RegexOptions.CultureInvariant)]
    private static partial Regex Number();
}
