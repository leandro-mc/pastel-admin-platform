using Pastel.Platform.Modules;

namespace Pastel.Modules.Agora;

/// <summary>Permisos de Ágora, según su ficha (<c>docs/modules/AGORA.md</c>, «Roles y permisos»). Formato <c>agora.&lt;recurso&gt;.&lt;accion&gt;</c>.</summary>
internal static class AgoraPermissions
{
    public const string Code = "agora";
    public const string Access = "agora.access";
    public const string ContentManage = "agora.content.manage";
    public const string ContentReview = "agora.content.review";
    public const string SavedManage = "agora.saved.manage";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Ágora", 230,
        [
            new(Access, "Entrar al panel editorial", "Entrar al panel editorial de Ágora. Lo público no requiere permiso."),
            new(ContentManage, "Gestionar contenido", "Crear, editar, publicar y despublicar piezas; gestionar categorías, series, fuentes, videos y noticias enlazadas."),
            new(ContentReview, "Revisar y verificar", "Revisar una pieza y verificarla o retirar la verificación, con nota."),
            new(SavedManage, "Guardar piezas", "Guardar piezas y seguir categorías."),
        ]),
    ];
}
