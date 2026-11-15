using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Pastel.Documents;

public static class DocumentsServiceCollectionExtensions
{
    /// <summary>Registra el motor documental. Es idempotente: varios módulos pueden llamarlo.</summary>
    public static IServiceCollection AddPastelDocuments(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<DocumentOptions>().Bind(configuration.GetSection(DocumentOptions.Section));
        services.TryAddSingleton<IDocumentRenderer, TypstDocumentRenderer>();
        return services;
    }
}
