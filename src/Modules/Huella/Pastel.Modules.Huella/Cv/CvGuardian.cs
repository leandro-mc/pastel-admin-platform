using System.Text;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Cv;

/// <summary>Una comprobación del reporte ATS y de verdad.</summary>
internal sealed record CvCheck(string Label, bool Passed, string? Note);

/// <summary>
/// Guardián de verdad (§7.4, no negociable) y contrato ATS (§5). Toda línea, venga de las reglas, de una edición manual o
/// de una IA, pasa por aquí: debe citar logros del banco, no traer cifras que el banco no tenga, respetar el tope duro y
/// evitar las frases prohibidas. Una línea que no cumple se rechaza con un motivo en español.
/// </summary>
internal static class CvGuardian
{
    public static readonly IReadOnlyList<string> DefaultBannedPhrases =
    [
        "profesional apasionado", "profesional apasionada", "orientado a resultados", "orientada a resultados", "proactivo", "proactiva",
        "responsable de", "dinámico", "dinámica", "results-driven", "team player", "responsible for", "passionate",
    ];

    public static IReadOnlyList<string> BannedPhrases(BankData bank) => DefaultBannedPhrases.Concat(bank.ExtraBannedPhrases).ToList();

    /// <summary>Valida una viñeta. Devuelve <c>null</c> si es válida o el motivo del rechazo.</summary>
    public static string? ValidateBullet(string text, IReadOnlyCollection<Guid> sourceIds, BankData bank, CvLimits limits)
    {
        var clean = TextInput.CleanLine(text);
        if (clean.Length == 0)
        {
            return "Escriba el texto de la viñeta.";
        }

        if (clean.Length > limits.BulletMax)
        {
            return $"Excede el tope duro ({clean.Length} de {limits.BulletMax} caracteres).";
        }

        if (sourceIds.Count == 0)
        {
            return "Cada línea debe citar al menos una experiencia, un proyecto o un logro de su banco (sourceIds).";
        }

        if (sourceIds.Any(id => !bank.IsSource(id)))
        {
            return "La línea cita un origen que no está en su banco.";
        }

        var known = bank.NumbersOf(sourceIds);
        var invented = AchievementRules.Numbers(clean).FirstOrDefault(n => !known.Contains(n));
        if (invented is not null)
        {
            return $"Cifra nueva «{invented}» sin respaldo en el banco: agréguela al logro y márquela como verificada.";
        }

        return BannedIn(clean, bank) is { } phrase ? $"Frase prohibida: «{phrase}»." : null;
    }

    /// <summary>El perfil profesional: tope por nivel, sin cifras ajenas al banco y sin frases prohibidas.</summary>
    public static string? ValidateSummary(string text, BankData bank, CvLimits limits)
    {
        var clean = TextInput.CleanLine(text);
        if (clean.Length == 0)
        {
            return "Escriba el perfil profesional.";
        }

        if (clean.Length > limits.SummaryMax)
        {
            return $"Excede el tope del perfil ({clean.Length} de {limits.SummaryMax} caracteres).";
        }

        var known = bank.AllAchievements()
            .SelectMany(a => AchievementRules.Numbers(a.ShortText + " " + a.LongText + " " + a.RawText))
            .Concat(AchievementRules.Numbers(bank.AllText))
            .Concat(AchievementRules.Numbers(bank.ProfileSummary + " " + bank.Header.Headline))
            .Append(bank.ProfessionalYears().ToString(System.Globalization.CultureInfo.InvariantCulture))
            .ToHashSet(StringComparer.Ordinal);
        var invented = AchievementRules.Numbers(clean).FirstOrDefault(n => !known.Contains(n));
        if (invented is not null)
        {
            return $"Cifra nueva «{invented}» sin respaldo en el banco.";
        }

        return BannedIn(clean, bank) is { } phrase ? $"Frase prohibida: «{phrase}»." : null;
    }

    /// <summary>
    /// Texto libre redactado por una IA (titular, perfil, viñeta): no vacío, dentro del tope, sin cifras que el banco no
    /// respalde (<paramref name="knownNumbers"/>) y sin frases prohibidas. <c>null</c> si es válido.
    /// </summary>
    public static string? ValidateWritten(string text, int maxChars, IReadOnlySet<string> knownNumbers, BankData bank)
    {
        if (text.Length == 0)
        {
            return "Texto vacío.";
        }

        if (text.Length > maxChars)
        {
            return $"Excede el tope ({text.Length} de {maxChars} caracteres).";
        }

        var invented = AchievementRules.Numbers(text).FirstOrDefault(n => !knownNumbers.Contains(n));
        if (invented is not null)
        {
            return $"Cifra «{invented}» sin respaldo en el banco.";
        }

        return BannedIn(text, bank) is { } phrase ? $"Frase prohibida: «{phrase}»." : null;
    }

    private static string? BannedIn(string text, BankData bank)
    {
        var folded = TermMatcher.Fold(text);
        return BannedPhrases(bank).FirstOrDefault(p => p.Length > 0 && folded.Contains(TermMatcher.Fold(p), StringComparison.Ordinal));
    }

    /// <summary>Texto plano en orden de lectura: lo que extrae un sistema de reclutamiento (vista «lo que ve el ATS»).</summary>
    public static string AtsText(CvDocument doc, string language)
    {
        var en = language == "en";
        var sb = new StringBuilder();
        sb.AppendLine(doc.Header.Name).AppendLine(doc.Header.Headline);
        sb.AppendLine(string.Join(" · ", doc.Header.ContactLine1.Concat(doc.Header.ContactLine2)));
        sb.AppendLine().AppendLine(en ? "Summary" : "Perfil profesional").AppendLine(doc.Summary);
        sb.AppendLine().AppendLine(en ? "Skills" : "Habilidades técnicas");
        foreach (var g in doc.Skills)
        {
            sb.AppendLine(g.Line);
        }

        sb.AppendLine().AppendLine(en ? "Experience" : "Experiencia laboral");
        foreach (var e in doc.Experience)
        {
            sb.AppendLine($"{e.Title}, {e.Subtitle}{(e.Location is null ? string.Empty : ", " + e.Location)}   {e.Dates}");
            foreach (var b in e.Bullets)
            {
                sb.Append("• ").AppendLine(b.Text);
            }
        }

        if (doc.Projects.Count > 0)
        {
            sb.AppendLine().AppendLine(en ? "Projects" : "Proyectos");
            foreach (var p in doc.Projects)
            {
                sb.AppendLine(p.Subtitle.Length > 0 ? $"{p.Title} | {p.Subtitle}" : p.Title);
                foreach (var b in p.Bullets)
                {
                    sb.Append("• ").AppendLine(b.Text);
                }
            }
        }

        sb.AppendLine().AppendLine(en ? "Education" : "Educación");
        foreach (var ed in doc.Education)
        {
            sb.AppendLine($"{ed.Degree}, {ed.Institution}   {ed.Dates}");
            if (ed.Detail is not null)
            {
                sb.AppendLine(ed.Detail);
            }
        }

        sb.AppendLine().AppendLine(en ? "Certifications & Languages" : "Certificaciones e idiomas");
        foreach (var x in doc.Extras)
        {
            sb.AppendLine(x);
        }

        return sb.ToString().TrimEnd();
    }

    /// <summary>Reporte del CV: contrato ATS, cupo de páginas y guardián de verdad.</summary>
    public static IReadOnlyList<CvCheck> Checks(CvDocument doc, BankData bank, CvLimits limits, string language)
    {
        var text = AtsText(doc, language);
        var bullets = doc.AllBullets().ToList();
        var total = CvLayout.Total(doc, limits);
        var firstContact = doc.Header.ContactLine1.FirstOrDefault();
        return
        [
            new("Una columna, sin tablas, iconos ni imágenes", true, "Lo garantiza la plantilla."),
            new("Encabezados estándar y contacto en el cuerpo", firstContact is null || text.Contains(firstContact, StringComparison.Ordinal), null),
            new("Fecha en la misma línea que cargo y empresa", doc.Experience.All(e => text.Split('\n').Any(l => l.StartsWith(e.Title, StringComparison.Ordinal) && l.Contains(e.Dates, StringComparison.Ordinal))), null),
            new("Sin ligaduras Unicode (ﬁ ﬂ ﬀ)", !text.Any(c => c >= 'ﬀ' && c <= 'ﬆ'), null),
            new($"Dentro del cupo de páginas ({CvLayout.Fmt(total)} de {limits.CapacityLu} LU)", total <= limits.CapacityLu, null),
            new($"Ninguna viñeta supera el tope duro ({limits.BulletMax})", bullets.All(b => b.Text.Length <= limits.BulletMax), null),
            new("Sin frases prohibidas", BannedIn(text, bank) is null, null),
            new("Cada viñeta cita su logro de origen (sourceIds)", bullets.All(b => b.SourceIds.Count > 0 && b.SourceIds.All(bank.IsSource)), null),
            new("Todas las cifras existen en el banco", bullets.All(b => !(ValidateBullet(b.Text, b.SourceIds, bank, limits)?.StartsWith("Cifra", StringComparison.Ordinal) ?? false)), null),
            new("Ninguna habilidad inventada (todas están en el banco)", doc.Skills.SelectMany(g => g.Items).All(bank.Mentions), null),
        ];
    }
}
