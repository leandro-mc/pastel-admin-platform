using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvPolishTests
{
    // Decisión del propietario (fuerza del CV): las aclaraciones que restan valor no llegan al CV y los conteos de commits
    // nunca son una métrica; la limpieza solo quita texto, nunca agrega hechos.
    [Fact]
    public void WeakeningClarificationsAreRemovedAndCommitCountsRejected()
    {
        Assert.Equal(
            "Reduje en más del 70 % el tiempo de gestión de solicitudes.",
            CvPolish.Strength("Reduje en más del 70 % (estimado) el tiempo de gestión de solicitudes, según mi estimación."));
        Assert.Equal(
            "Reduje de 40 a menos de 3 minutos cada constancia.",
            CvPolish.Strength("Reduje de 40 a menos de 3 minutos cada constancia (estimación propia del beneficio observado)."));
        Assert.Equal("Desarrollador Fullstack | Java, React", CvPolish.Strength("Desarrollador Fullstack Junior | Java, React"));

        var (bank, _, _) = CvAiComposeTests.Bank();
        Assert.Equal(
            "Ingeniero en Sistemas con cerca de 2 años desarrollando software.",
            CvPolish.Header("Ingeniero en Sistemas (UNA, 2026) de perfil junior con cerca de 2 años desarrollando software.", bank.Data));

        Assert.NotNull(CvGuardian.ValidateWritten("Documenté la auditoría con 79 commits propios.", 200, new HashSet<string> { "79" }, bank.Data));
    }

    // Decisión del propietario: la asistencia de IA solo se destaca si la oferta la menciona; si no, se quita la frase y el
    // hecho queda igual (sin tocar nombres como «.NET»).
    [Fact]
    public void AiAssistanceIsOnlyHighlightedWhenTheOfferMentionsAi()
    {
        Assert.False(CvPolish.MentionsAi("React en el frontend, Java en el backend, APIs REST, Docker y Kafka."));
        Assert.True(CvPolish.MentionsAi("Experiencia con IA generativa y LLMs."));
        Assert.Equal(
            "Desarrollé una plataforma web con más de 50 endpoints REST.",
            CvPolish.WithoutAiAssistance("Desarrollé con asistencia de IA una plataforma web con más de 50 endpoints REST."));
        Assert.Equal(
            "Dirijo el desarrollo de una plataforma modular en React 19 y .NET 10.",
            CvPolish.WithoutAiAssistance("Dirijo con agentes de IA, bajo reglas escritas, el desarrollo de una plataforma modular en React 19 y .NET 10."));
        Assert.True(CvPolish.IsAiSkill("Prompt Engineering"));
        Assert.False(CvPolish.IsAiSkill("React"));
    }
}
