using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Security;
using Pastel.SharedKernel;
using Xunit;

namespace Pastel.Modules.Balance.Tests;

/// <summary>Ingreso por enlace y código: el código tiene 10 000 combinaciones, así que los intentos fallidos se limitan.</summary>
public sealed class JoinAttemptLimiterTests
{
    private sealed class FakeClock : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = new(2026, 11, 16, 12, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public void CincoFallosPorCuentaYEnlaceBloqueanQuinceMinutos_SoloEsaCuenta()
    {
        var clock = new FakeClock();
        var limiter = new JoinAttemptLimiter(clock);
        var account = Guid.NewGuid();
        for (var i = 0; i < JoinAttemptLimiter.LinkLimit - 1; i++)
        {
            limiter.RegisterFailure(account, "token-a");
            Assert.Null(limiter.RetryAfterSeconds(account, "token-a"));
        }

        limiter.RegisterFailure(account, "token-a");
        Assert.Equal(15 * 60, limiter.RetryAfterSeconds(account, "token-a"));
        Assert.Null(limiter.RetryAfterSeconds(Guid.NewGuid(), "token-a"));

        clock.UtcNow += TimeSpan.FromMinutes(15);
        Assert.Null(limiter.RetryAfterSeconds(account, "token-a"));
    }

    [Fact]
    public void UnIngresoCorrectoReiniciaElContador()
    {
        var limiter = new JoinAttemptLimiter(new FakeClock());
        var account = Guid.NewGuid();
        for (var i = 0; i < JoinAttemptLimiter.LinkLimit - 1; i++)
        {
            limiter.RegisterFailure(account, "t");
        }

        limiter.RegisterSuccess(account, "t");
        limiter.RegisterFailure(account, "t");
        Assert.Null(limiter.RetryAfterSeconds(account, "t"));
    }

    [Fact]
    public void BarrerMuchosEnlacesTambienSeFrena()
    {
        var limiter = new JoinAttemptLimiter(new FakeClock());
        var account = Guid.NewGuid();
        for (var i = 0; i < JoinAttemptLimiter.AccountLimit; i++)
        {
            limiter.RegisterFailure(account, "token-" + i);
        }

        Assert.NotNull(limiter.RetryAfterSeconds(account, "otro-token-nuevo"));
    }

    [Fact]
    public void LasCredencialesSonAleatoriasYConFormatoValido()
    {
        var tokens = Enumerable.Range(0, 200).Select(_ => Invitation.NewToken()).ToHashSet();
        Assert.Equal(200, tokens.Count);
        Assert.All(tokens, t => Assert.True(t.Length >= 32 && t.Length <= Invitation.MaxTokenLength));
        Assert.All(Enumerable.Range(0, 200).Select(_ => Invitation.NewCode()), c => Assert.True(Invitation.IsCodeFormat(c)));
        Assert.True(Invitation.FixedTimeEquals("0042", "0042"));
        Assert.False(Invitation.FixedTimeEquals("0042", "0043"));
        Assert.False(Invitation.FixedTimeEquals("0042", null));
    }
}
