namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Evidencia: qué habilidades demuestra cada logro (relación muchos a muchos).
/// </summary>
internal sealed class AchievementSkill
{
    public Guid AchievementId { get; set; }

    public Guid SkillId { get; set; }
}
