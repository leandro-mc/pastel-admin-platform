namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Lo único que ve un visitante: la proyección pública del perfil, congelada en cada publicación
/// (<c>PublishedSnapshot.ContentJson</c>). Lleva siempre las dos versiones, español e inglés, y cada una es un texto corto y
/// priorizado (no una copia del banco). Se arma con una lista blanca de campos; nada de <c>PrivateNote</c>, del relato, de
/// los logros marcados «solo CV» o «nunca», ni el correo o el teléfono si el propietario no los activó.
/// </summary>
internal sealed record PublicProfileDocument(
    string Name,
    string? Location,
    string? Availability,
    PublicContact Contact,
    IReadOnlyList<PublicLink> Links,
    bool HasCv,
    PublicLocalized Es,
    PublicLocalized En);

/// <summary>El perfil en un idioma.</summary>
internal sealed record PublicLocalized(
    string Headline,
    string Summary,
    PublicFacts Facts,
    IReadOnlyList<PublicLedgerLine> Highlights,
    IReadOnlyList<PublicExperience> Experience,
    IReadOnlyList<PublicProject> Projects,
    IReadOnlyList<PublicSkillGroup> Skills,
    IReadOnlyList<PublicEducation> Education,
    IReadOnlyList<PublicCertification> Certifications,
    IReadOnlyList<PublicLanguage> Languages);

internal sealed record PublicContact(string? Email, string? Phone);

internal sealed record PublicLink(string Kind, string Label, string Url, string? Icon = null);

/// <summary>Datos objetivos para la ficha del perfil. Las fechas viajan como <c>AAAA-MM</c>; la interfaz las formatea según el idioma.</summary>
internal sealed record PublicFacts(int YearsOfExperience, string? CurrentRole, string? CurrentCompany, string? CurrentSince, string? PreviousRole, string? PreviousCompany, string? PreviousYears);

/// <summary>Línea de «libro mayor»: la cifra primero (<see cref="Figure"/>, opcional) y el texto.</summary>
internal sealed record PublicLedgerLine(string? Figure, string Text);

internal sealed record PublicExperience(string Role, string Company, string? Location, string Start, string? End, IReadOnlyList<PublicLedgerLine> Achievements);

internal sealed record PublicProject(string Name, string? Url, string? Stack, string Summary);

internal sealed record PublicSkillGroup(string Label, IReadOnlyList<string> Items);

internal sealed record PublicEducation(string Degree, string Institution, int? StartYear, int? EndYear, string? Note);

internal sealed record PublicCertification(string Name, string? Issuer, int? Year, string? Url);

internal sealed record PublicLanguage(string Language, string Level);
