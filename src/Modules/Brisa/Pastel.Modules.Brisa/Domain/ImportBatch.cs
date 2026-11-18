namespace Pastel.Modules.Brisa.Domain;

/// <summary>Lote de importación de una persona; permite revertirlo (borrado lógico de lo creado con su identificador).</summary>
internal sealed class ImportBatch
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid OwnerId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public int TaskCount { get; set; }

    public DateTimeOffset? RevertedAt { get; set; }
}
