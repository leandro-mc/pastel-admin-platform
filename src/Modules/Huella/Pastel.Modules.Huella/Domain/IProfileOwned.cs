namespace Pastel.Modules.Huella.Domain;

/// <summary>Fila que pertenece a un perfil. Las consultas genéricas del banco filtran por <see cref="ProfileId"/>.</summary>
internal interface IProfileOwned
{
    Guid ProfileId { get; }
}
