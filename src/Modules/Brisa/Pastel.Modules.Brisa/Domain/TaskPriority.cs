namespace Pastel.Modules.Brisa.Domain;

/// <summary>Prioridad de una tarea. Rango interno LOW=0, MEDIUM=1, HIGH=2 (como en la app Android).</summary>
internal enum TaskPriority : short
{
    Low = 0,
    Medium = 1,
    High = 2,
}

internal static class TaskPriorities
{
    /// <summary>Valor en la API y en los archivos de importación: <c>LOW</c>, <c>MEDIUM</c> o <c>HIGH</c>.</summary>
    public static string ToWire(TaskPriority priority) => priority switch
    {
        TaskPriority.Low => "LOW",
        TaskPriority.High => "HIGH",
        _ => "MEDIUM",
    };

    /// <summary>Vacío se lee como Media. Falso solo si el valor no es ninguno de los tres (el llamador decide si es error o aviso).</summary>
    public static bool TryParse(string? value, out TaskPriority priority)
    {
        priority = TaskPriority.Medium;
        switch (value?.Trim().ToUpperInvariant())
        {
            case null or "":
            case "MEDIUM":
                return true;
            case "LOW":
                priority = TaskPriority.Low;
                return true;
            case "HIGH":
                priority = TaskPriority.High;
                return true;
            default:
                return false;
        }
    }
}
