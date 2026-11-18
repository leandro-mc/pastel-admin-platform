using System.Net;
using System.Text.Json;
using Pastel.Modules.Agora.Common;

namespace Pastel.Modules.Agora.Features.Share;

/// <summary>Lo que necesita la página de vista previa de una pieza.</summary>
internal sealed record SharePage(
    string Title,
    string Description,
    string Url,
    string? ImageUrl,
    string AuthorName,
    DateTimeOffset? PublishedAt,
    DateTimeOffset UpdatedAt);

/// <summary>
/// HTML mínimo para vistas previas (WhatsApp, buscadores) sin ejecutar JavaScript (AG-CON-01, AG-SEO-01): <c>title</c>,
/// <c>description</c>, <c>og:*</c> y JSON-LD <c>Article</c>. Quien llega con un navegador pasa a la pieza real. Todo texto se codifica.
/// </summary>
internal static class ShareHtml
{
    public static string SealText(SealDto seal) => seal.State switch
    {
        "verified" => "Verificada por " + string.Join(", ", seal.Verifiers.Select(v => v.Name)),
        "modifiedAfterVerification" => "Modificada tras la verificación",
        _ => "Pendiente de verificación",
    };

    public static string Render(SharePage page)
    {
        var title = WebUtility.HtmlEncode(page.Title + " · Ágora");
        var description = WebUtility.HtmlEncode(page.Description);
        var url = WebUtility.HtmlEncode(page.Url);
        var image = page.ImageUrl is null
            ? string.Empty
            : $"<meta property=\"og:image\" content=\"{WebUtility.HtmlEncode(page.ImageUrl)}\">\n<meta name=\"twitter:image\" content=\"{WebUtility.HtmlEncode(page.ImageUrl)}\">\n";
        var twitterCard = page.ImageUrl is null ? "summary" : "summary_large_image";

        return $"""
            <!doctype html>
            <html lang="es-CR">
            <head>
            <meta charset="utf-8">
            <title>{title}</title>
            <meta name="description" content="{description}">
            <link rel="canonical" href="{url}">
            <meta property="og:type" content="article">
            <meta property="og:site_name" content="Ágora">
            <meta property="og:locale" content="es_CR">
            <meta property="og:title" content="{WebUtility.HtmlEncode(page.Title)}">
            <meta property="og:description" content="{description}">
            <meta property="og:url" content="{url}">
            {image}<meta name="twitter:card" content="{twitterCard}">
            <meta http-equiv="refresh" content="0;url={url}">
            <script type="application/ld+json">{JsonLd(page)}</script>
            </head>
            <body>
            <p>Esta pieza está en <a href="{url}">Ágora</a>.</p>
            </body>
            </html>
            """;
    }

    private static string JsonLd(SharePage page)
    {
        var json = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Article",
            ["headline"] = page.Title,
            ["description"] = page.Description,
            ["inLanguage"] = "es-CR",
            ["mainEntityOfPage"] = page.Url,
            ["author"] = new Dictionary<string, object?> { ["@type"] = "Person", ["name"] = page.AuthorName },
            ["datePublished"] = page.PublishedAt,
            ["dateModified"] = page.UpdatedAt,
        });

        // Dentro de <script>: «<», «>» y «&» como escapes Unicode para que nada cierre el bloque.
        return json
            .Replace("<", "\\u003c", StringComparison.Ordinal)
            .Replace(">", "\\u003e", StringComparison.Ordinal)
            .Replace("&", "\\u0026", StringComparison.Ordinal);
    }
}
