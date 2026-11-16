namespace Pastel.Modules.Balance.Domain;

/// <summary>Moneda del catálogo (<c>balance.currencies</c>). Datos de referencia sembrados por migración; ver <see cref="CurrencyCatalog"/>.</summary>
internal sealed class CurrencyDefinition
{
    public required string Code { get; set; }

    public short NumericCode { get; set; }

    public required string Name { get; set; }

    public required string Symbol { get; set; }

    public short Decimals { get; set; }

    public short SortOrder { get; set; }
}

/// <summary>Grupo de gasto compartido (<c>balance.groups</c>). Sin secretos: el enlace y el código viven en <see cref="JoinCredential"/>.</summary>
internal sealed class BalanceGroup
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public required string Name { get; set; }

    public string? Description { get; set; }

    public required string CurrencyCode { get; set; }

    /// <summary>Zona IANA del grupo (D9). Solo afecta a «hoy» y a la fecha de cierre, nunca a la fecha de los gastos.</summary>
    public required string TimeZone { get; set; }

    /// <summary>Fecha de calendario de inicio. No es editable.</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>Instante UTC del cierre; <c>null</c> mientras el grupo está abierto.</summary>
    public DateTimeOffset? ClosedAt { get; set; }

    /// <summary>Último número de alta entregado: un contador que nunca retrocede, para que el orden de alta sobreviva a las salidas.</summary>
    public int ParticipantSeq { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Cuenta de Identity que creó el grupo (sin clave foránea: esquemas separados).</summary>
    public Guid CreatedBy { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Enlace y código de ingreso de un grupo, 1:1 y aparte del grupo para que ningún mapeo los exponga por accidente.</summary>
internal sealed class JoinCredential
{
    public Guid GroupId { get; set; }

    public required string Token { get; set; }

    public required string Code { get; set; }

    public DateTimeOffset RotatedAt { get; set; }

    public Guid RotatedBy { get; set; }
}

/// <summary>
/// Persona dentro de un grupo. Quien sale o es quitado se elimina (nunca tuvo gastos); el historial queda en <see cref="GroupEvent"/>.
/// Si vuelve, recibe un número de alta nuevo al final del orden.
/// </summary>
internal sealed class Participant
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid GroupId { get; set; }

    /// <summary>Cuenta de Identity (sin clave foránea: esquemas separados).</summary>
    public Guid AccountId { get; set; }

    /// <summary>Nombre visible dentro del grupo, tomado de la cuenta al ingresar.</summary>
    public required string DisplayName { get; set; }

    /// <summary>Rol dentro del grupo: <see cref="ParticipantRoles"/>. No es un rol de plataforma.</summary>
    public required string Role { get; set; }

    /// <summary>Número de alta, desde 1. Define el orden de alta que usan el reparto y la liquidación.</summary>
    public int JoinOrder { get; set; }

    public DateTimeOffset JoinedAt { get; set; }
}

/// <summary>Gasto de un grupo, en <c>numeric(18,2)</c>. La moneda es la del grupo; la fecha es de calendario.</summary>
internal sealed class Expense
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid GroupId { get; set; }

    public Guid PayerParticipantId { get; set; }

    public required string Description { get; set; }

    public decimal Amount { get; set; }

    public DateOnly ExpenseDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid CreatedBy { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public Guid UpdatedBy { get; set; }

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL): dos ediciones simultáneas no se pisan.</summary>
    public uint Version { get; set; }
}

/// <summary>Hecho del historial visible de un grupo («quién hizo qué y cuándo»). Se escribe en la misma transacción que el cambio.</summary>
internal sealed class GroupEvent
{
    public long Id { get; set; }

    public Guid GroupId { get; set; }

    public DateTimeOffset OccurredAt { get; set; }

    public Guid ActorAccountId { get; set; }

    public required string ActorName { get; set; }

    /// <summary>Tipo estable del hecho, p. ej. <c>expense.created</c> (ver <see cref="GroupEventKinds"/>).</summary>
    public required string Kind { get; set; }

    /// <summary>Datos mínimos del hecho (antes y después cuando aplica), como JSON.</summary>
    public string? DetailsJson { get; set; }
}

/// <summary>Valores del rol dentro del grupo tal como se guardan (la base los restringe con un <c>CHECK</c>).</summary>
internal static class ParticipantRoles
{
    public const string Admin = "admin";
    public const string Member = "member";

    public static ParticipantRole ToRole(string value) => value == Admin ? ParticipantRole.Admin : ParticipantRole.Member;

    public static string ToValue(ParticipantRole role) => role == ParticipantRole.Admin ? Admin : Member;
}

/// <summary>Tipos de hecho del historial del grupo.</summary>
internal static class GroupEventKinds
{
    public const string GroupCreated = "group.created";
    public const string GroupUpdated = "group.updated";
    public const string CurrencyChanged = "group.currency_changed";
    public const string GroupClosed = "group.closed";
    public const string GroupReopened = "group.reopened";
    public const string InvitationRegenerated = "invitation.regenerated";
    public const string ParticipantJoined = "participant.joined";
    public const string ParticipantLeft = "participant.left";
    public const string ParticipantRemoved = "participant.removed";
    public const string RoleChanged = "participant.role_changed";
    public const string ExpenseCreated = "expense.created";
    public const string ExpenseUpdated = "expense.updated";
    public const string ExpenseDeleted = "expense.deleted";
}
