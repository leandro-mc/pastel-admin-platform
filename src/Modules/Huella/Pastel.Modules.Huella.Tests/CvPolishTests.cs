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
}
