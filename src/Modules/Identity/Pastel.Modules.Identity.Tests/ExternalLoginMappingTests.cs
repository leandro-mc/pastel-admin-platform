using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.Modules.Identity.Tests;

public sealed class ExternalLoginMappingTests
{
    [Fact]
    public void ExternalLoginMapsToIdentitySchemaWithUniqueProviderIndexesAndUserCascade()
    {
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused")
            .Options;

        using var db = new IdentityDbContext(options);
        var entity = db.Model.FindEntityType(typeof(ExternalLogin));

        Assert.NotNull(entity);
        Assert.Equal("external_logins", entity.GetTableName());
        Assert.Equal(IdentityDbContext.Schema, entity.GetSchema());

        Assert.Contains(entity.GetIndexes(), index =>
            index.IsUnique
            && index.Properties.Select(property => property.Name)
                .SequenceEqual(new[] { nameof(ExternalLogin.Provider), nameof(ExternalLogin.ProviderSubject) }));

        Assert.Contains(entity.GetIndexes(), index =>
            index.IsUnique
            && index.Properties.Select(property => property.Name)
                .SequenceEqual(new[] { nameof(ExternalLogin.UserId), nameof(ExternalLogin.Provider) }));

        Assert.Contains(entity.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(AppUser)
            && foreignKey.DeleteBehavior == DeleteBehavior.Cascade);
    }
}
