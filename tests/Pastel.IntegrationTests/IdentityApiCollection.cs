using Xunit;

namespace Pastel.IntegrationTests;

[CollectionDefinition("Identity PostgreSQL integration tests", DisableParallelization = true)]
public sealed class IdentityApiCollection
{
    public const string Name = "Identity PostgreSQL integration tests";
}
