using System.Text.Json;

namespace Pastel.Modules.Brisa.Domain;

/// <summary>Una tarea del archivo, ya validada. <see cref="Row"/> es la fila (desde 1) para informar.</summary>
internal sealed record ImportRecord(
    int Row,
    Guid Id,
    string Title,
    string Notes,
    DateOnly ScheduledDate,
    DateOnly? DueDate,
    TaskPriority Priority,
    string ColorHex,
    bool Completed,
    DateTimeOffset? CreatedAt)
{
    /// <summary>¿La tarea guardada tiene el mismo contenido? Se comparan los campos de §9.3; <c>CreatedAt</c> solo si el archivo lo trae.</summary>
    public bool SameAs(BrisaTask task) =>
        task.Title == Title
        && task.Notes == Notes
        && task.ScheduledDate == ScheduledDate
        && task.DueDate == DueDate
        && task.Priority == Priority
        && string.Equals(task.ColorHex, ColorHex, StringComparison.OrdinalIgnoreCase)
        && task.IsCompleted == Completed
        && (CreatedAt is null || task.CreatedAt.ToUnixTimeMilliseconds() == CreatedAt.Value.ToUnixTimeMilliseconds());
}

/// <summary>Un error o aviso del archivo, con fila y campo cuando se conocen.</summary>
internal sealed record ImportIssue(int? Row, string? Field, string Message);

internal sealed record ImportAnalysis(
    IReadOnlyList<ImportRecord> Records, IReadOnlyList<ImportIssue> Errors, IReadOnlyList<ImportIssue> Warnings)
{
    /// <summary>Todo o nada: con un solo error no se importa ningún registro.</summary>
    public bool Accepted => Errors.Count == 0;
}

/// <summary>Totales de vista previa: registros, abiertas, hechas, con fecha límite y rango de días asignados.</summary>
internal sealed record ImportSummary(int Records, int Open, int Done, int WithDeadline, DateOnly? From, DateOnly? To)
{
    public static ImportSummary Of(IReadOnlyCollection<ImportRecord> records) => new(
        records.Count,
        records.Count(r => !r.Completed),
        records.Count(r => r.Completed),
        records.Count(r => r.DueDate is not null),
        records.Count == 0 ? null : records.Min(r => r.ScheduledDate),
        records.Count == 0 ? null : records.Max(r => r.ScheduledDate));
}

/// <summary>
/// Lee y valida un archivo de importación (inventario §9.2–§9.4): el arreglo crudo de <c>tasks_json</c> o el sobre
/// <c>brisa-export</c>. Es puro (sin base de datos). Estricto y de todo o nada: cualquier registro inválido rechaza el lote y
/// se informa fila, campo y motivo. Única tolerancia: prioridad desconocida → Media con aviso.
/// </summary>
internal static class ImportParser
{
    public static ImportAnalysis Parse(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return Rejected("El archivo está vacío. Elige un archivo con tus tareas.");
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(content);
        }
        catch (JsonException)
        {
            return Rejected("El archivo no es un JSON válido. Revisa que no falte una coma, una llave o un corchete. No se importó nada.");
        }

        using (document)
        {
            var (tasks, shapeError) = FindTasks(document.RootElement);
            if (tasks is not { } list)
            {
                return Rejected(shapeError ?? "El archivo no tiene el formato esperado.");
            }

            var records = new List<ImportRecord>();
            var errors = new List<ImportIssue>();
            var warnings = new List<ImportIssue>();
            var seen = new HashSet<Guid>();
            var row = 0;
            foreach (var element in list.EnumerateArray())
            {
                row++;
                ParseRecord(element, row, seen, records, errors, warnings);
            }

            if (row == 0)
            {
                errors.Add(new ImportIssue(null, null, "El archivo no tiene ninguna tarea."));
            }

            return new ImportAnalysis(errors.Count == 0 ? records : [], errors, warnings);
        }
    }

    private static ImportAnalysis Rejected(string message) =>
        new([], [new ImportIssue(null, null, message)], []);

    private static (JsonElement? Tasks, string? Error) FindTasks(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            return (root, null);
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            if (root.TryGetProperty("format", out var format)
                && !(format.ValueKind == JsonValueKind.String && format.GetString() == "brisa-export"))
            {
                return (null, "El archivo no es una exportación de Brisa: el campo «format» debe ser «brisa-export».");
            }

            if (root.TryGetProperty("version", out var version)
                && !(version.ValueKind == JsonValueKind.Number && version.TryGetInt32(out var number) && number == 1))
            {
                return (null, "La versión del archivo no es compatible: se esperaba la versión 1.");
            }

            if (root.TryGetProperty("tasks", out var tasks) && tasks.ValueKind == JsonValueKind.Array)
            {
                return (tasks, null);
            }
        }

        return (null, "El archivo no tiene el formato esperado: debe ser una lista de tareas o un objeto con la lista en «tasks».");
    }

    private static void ParseRecord(
        JsonElement element,
        int row,
        HashSet<Guid> seen,
        List<ImportRecord> records,
        List<ImportIssue> errors,
        List<ImportIssue> warnings)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            errors.Add(new ImportIssue(row, null, "Esta fila no es un registro de tarea."));
            return;
        }

        var errorsBefore = errors.Count;
        var id = ReadId(element, row, errors);
        var title = ReadText(element, "title", row, errors);
        var notes = ReadText(element, "details", row, errors);
        var scheduled = ReadText(element, "scheduledDate", row, errors);
        var due = ReadText(element, "dueDate", row, errors);
        var color = ReadText(element, "colorHex", row, errors);
        var completed = ReadBool(element, "completed", row, errors);
        var createdAt = ReadCreatedAt(element, row, errors, warnings);

        if (id is { } guid && !seen.Add(guid))
        {
            errors.Add(new ImportIssue(row, "id", "El id está repetido en el archivo."));
        }

        // Con errores de tipo no tiene sentido validar el contenido: se informarían errores derivados.
        if (errors.Count > errorsBefore)
        {
            return;
        }

        var validation = TaskRules.Validate(title, notes, scheduled, due, color);
        if (validation.IsFailure)
        {
            var details = validation.Error.Details;
            if (details is null)
            {
                errors.Add(new ImportIssue(row, null, validation.Error.Message));
            }
            else
            {
                foreach (var (field, messages) in details)
                {
                    foreach (var message in messages)
                    {
                        errors.Add(new ImportIssue(row, SourceField(field), message));
                    }
                }
            }

            return;
        }

        var priority = TaskPriority.Medium;
        if (element.TryGetProperty("priority", out var raw) && raw.ValueKind != JsonValueKind.Null)
        {
            var text = raw.ValueKind == JsonValueKind.String ? raw.GetString() : raw.ToString();
            if (!TaskPriorities.TryParse(text, out priority))
            {
                priority = TaskPriority.Medium;
                warnings.Add(new ImportIssue(row, "priority", $"Prioridad desconocida «{text}»: se usó Media."));
            }
        }

        var data = validation.Value;
        records.Add(new ImportRecord(
            row,
            id.GetValueOrDefault(),
            data.Title,
            data.Notes,
            data.ScheduledDate,
            data.DueDate,
            priority,
            data.ColorHex ?? TaskRules.DefaultColorHex,
            completed,
            createdAt));
    }

    /// <summary>Los campos del archivo son los de la app Android (<c>details</c> son las notas).</summary>
    private static string SourceField(string field) => field == "notes" ? "details" : field;

    private static Guid? ReadId(JsonElement element, int row, List<ImportIssue> errors)
    {
        if (!element.TryGetProperty("id", out var value) || value.ValueKind == JsonValueKind.Null)
        {
            errors.Add(new ImportIssue(row, "id", "Falta el id."));
            return null;
        }

        if (value.ValueKind == JsonValueKind.String && Guid.TryParseExact(value.GetString(), "D", out var id))
        {
            return id;
        }

        errors.Add(new ImportIssue(row, "id", "El id debe ser un UUID válido."));
        return null;
    }

    private static string? ReadText(JsonElement element, string name, int row, List<ImportIssue> errors)
    {
        if (!element.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            return value.GetString();
        }

        errors.Add(new ImportIssue(row, name, $"«{name}» debe ser texto."));
        return null;
    }

    private static bool ReadBool(JsonElement element, string name, int row, List<ImportIssue> errors)
    {
        if (!element.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return false;
        }

        if (value.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            return value.GetBoolean();
        }

        errors.Add(new ImportIssue(row, name, $"«{name}» debe ser verdadero o falso."));
        return false;
    }

    /// <summary><c>createdAt</c> viene en milisegundos UTC. Ausente: se usa el momento de la importación, con aviso.</summary>
    private static DateTimeOffset? ReadCreatedAt(JsonElement element, int row, List<ImportIssue> errors, List<ImportIssue> warnings)
    {
        if (!element.TryGetProperty("createdAt", out var value) || value.ValueKind == JsonValueKind.Null)
        {
            warnings.Add(new ImportIssue(row, "createdAt", "Falta la fecha de creación: se usará el momento de la importación."));
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var milliseconds))
        {
            try
            {
                return DateTimeOffset.FromUnixTimeMilliseconds(milliseconds);
            }
            catch (ArgumentOutOfRangeException)
            {
                // Se informa abajo como valor fuera de rango.
            }
        }

        errors.Add(new ImportIssue(row, "createdAt", "«createdAt» debe ser un número de milisegundos válido."));
        return null;
    }
}
