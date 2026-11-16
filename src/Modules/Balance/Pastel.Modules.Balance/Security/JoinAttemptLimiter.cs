using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Security;

/// <summary>
/// Límite de intentos del ingreso por enlace y código (el código tiene solo 10 000 combinaciones): <b>5 fallos por cuenta y enlace
/// bloquean 15 minutos</b>; un ingreso correcto reinicia el contador. Además, 20 fallos por cuenta (sin importar el enlace)
/// frenan el barrido de muchos enlaces. Las claves son hashes: ni el token ni el código quedan en memoria legibles ni en logs.
/// En memoria, como el limitador de acceso de Identity (un solo nodo; ver <c>docs/ARCHITECTURE.md</c> §5).
/// </summary>
internal sealed class JoinAttemptLimiter(IClock clock)
{
    public const int LinkLimit = 5;
    public const int AccountLimit = 20;
    public static readonly TimeSpan Lock = TimeSpan.FromMinutes(15);
    private const int MaxTracked = 20_000;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private readonly ConcurrentDictionary<string, State> _states = new(StringComparer.Ordinal);

    /// <summary>Segundos de espera restantes si la cuenta está bloqueada para ese enlace; <c>null</c> si puede intentar.</summary>
    public int? RetryAfterSeconds(Guid accountId, string? token)
    {
        var now = clock.UtcNow;
        var wait = Remaining(Key(accountId, token), now);
        var accountWait = Remaining(Key(accountId, null), now);
        var longest = Math.Max(wait, accountWait);
        return longest > 0 ? longest : null;
    }

    public void RegisterFailure(Guid accountId, string? token)
    {
        var now = clock.UtcNow;
        Fail(Key(accountId, token), LinkLimit, now);
        Fail(Key(accountId, null), AccountLimit, now);
        if (_states.Count > MaxTracked)
        {
            foreach (var entry in _states.Where(e => Expired(e.Value, now)).ToArray())
            {
                _states.TryRemove(entry.Key, out _);
            }
        }
    }

    public void RegisterSuccess(Guid accountId, string? token) => _states.TryRemove(Key(accountId, token), out _);

    private int Remaining(string key, DateTimeOffset now)
    {
        if (!_states.TryGetValue(key, out var state))
        {
            return 0;
        }

        lock (state)
        {
            return state.LockedUntil > now ? (int)Math.Ceiling((state.LockedUntil - now).TotalSeconds) : 0;
        }
    }

    private void Fail(string key, int limit, DateTimeOffset now)
    {
        var state = _states.GetOrAdd(key, _ => new State(now));
        lock (state)
        {
            if (now - state.WindowStart >= Window || now < state.WindowStart)
            {
                state.WindowStart = now;
                state.Failures = 0;
            }

            state.Failures++;
            if (state.Failures >= limit)
            {
                state.LockedUntil = now + Lock;
                state.Failures = 0;
                state.WindowStart = now;
            }
        }
    }

    private static bool Expired(State state, DateTimeOffset now)
    {
        lock (state)
        {
            return state.LockedUntil <= now && now - state.WindowStart >= Window;
        }
    }

    private static string Key(Guid accountId, string? token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(accountId.ToString("N") + "|" + (token ?? "*")));
        return Convert.ToHexString(bytes);
    }

    private sealed class State(DateTimeOffset start)
    {
        public DateTimeOffset WindowStart = start;
        public DateTimeOffset LockedUntil = DateTimeOffset.MinValue;
        public int Failures;
    }
}
