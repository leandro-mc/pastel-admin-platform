using Pastel.Modules.Huella.Features.Bank;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class BankBackupRulesTests
{
    private static BankBackup File(string? format = BankBackupRules.FormatName, int? version = 1, bool withBank = true) =>
        new(format, version, null, null, withBank ? new BankBackupData(null, null, null, null, null, null, null, null) : null);

    // Integridad: solo se intenta importar un documento reconocible y de una versión que esta aplicación entiende.
    [Fact]
    public void OnlyRecognizableBackupsOfAKnownVersionAreAccepted()
    {
        Assert.Null(BankBackupRules.CheckEnvelope(File()));
        Assert.Equal("huella.bank.backup_not_recognized", BankBackupRules.CheckEnvelope(null)!.Code);
        Assert.Equal("huella.bank.backup_not_recognized", BankBackupRules.CheckEnvelope(File(format: "otra-cosa"))!.Code);
        Assert.Equal("huella.bank.backup_not_recognized", BankBackupRules.CheckEnvelope(File(version: null))!.Code);
        Assert.Equal("huella.bank.backup_not_recognized", BankBackupRules.CheckEnvelope(File(withBank: false))!.Code);
        Assert.Equal("huella.bank.backup_too_new", BankBackupRules.CheckEnvelope(File(version: BankBackupRules.CurrentVersion + 1))!.Code);
    }

    // Aislamiento: un id del archivo que pertenece a otro perfil (ni mío ni libre) nunca se conserva, y un id repetido tampoco.
    [Fact]
    public void OnlyMineOrFreeIdsAreKeptAndEachOnlyOnce()
    {
        var mine = Guid.NewGuid();
        var free = Guid.NewGuid();
        var someoneElses = Guid.NewGuid();
        var usable = new HashSet<Guid> { mine, free };
        var used = new HashSet<Guid>();

        Assert.Equal(mine, BankBackupRules.KeepId(mine, usable, used));
        Assert.Equal(free, BankBackupRules.KeepId(free, usable, used));
        Assert.Null(BankBackupRules.KeepId(someoneElses, usable, used));
        Assert.Null(BankBackupRules.KeepId(mine, usable, used));
        Assert.Null(BankBackupRules.KeepId(null, usable, used));
    }

    // Integridad: un logro no puede quedar citando una habilidad que no entró al banco.
    [Fact]
    public void AnAchievementThatCitesAMissingSkillIsRejected()
    {
        var inFile = Guid.NewGuid();
        var inBank = Guid.NewGuid();
        var map = new Dictionary<Guid, Guid> { [inFile] = inBank };

        Assert.True(BankBackupRules.TryMapSkills([inFile, inFile], map, out var mapped));
        Assert.Equal([inBank], mapped);
        Assert.False(BankBackupRules.TryMapSkills([inFile, Guid.NewGuid()], map, out _));
        Assert.True(BankBackupRules.TryMapSkills(null, map, out var none));
        Assert.Empty(none);
    }

    [Fact]
    public void EveryIdOfTheFileIsCollectedOnceIncludingAchievements()
    {
        var shared = Guid.NewGuid();
        var achievement = new AchievementInput(Guid.NewGuid(), "a", "b", null, null, null, null, "other", 3, true, "manual", "both", [shared]);
        var experience = new BackupExperience(Guid.NewGuid(), "Rol", null, "Empresa", null, null, null, "2024-01", null, "", null, null, true, [achievement]);
        var skill = new SkillInput(shared, "Java", null, "Lenguajes", null, null, "", true);
        var data = new BankBackupData(null, [experience], null, [skill, skill], null, null, null, null);

        var ids = BankBackupRules.FileIds(data);

        Assert.Equal(3, ids.Count);
        Assert.Contains(shared, ids);
        Assert.Contains(experience.Id!.Value, ids);
        Assert.Contains(achievement.Id!.Value, ids);
    }
}
