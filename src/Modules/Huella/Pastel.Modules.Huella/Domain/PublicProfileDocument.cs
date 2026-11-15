namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Lo único que ve un visitante: la proyección pública del perfil, congelada en cada publicación
/// (<c>PublishedSnapshot.ContentJson</c>). Se arma con una lista blanca de campos; nada de <c>PrivateNote</c>, del relato,
/// de los logros marcados «solo CV» o «nunca», ni el correo o el teléfono si el propietario no los activó.
/// </summary>
internal sealed record PublicProfileDocument(
    string Name,
    string Headline,
    string Summary,
    string? Location,
    string? Availability,
    PublicContact Contact,
    IReadOnlyList<PublicLink> Links,
    PublicFacts Facts,
    IReadOnlyList<PublicLedgerLine> Highlights,
    IReadOnlyList<PublicExperience> Experience,
    IReadOnlyList<PublicProject> Projects,
    IReadOnlyList<PublicSkill> Skills,
    IReadOnlyList<PublicEducation> Education,
    IReadOnlyList<PublicCertification> Certifications,
    IReadOnlyList<PublicLanguage> Languages,
    bool HasCv);

internal sealed record PublicContact(string? Email, string? Phone);

internal sealed record PublicLink(string Kind, string Label, string Url);

internal sealed record PublicFacts(int YearsOfExperience, string? CurrentRole, string? CurrentCompany, string? CurrentSince, string? PreviousRole, string? PreviousCompany, string? PreviousYears);

/// <summary>Línea de «libro mayor»: la cifra primero (<see cref="Figure"/>) y el texto del logro.</summary>
internal sealed record PublicLedgerLine(string? Figure, string Text);

internal sealed record PublicExperience(string Role, string Company, string? Location, string Start, string? End, IReadOnlyList<PublicLedgerLine> Achievements);

internal sealed record PublicProject(string Name, string? Url, string? Stack, string Summary, IReadOnlyList<PublicLedgerLine> Achievements);

/// <summary>Habilidad con su evidencia, agrupada por recencia: <c>current</c>, <c>recent</c> (últimos 3 años) o <c>earlier</c>.</summary>
internal sealed record PublicSkill(string Name, string Category, string Recency, int Evidence);

internal sealed record PublicEducation(string Degree, string Institution, int? StartYear, int? EndYear, string? Note);

internal sealed record PublicCertification(string Name, string? Issuer, int? Year, string? Url);

internal sealed record PublicLanguage(string Language, string Level, string? Evidence);
