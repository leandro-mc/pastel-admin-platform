namespace Pastel.Modules.Brisa.Domain;

/// <summary>Los 10 colores de tarjeta de la app (inventario §4). El color por defecto de una alta rápida es uno al azar.</summary>
internal static class TaskPalette
{
    public static readonly string[] Colors =
    [
        "#DDE8D5", "#DCEAF4", "#F5E9B9", "#F6DDCE", "#D4E9E1",
        "#E9E2D2", "#D1E7E5", "#F3D5C8", "#E5EDC8", "#D7E4F0",
    ];

    public static string Pick() => Colors[Random.Shared.Next(Colors.Length)];
}
