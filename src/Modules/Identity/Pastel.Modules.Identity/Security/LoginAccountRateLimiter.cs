using System.Collections.Concurrent;
using Pastel.Platform.Observability;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Límite por identidad normalizada además del límite por IP de Platform. Las claves son HMAC opacos,
/// no correos en texto plano; las entradas inactivas se eliminan para que los intentos distribuidos no
/// hagan crecer indefinidamente el diccionario.
/// </summary>
internal sealed class LoginAccountRateLimiter(LogHasher logHasher, IClock clock)
{
    private static readonly TimeSpan WindowDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan EntryLifetime = TimeSpan.FromMinutes(30);
    private const int MaxAttemptsPerWindow = 10;
    private const int MaxTrackedAccounts = 10_000;
    private readonly ConcurrentDictionary<string, AttemptWindow> _windows = new(StringComparer.Ordinal);
    private int _operations;

    public bool TryAcquire(string normalizedEmail)
    {
        var now = clock.UtcNow;
        var key = logHasher.Hash(normalizedEmail);
        if (!_windows.TryGetValue(key, out var window))
        {
            if (_windows.Count >= MaxTrackedAccounts)
            {
                RemoveExpiredEntries(now);
                // Si todavía está lleno, rechaza nuevas identidades hasta que expiren entradas antiguas.
                // Las identidades ya rastreadas siguen teniendo su cuota normal.
                if (_windows.Count >= MaxTrackedAccounts)
                {
                    return false;
                }
            }

            window = _windows.GetOrAdd(key, _ => new AttemptWindow(now));
        }

        bool allowed;

        lock (window)
        {
            if (now < window.StartedAt || now - window.StartedAt >= WindowDuration)
            {
                window.StartedAt = now;
                window.Count = 0;
            }

            window.LastSeenAt = now;
            window.Count++;
            allowed = window.Count <= MaxAttemptsPerWindow;
        }

        if (Interlocked.Increment(ref _operations) % 128 == 0 || _windows.Count > MaxTrackedAccounts)
        {
            RemoveExpiredEntries(now);
        }

        return allowed;
    }

    private void RemoveExpiredEntries(DateTimeOffset now)
    {
        foreach (var entry in _windows)
        {
            bool expired;
            lock (entry.Value)
            {
                expired = now < entry.Value.LastSeenAt || now - entry.Value.LastSeenAt >= EntryLifetime;
            }

            if (expired)
            {
                _windows.TryRemove(entry.Key, out _);
            }
        }
    }

    private sealed class AttemptWindow(DateTimeOffset startedAt)
    {
        public DateTimeOffset StartedAt = startedAt;
        public DateTimeOffset LastSeenAt = startedAt;
        public int Count;
    }
}
