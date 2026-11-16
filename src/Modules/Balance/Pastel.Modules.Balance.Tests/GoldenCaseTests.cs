using Pastel.Modules.Balance.Domain;
using Xunit;

namespace Pastel.Modules.Balance.Tests;

/// <summary>
/// Casos dorados de Balance (<c>docs/requirements/balance/INVENTARIO-BALANCE.md</c> §9.3). Los resultados esperados vienen de la
/// especificación aprobada (D1 y D2), no del código, y coinciden con <c>prototype/money.test.js</c>.
/// </summary>
public sealed class GoldenCaseTests
{
    private static readonly string[] Names =
    [
        "Ana", "Beto", "Carla", "Diego", "Elena", "Fabio", "Gina", "Hugo", "Irene", "Jorge",
        "Karla", "Luis", "Marta", "Nora", "Oscar", "Paula", "Raul", "Sara", "Tomas", "Ursula",
    ];

    private static Guid Id(int index) => new(index + 1, 0, 0, new byte[8]);

    private sealed record Outcome(string Total, string[] Shares, string[] Balances, string[] Transfers);

    /// <summary>n participantes en orden de alta y gastos (índice del pagador, monto); devuelve todo en texto legible.</summary>
    private static Outcome Run(int n, (int Payer, string Amount)[] spends, string code = "CRC")
    {
        var currency = CurrencyCatalog.Get(code);
        var ids = Enumerable.Range(0, n).Select(Id).ToArray();
        var sheet = ShareCalculator.Compute(ids, spends.Select(s => new PayerExpense(ids[s.Payer], Money.Parse(s.Amount, currency).Value)));
        var balances = sheet.Rows.ToDictionary(r => r.ParticipantId, r => r.Balance);
        string Name(Guid id) => Names[Array.IndexOf(ids, id)];
        string F(Int128 u) => Money.Format(u, currency);
        return new Outcome(
            F(sheet.Total),
            [.. sheet.Rows.Select(r => $"{Name(r.ParticipantId)} {F(r.Share)}")],
            [.. sheet.Rows.Select(r => $"{Name(r.ParticipantId)} {(r.Balance > 0 ? "+" : string.Empty)}{F(r.Balance)}")],
            [.. SettlementCalculator.Calculate(ids, balances).Select(t => $"{Name(t.From)}→{Name(t.To)} {F(t.Units)}")]);
    }

    [Fact]
    public void G01_DosPersonasUnGasto()
    {
        var r = Run(2, [(0, "100.00")]);
        Assert.Equal(["Ana +50.00", "Beto -50.00"], r.Balances);
        Assert.Equal(["Beto→Ana 50.00"], r.Transfers);
    }

    [Fact]
    public void G02_CienEntreTres_ElSobranteVaAlPrimeroPorOrdenDeAlta()
    {
        var r = Run(3, [(0, "100.00")]);
        Assert.Equal(["Ana 33.34", "Beto 33.33", "Carla 33.33"], r.Shares);
        Assert.Equal(["Ana +66.66", "Beto -33.33", "Carla -33.33"], r.Balances);
        Assert.Equal(["Beto→Ana 33.33", "Carla→Ana 33.33"], r.Transfers);
    }

    [Fact]
    public void G03_DoscientosEntreTres()
    {
        var r = Run(3, [(0, "200.00")]);
        Assert.Equal(["Ana 66.67", "Beto 66.67", "Carla 66.66"], r.Shares);
        Assert.Equal(["Beto→Ana 66.67", "Carla→Ana 66.66"], r.Transfers);
    }

    [Fact]
    public void G04_DosPaganEntreTres()
    {
        var r = Run(3, [(0, "100.00"), (1, "100.00")]);
        Assert.Equal(["Ana +33.33", "Beto +33.33", "Carla -66.66"], r.Balances);
        Assert.Equal(["Carla→Ana 33.33", "Carla→Beto 33.33"], r.Transfers);
    }

    [Fact]
    public void G05_TresDeudoresIgualesSeOrdenanPorAlta() =>
        Assert.Equal(["Beto→Ana 100.00", "Carla→Ana 100.00", "Diego→Ana 100.00"], Run(4, [(0, "400.00")]).Transfers);

    [Fact]
    public void G06_G07_G08_SinSaldosNiLiquidacion()
    {
        Assert.Empty(Run(4, [(0, "50.00"), (1, "50.00"), (2, "50.00"), (3, "50.00")]).Transfers);
        var solo = Run(1, [(0, "75.00")]);
        Assert.Equal(["Ana 0.00"], solo.Balances);
        Assert.Empty(solo.Transfers);
        var empty = Run(3, []);
        Assert.Equal("0.00", empty.Total);
        Assert.Empty(empty.Transfers);
    }

    [Fact]
    public void G09_UnaPersonaNuncaPago()
    {
        var r = Run(3, [(0, "90.00"), (1, "30.00")]);
        Assert.Equal(["Ana +50.00", "Beto -10.00", "Carla -40.00"], r.Balances);
        Assert.Equal(["Carla→Ana 40.00", "Beto→Ana 10.00"], r.Transfers);
    }

    [Fact]
    public void G10_G11_ElCentavoSobranteSeAsignaYNoQuedaResiduo()
    {
        var half = Run(2, [(0, "0.05")]);
        Assert.Equal(["Ana 0.03", "Beto 0.02"], half.Shares);
        Assert.Equal(["Beto→Ana 0.02"], half.Transfers);
        var cent = Run(3, [(0, "0.01")]);
        Assert.Equal(["Ana 0.01", "Beto 0.00", "Carla 0.00"], cent.Shares);
        Assert.Equal(["Ana 0.00", "Beto 0.00", "Carla 0.00"], cent.Balances);
        Assert.Empty(cent.Transfers);
    }

    [Fact]
    public void G12_MilEntreSiete()
    {
        var r = Run(7, [(0, "1000.00")]);
        Assert.Equal(["Ana 142.86", "Beto 142.86", "Carla 142.86", "Diego 142.86", "Elena 142.86", "Fabio 142.85", "Gina 142.85"], r.Shares);
        Assert.Equal("Ana +857.14", r.Balances[0]);
        Assert.Equal(["Beto→Ana 142.86", "Carla→Ana 142.86", "Diego→Ana 142.86", "Elena→Ana 142.86", "Fabio→Ana 142.85", "Gina→Ana 142.85"], r.Transfers);
    }

    [Fact]
    public void G13_MontoMuyGrandeSinPerdida()
    {
        var r = Run(2, [(0, "9999999999.99")]);
        Assert.Equal(["Ana 5000000000.00", "Beto 4999999999.99"], r.Shares);
        Assert.Equal(["Ana +4999999999.99", "Beto -4999999999.99"], r.Balances);
    }

    [Fact]
    public void G14_G15_G18_EditarPagadorMontoOAgregarPersonaRecalcula()
    {
        Assert.Equal(["Ana +100.00", "Beto -50.00", "Carla -50.00"], Run(3, [(0, "150.00")]).Balances);
        Assert.Equal(["Ana→Beto 30.00", "Carla→Beto 30.00"], Run(3, [(1, "90.00")]).Transfers);
        Assert.Equal(["Ana +50.00", "Beto -50.00"], Run(2, [(0, "100.00")]).Balances);
        Assert.Equal(["Ana +66.66", "Beto -33.33", "Carla -33.33"], Run(3, [(0, "100.00")]).Balances);
    }

    [Fact]
    public void G23_CincoPaganMontosDistintos()
    {
        var r = Run(5, [(0, "250.00"), (1, "125.50"), (2, "80.25"), (3, "0.01")]);
        Assert.Equal("455.76", r.Total);
        Assert.Equal(["Ana 91.16", "Beto 91.15", "Carla 91.15", "Diego 91.15", "Elena 91.15"], r.Shares);
        Assert.Equal(["Ana +158.84", "Beto +34.35", "Carla -10.90", "Diego -91.14", "Elena -91.15"], r.Balances);
        Assert.Equal(["Elena→Ana 91.15", "Diego→Ana 67.69", "Diego→Beto 23.45", "Carla→Beto 10.90"], r.Transfers);
    }

    [Fact]
    public void G24_G25_TrecePersonasUnPagador_ElOrdenSaleDelAltaNoDelId()
    {
        var r = Run(13, [(0, "130.00")]);
        Assert.Equal(Names.Skip(1).Take(12).Select(n => n + "→Ana 10.00"), r.Transfers);

        var high = Enumerable.Range(0, 13).Select(i => new Guid(100 + i, 0, 0, new byte[8])).ToArray();
        var sheet = ShareCalculator.Compute(high, [new PayerExpense(high[0], 13000)]);
        var transfers = SettlementCalculator.Calculate(high, sheet.Rows.ToDictionary(x => x.ParticipantId, x => x.Balance));
        Assert.Equal(high.Skip(1), transfers.Select(t => t.From));
    }

    [Fact]
    public void G26_VeinteIntegrantes_LiquidacionCompletaDeDiecinueveCobros()
    {
        var r = Run(20, [(0, "15234.50"), (4, "8900.00"), (6, "1200.75"), (11, "43000.10"), (19, "310.00")]);
        Assert.Equal("68645.35", r.Total);
        Assert.Equal(15, r.Shares.Count(s => s.EndsWith(" 3432.27", StringComparison.Ordinal)));
        Assert.Equal(5, r.Shares.Count(s => s.EndsWith(" 3432.26", StringComparison.Ordinal)));
        Assert.Equal(
            [
                "Beto→Luis 3432.27", "Carla→Luis 3432.27", "Diego→Luis 3432.27", "Fabio→Luis 3432.27", "Hugo→Luis 3432.27",
                "Irene→Luis 3432.27", "Jorge→Luis 3432.27", "Karla→Luis 3432.27", "Marta→Luis 3432.27", "Nora→Ana 3432.27",
                "Oscar→Luis 3432.27", "Paula→Ana 3432.26", "Raul→Elena 3432.26", "Sara→Luis 3432.26", "Tomas→Ana 3432.26",
                "Ursula→Elena 2035.47", "Gina→Luis 1812.87", "Ursula→Ana 1086.79", "Gina→Ana 418.65",
            ],
            r.Transfers);
    }

    [Fact]
    public void G27_G29_MuchosGastosPequenosSumanExacto()
    {
        var small = Run(3, [.. Enumerable.Repeat((0, "0.10"), 10)]);
        Assert.Equal(["Ana 0.34", "Beto 0.33", "Carla 0.33"], small.Shares);
        var thirds = Run(3, [(0, "33.34"), (1, "33.34"), (2, "33.34")]);
        Assert.Equal(["Ana 33.34", "Beto 33.34", "Carla 33.34"], thirds.Shares);
        Assert.Empty(thirds.Transfers);
    }

    [Fact]
    public void G30_G31_G32_LiquidacionDirecta_ExactaDeterministaYNoMinima()
    {
        var six = Enumerable.Range(0, 6).Select(Id).ToArray();
        var b = new Dictionary<Guid, Int128> { [six[0]] = -5000, [six[1]] = -3000, [six[2]] = -2000, [six[3]] = 4000, [six[4]] = 3500, [six[5]] = 2500 };
        var tr = SettlementCalculator.Calculate(six, b);
        Assert.True(tr.Count <= 5);
        foreach (var id in six)
        {
            Assert.Equal(-b[id], tr.Where(t => t.From == id).Aggregate((Int128)0, (a, t) => a + t.Units) - tr.Where(t => t.To == id).Aggregate((Int128)0, (a, t) => a + t.Units));
        }

        var four = Enumerable.Range(0, 4).Select(Id).ToArray();
        var pairs = SettlementCalculator.Calculate(four, new Dictionary<Guid, Int128> { [four[0]] = -5000, [four[1]] = -3000, [four[2]] = 5000, [four[3]] = 3000 });
        Assert.Equal([(0, 2, 5000), (1, 3, 3000)], pairs.Select(t => (Array.IndexOf(four, t.From), Array.IndexOf(four, t.To), (int)t.Units)));

        var five = Enumerable.Range(0, 5).Select(Id).ToArray();
        var notMinimal = SettlementCalculator.Calculate(five, new Dictionary<Guid, Int128> { [five[0]] = -300, [five[1]] = -200, [five[2]] = -400, [five[3]] = 400, [five[4]] = 500 });
        Assert.Equal(
            [(2, 4, 400), (0, 3, 300), (1, 3, 100), (1, 4, 100)],
            notMinimal.Select(t => (Array.IndexOf(five, t.From), Array.IndexOf(five, t.To), (int)t.Units)));
    }

    [Fact]
    public void G33_SaldosQueNoSumanCeroFallanConErrorExplicito()
    {
        var two = new[] { Id(0), Id(1) };
        Assert.Throws<BalanceInvariantException>(() =>
            SettlementCalculator.Calculate(two, new Dictionary<Guid, Int128> { [two[0]] = -300, [two[1]] = 299 }));
    }

    [Fact]
    public void G35_G36_G37_Yenes_SinDecimales()
    {
        var a = Run(3, [(0, "100")], "JPY");
        Assert.Equal(["Ana 34", "Beto 33", "Carla 33"], a.Shares);
        Assert.Equal(["Beto→Ana 33", "Carla→Ana 33"], a.Transfers);
        Assert.Equal(
            ["Beto→Ana 143", "Carla→Ana 143", "Diego→Ana 143", "Elena→Ana 143", "Fabio→Ana 143", "Gina→Ana 142"],
            Run(7, [(0, "1000")], "JPY").Transfers);
        var c = Run(4, [(0, "1001"), (1, "2")], "JPY");
        Assert.Equal(["Ana +750", "Beto -249", "Carla -251", "Diego -250"], c.Balances);
        Assert.Equal(["Carla→Ana 251", "Diego→Ana 250", "Beto→Ana 249"], c.Transfers);
    }

    [Fact]
    public void G39_G40_G41_CambioDeMonedaSinConvertir()
    {
        Assert.Equal(Run(3, [(0, "100.00")], "EUR").Transfers, Run(3, [(0, "100.00")], "USD").Transfers);
        var usd = CurrencyCatalog.Get("USD");
        var jpy = CurrencyCatalog.Get("JPY");
        Assert.True(Money.TryFromDecimal(100.00m, jpy, out _));
        Assert.False(Money.TryFromDecimal(10.50m, jpy, out _));
        Assert.True(Money.TryFromDecimal(10.50m, usd, out _));
    }

    [Theory]
    [InlineData("12.50", "12.50")]
    [InlineData("0.01", "0.01")]
    [InlineData("1500", "1500.00")]
    [InlineData("9999999999999999.99", "9999999999999999.99")]
    public void D4_MontosValidos(string input, string canonical) =>
        Assert.Equal(canonical, Money.Format(Money.Parse(input, CurrencyCatalog.Get("CRC")).Value, CurrencyCatalog.Get("CRC")));

    [Theory]
    [InlineData("12.505", "balance.amount.too_many_decimals")]
    [InlineData("10.005", "balance.amount.too_many_decimals")]
    [InlineData("0", "balance.amount.not_positive")]
    [InlineData("-5", "balance.amount.not_positive")]
    [InlineData("", "balance.amount.required")]
    [InlineData("abc", "balance.amount.invalid")]
    [InlineData("1,234.50", "balance.amount.invalid")]
    [InlineData("10000000000000000", "balance.amount.too_large")]
    public void D4_G28_MontosRechazadosNuncaSeRedondean(string input, string code)
    {
        var result = Money.Parse(input, CurrencyCatalog.Get("CRC"));
        Assert.True(result.IsFailure);
        Assert.Equal(code, result.Error.Code);
    }

    [Fact]
    public void G38_YenesNoAdmitenDecimales()
    {
        var result = Money.Parse("100.50", CurrencyCatalog.Get("JPY"));
        Assert.Equal("balance.amount.too_many_decimals", result.Error.Code);
        Assert.Contains("no admite decimales", result.Error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Catalogo_CuarentaMonedasUnicas_DecimalesCeroSoloEnCuatro()
    {
        Assert.Equal(40, CurrencyCatalog.All.Count);
        Assert.Equal(40, CurrencyCatalog.All.Select(c => c.Code).Distinct().Count());
        Assert.Equal(["CLP", "JPY", "KRW", "PYG"], CurrencyCatalog.All.Where(c => c.Decimals == 0).Select(c => c.Code).Order().ToArray());
    }

    [Theory]
    [InlineData("CRC", 42)]
    [InlineData("JPY", 7)]
    public void Propiedades_EscenariosAleatoriosConSemillaFija(string code, uint seed)
    {
        var currency = CurrencyCatalog.Get(code);
        var s = seed;
        double Next() => (s = unchecked((s * 1664525) + 1013904223)) / 4294967296.0;
        for (var k = 0; k < 3000; k++)
        {
            var n = 1 + (int)(Next() * 25);
            var ids = Enumerable.Range(0, n).Select(Id).ToArray();
            var expenses = Enumerable.Range(0, (int)(Next() * 12)).Select(_ =>
            {
                var units = 1 + (long)(Next() * 5e7);
                units = currency.Decimals == 0 ? Math.Max(1, units / 100) : units;
                return new PayerExpense(ids[(int)(Next() * n)], units);
            }).ToArray();

            var sheet = ShareCalculator.Compute(ids, expenses);
            Assert.Equal(sheet.Total, sheet.Rows.Aggregate((Int128)0, (a, r) => a + r.Share));
            Assert.Equal(0, sheet.Rows.Aggregate((Int128)0, (a, r) => a + r.Balance));
            Assert.True(sheet.Rows.Max(r => r.Share) - sheet.Rows.Min(r => r.Share) <= 1);

            var balances = sheet.Rows.ToDictionary(r => r.ParticipantId, r => r.Balance);
            var transfers = SettlementCalculator.Calculate(ids, balances);
            var debtors = balances.Count(b => b.Value < 0);
            var creditors = balances.Count(b => b.Value > 0);
            Assert.True(transfers.Count <= Math.Max(0, debtors + creditors - 1));

            var shuffled = balances.OrderBy(_ => Next()).ToDictionary(b => b.Key, b => b.Value);
            Assert.Equal(transfers, SettlementCalculator.Calculate(ids, shuffled));
        }
    }
}
