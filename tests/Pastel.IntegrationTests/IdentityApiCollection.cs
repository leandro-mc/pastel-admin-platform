using Xunit;

namespace Pastel.IntegrationTests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class IdentityApiCollection
{
    public const string Name = "Identity PostgreSQL integration tests";
}
