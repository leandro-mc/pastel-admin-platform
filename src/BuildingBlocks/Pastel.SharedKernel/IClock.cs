namespace Pastel.SharedKernel;

/// <summary>Fuente de la hora actual. Se inyecta para que las reglas dependientes del tiempo sean comprobables.</summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
