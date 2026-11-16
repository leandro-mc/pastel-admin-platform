namespace Pastel.Modules.Balance.Domain;

/// <summary>
/// Un invariante del cálculo se rompió (partes que no suman el total, saldos que no suman cero, saldo sin liquidar).
/// Es un defecto, no un fallo del usuario: se lanza para que nunca se ignore en silencio (inventario §12.1).
/// </summary>
internal sealed class BalanceInvariantException(string message) : InvalidOperationException(message);
