namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Quién y cuándo creó y modificó un registro editable (fechas en UTC; personas por identificador, sin clave foránea a Identity).</summary>
internal interface IAudited
{
    DateTimeOffset CreatedAt { get; set; }

    Guid? CreatedBy { get; set; }

    DateTimeOffset UpdatedAt { get; set; }

    Guid? UpdatedBy { get; set; }

    /// <summary>Token de concurrencia (<c>xmin</c>): se compara al guardar para detectar ediciones simultáneas.</summary>
    uint Version { get; set; }
}
