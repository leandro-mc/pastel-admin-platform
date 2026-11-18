using System.Text.RegularExpressions;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// Quita del texto que redacta la IA las aclaraciones que le restan fuerza a un CV y que la persona puede explicar en la
/// entrevista (decisión del propietario): calificativos de cifras («(estimado)», «aprox.», «según mi estimación»), la palabra
/// «junior» y, en el titular y el perfil, la universidad o el año de graduación entre paréntesis. También quita conteos de
/// commits entre paréntesis; si el conteo sigue en el texto, el guardián rechaza la línea. Nunca agrega nada.
/// </summary>
internal static partial class CvPolish
{
    /// <summary>Texto de viñetas, cargos y contexto: sin calificativos de cifras, sin «junior» y sin conteos de commits entre paréntesis.</summary>
    public static string Strength(string text)
    {
        if (text.Length == 0)
        {
            return text;
        }

        var clean = WeakParenthetical().Replace(text, string.Empty);
        clean = EstimatePhrase().Replace(clean, string.Empty);
        clean = ApproxBeforeNumber().Replace(clean, string.Empty);
        clean = JuniorPhrase().Replace(clean, string.Empty);
        clean = JuniorWord().Replace(clean, string.Empty);
        return Tidy(clean);
    }

    /// <summary>
    /// ¿La oferta (o el enfoque) menciona IA de forma explícita? Solo entonces el CV destaca el uso de IA en el desarrollo
    /// (decisión del propietario): si no, se describe el resultado sin protagonismo de la IA.
    /// </summary>
    public static bool MentionsAi(string? text) =>
        !string.IsNullOrWhiteSpace(text) && AiMention().IsMatch(TermMatcher.Fold(text));

    /// <summary>
    /// Sin el uso de IA como protagonista («con asistencia de IA», «con agentes de IA», «asistido por IA», «bajo reglas
    /// escritas»): para ofertas que no piden IA. Solo quita esas frases; el hecho descrito queda igual.
    /// </summary>
    public static string WithoutAiAssistance(string text)
    {
        if (text.Length == 0)
        {
            return text;
        }

        var clean = RulesBetweenCommas().Replace(text, " ");
        clean = AiAssistance().Replace(clean, string.Empty);
        return Tidy(clean);
    }

    /// <summary>¿Es una habilidad del proceso de trabajo con IA (no una tecnología de producto)? Solo va si la oferta pide IA.</summary>
    public static bool IsAiSkill(string name) => AiSkill().IsMatch(TermMatcher.Fold(name));

    /// <summary>Titular y perfil: además, sin la universidad ni el año de graduación entre paréntesis o pegados al título.</summary>
    public static string Header(string text, BankData bank)
    {
        var clean = Strength(text);
        clean = YearParenthetical().Replace(clean, string.Empty);
        foreach (var institution in bank.Education.Select(e => e.Institution).Where(i => i.Length > 3).Distinct())
        {
            var name = Regex.Escape(institution);
            clean = Regex.Replace(clean, $@"\s*\([^()]*{name}[^()]*\)", string.Empty, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            clean = Regex.Replace(clean, $@"\s+(?:de|en|por)\s+(?:la\s+)?{name}(?:\s+de\s+Costa\s+Rica)?", string.Empty, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        }

        return Tidy(clean);
    }

    private static string Tidy(string text)
    {
        var clean = Spaces().Replace(text, " ");
        clean = SpaceBeforePunctuation().Replace(clean, "$1");
        clean = DoubleSeparator().Replace(clean, " | ");
        clean = clean.Replace(",,", ",", StringComparison.Ordinal).Replace(", .", ".", StringComparison.Ordinal);
        return clean.Trim().Trim('|', ',', ';').Trim();
    }

    [GeneratedRegex(@"(?<![\p{L}\p{N}])(?:ia|i\.a\.|ai|inteligencia artificial|artificial intelligence|machine learning|aprendizaje automatico|deep learning|llms?|genai|ia generativa|generative ai|openai|chatgpt|gpt|copilot|agentes? de ia|ai agents?|prompt engineering|prompts?|langchain|rag|modelos de lenguaje|language models?)(?![\p{L}\p{N}])", RegexOptions.CultureInvariant)]
    private static partial Regex AiMention();

    [GeneratedRegex(@"\s*,\s*bajo\s+reglas\s+escritas\s*,\s*", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RulesBetweenCommas();

    [GeneratedRegex(@"\s*,?\s*(?:(?:con|junto\s+con|mediante|usando)\s+(?:la\s+)?(?:asistencia|ayuda|apoyo)\s+de\s+(?:la\s+)?(?:IA|inteligencia\s+artificial)|(?:con|junto\s+con|mediante|usando)\s+agentes\s+de\s+(?:IA|inteligencia\s+artificial)|asistid[oa]s?\s+por\s+(?:IA|inteligencia\s+artificial)|bajo\s+reglas\s+escritas|(?:with|using)\s+(?:the\s+)?(?:help|assistance|support)\s+of\s+AI|(?:with|using)\s+AI\s+agents|AI-assisted)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex AiAssistance();

    [GeneratedRegex(@"desarrollo asistido por ia|prompt|agentes? de ia|ia generativa|apis de ia|asistid[oa] por ia|spring ai|openai|ollama|modelos de vision|ai-assisted|ai agents?", RegexOptions.CultureInvariant)]
    private static partial Regex AiSkill();

    // «(estimado)», «(estimación propia del beneficio observado)», «(aprox.)», «(79 commits)».
    [GeneratedRegex(@"\s*\((?=[^()]*(?:\bestimad[oa]s?\b|\bestimaci[oó]n|\baproximad[oa]s?\b|\baprox\b|\bapprox|\bestimated?\b|\bcommits?\b))[^()]*\)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex WeakParenthetical();

    [GeneratedRegex(@",?\s*(?:seg[uú]n\s+(?:mi\s+|una\s+)?estimaci[oó]n(?:\s+propia)?|por\s+estimaci[oó]n\s+propia|sin\s+medici[oó]n\s+formal|(?:es|fue)\s+una\s+estimaci[oó]n[^.;,]*)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex EstimatePhrase();

    [GeneratedRegex(@"\b(?:aproximadamente|aprox\.|approximately|approx\.)\s+(?=[\d+])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ApproxBeforeNumber();

    [GeneratedRegex(@",?\s*(?:de|con)\s+(?:nivel|perfil)\s+j[uú]nior\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex JuniorPhrase();

    [GeneratedRegex(@"\s*\b(?:j[uú]nior|jr)\b\.?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex JuniorWord();

    [GeneratedRegex(@"\s*\([^()]*\b(?:19|20)\d{2}\b[^()]*\)", RegexOptions.CultureInvariant)]
    private static partial Regex YearParenthetical();

    [GeneratedRegex(@"\s{2,}")]
    private static partial Regex Spaces();

    // Solo signos que cierran (seguidos de espacio o al final): «y .NET» no se toca.
    [GeneratedRegex(@"\s+([,.;:])(?=\s|$)")]
    private static partial Regex SpaceBeforePunctuation();

    [GeneratedRegex(@"\s*\|\s*(?:\|\s*)+")]
    private static partial Regex DoubleSeparator();
}
