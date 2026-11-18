using System.Globalization;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Persistence;

namespace Pastel.Modules.Cosecha.Common;

/// <summary>
/// Registro de cambios de cantidades y precios (antes/después, nota y quién). Las filas se agregan a la misma unidad de
/// trabajo que el cambio: se guardan juntas o no se guarda ninguna. Si el valor no cambió, no se registra nada.
/// </summary>
internal sealed class ChangeLog(CosechaDbContext db, Stamper stamper)
{
    public void Record(string entityType, Guid entityId, string field, object? before, object? after, string? note)
    {
        var oldText = Format(before);
        var newText = Format(after);
        if (string.Equals(oldText, newText, StringComparison.Ordinal))
        {
            return;
        }

        db.ChangeLog.Add(new ChangeLogEntry
        {
            EntityType = entityType,
            EntityId = entityId,
            Field = field,
            OldValue = oldText,
            NewValue = newText,
            Note = Texts.Clean(note),
            ChangedBy = stamper.UserId,
            ChangedByName = stamper.UserName is { } name ? Texts.Truncate(name, 100) : null,
            ChangedAt = stamper.Now,
        });
    }

    private static string? Format(object? value) => value switch
    {
        null => null,
        decimal number => number.ToString("0.##", CultureInfo.InvariantCulture),
        DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        _ => Texts.Truncate(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty, 200),
    };
}
