using Pastel.Modules.Brisa.Domain;
using Pastel.SharedKernel;
using Xunit;

namespace Pastel.Modules.Brisa.Tests;

/// <summary>
/// Pruebas esenciales de Etapa 1 (ficha §6, pruebas 1 y 5). Los resultados esperados salen del inventario
/// (<c>docs/requirements/brisa/INVENTARIO-BRISA.md</c> §13.1–§13.4 y §13.11), no del código. «Hoy» = 2026-10-18 salvo indicación.
/// </summary>
public sealed class TaskRulesTests
{
    private static readonly TimeZoneInfo CostaRica = TimeZoneInfo.FindSystemTimeZoneById("America/Costa_Rica");
    private static readonly DateOnly Today = new(2026, 10, 18);

    private static DateOnly D(int day) => new(2026, 10, day);

    private static TaskDates Open(int scheduled, int? due = null) =>
        new(D(scheduled), due is null ? null : D(due.Value), false, null);

    private static TaskDates Done(int scheduled, int? due, string? completedAtUtc) =>
        new(D(scheduled), due is null ? null : D(due.Value), true, completedAtUtc is null ? null : DateTimeOffset.Parse(completedAtUtc, System.Globalization.CultureInfo.InvariantCulture));

    private static DateOnly Effective(TaskDates task, int today) =>
        TaskRules.EffectiveDate(task, D(today), CostaRica);

    // ── Vectores V1–V10 (§13.1) ──
    [Theory]
    [InlineData(15, null, false, null, 15, true)] // V1
    [InlineData(15, 20, false, null, 18, false)] // V2
    [InlineData(15, 18, false, null, 18, false)] // V3
    [InlineData(15, 17, false, null, 17, true)] // V4
    [InlineData(20, 25, false, null, 20, false)] // V5
    [InlineData(20, 17, false, null, 20, true)] // V6 (dato inconsistente: se devuelve sin error)
    [InlineData(15, 20, true, "2026-10-18T15:00:00Z", 18, false)] // V7
    [InlineData(15, 20, true, "2026-10-16T15:00:00Z", 16, false)] // V8
    [InlineData(15, 20, true, null, 15, false)] // V9
    [InlineData(15, null, true, "2026-10-18T15:00:00Z", 15, false)] // V10
    public void Vectors_give_the_effective_day_and_overdue_flag(
        int scheduled, int? due, bool completed, string? completedAtUtc, int expectedDay, bool expectedOverdue)
    {
        var task = completed ? Done(scheduled, due, completedAtUtc) : Open(scheduled, due);

        Assert.Equal(D(expectedDay), TaskRules.EffectiveDate(task, Today, CostaRica));
        Assert.Equal(expectedOverdue, TaskRules.IsOverdue(task, Today, CostaRica));
    }

    // ── Criterios de aceptación (§13.1) ──
    [Fact]
    public void Ac1_Ac2_an_open_task_advances_each_day_until_its_deadline()
    {
        var task = Open(15, 20);

        Assert.Equal(
            new[] { 15, 16, 17, 18, 19, 20 }.Select(D),
            new[] { 15, 16, 17, 18, 19, 20 }.Select(today => Effective(task, today)));
    }

    [Fact]
    public void Ac3_the_night_after_the_deadline_it_stops_moving_and_is_overdue()
    {
        var task = Open(15, 20);

        Assert.Equal(D(20), Effective(task, 21));
        Assert.Equal(D(20), Effective(task, 25));
        Assert.True(TaskRules.IsOverdue(task, D(21), CostaRica));
    }

    [Fact]
    public void Ac4_without_deadline_it_never_moves()
    {
        var task = Open(15);

        Assert.All(new[] { 15, 18, 25 }, today => Assert.Equal(D(15), Effective(task, today)));
    }

    [Fact]
    public void Ac5_is_never_lost_in_a_past_day_while_its_deadline_is_today_or_later()
    {
        for (var scheduled = 1; scheduled <= 15; scheduled++)
        {
            for (var due = scheduled; due <= 30; due++)
            {
                for (var today = 1; today <= 30; today++)
                {
                    var effective = Effective(Open(scheduled, due), today);

                    if (due >= today)
                    {
                        Assert.True(effective >= D(today) || scheduled >= today, $"P{scheduled} L{due} hoy {today}");
                    }
                }
            }
        }
    }

    [Fact]
    public void Ac6_after_days_away_the_task_shows_today_not_the_days_missed()
    {
        Assert.Equal(D(19), Effective(Open(15, 20), 19));
    }

    [Fact]
    public void Ac7_a_completed_task_stays_on_the_day_it_was_completed()
    {
        var task = Done(15, 20, "2026-10-18T20:00:00Z");

        Assert.All(new[] { 18, 19, 21 }, today => Assert.Equal(D(18), Effective(task, today)));
    }

    // ── Casos de paridad y nuevos (§11, §13.10, §13.11) ──
    [Fact]
    public void C03_open_without_deadline_in_the_past_is_overdue_and_not_rescheduled()
    {
        Assert.True(TaskRules.IsOverdue(Open(17), Today, CostaRica));
        Assert.Equal(D(17), Effective(Open(17), 18));
    }

    [Fact]
    public void C04_today_is_not_overdue_with_or_without_deadline()
    {
        Assert.False(TaskRules.IsOverdue(Open(18), Today, CostaRica));
        Assert.False(TaskRules.IsOverdue(Open(18, 18), Today, CostaRica));
    }

    [Fact]
    public void C07_deadline_today_then_overdue_on_the_deadline_day_the_next_day()
    {
        var task = Open(16, 18);

        Assert.Equal(D(18), Effective(task, 18));
        Assert.Equal(D(18), Effective(task, 19));
        Assert.True(TaskRules.IsOverdue(task, D(19), CostaRica));
    }

    [Fact]
    public void C10_reopening_a_done_task_puts_it_in_today_immediately()
    {
        Assert.Equal(D(18), Effective(Open(14, 25), 18));
        Assert.True(TaskRules.IsOverdue(Open(14), Today, CostaRica));
    }

    [Fact]
    public void N07_changing_the_day_to_the_future_holds_it_until_that_day_then_it_moves_again()
    {
        var task = Open(22, 25);

        Assert.Equal(D(22), Effective(task, 21));
        Assert.Equal(D(22), Effective(task, 22));
        Assert.Equal(D(23), Effective(task, 23));
    }

    [Fact]
    public void N09_N10_overdue_with_deadline_is_rescued_by_the_deadline_without_deadline_by_the_day()
    {
        Assert.True(TaskRules.IsOverdue(Open(15, 17), Today, CostaRica));
        Assert.False(TaskRules.IsOverdue(Open(15, 25), Today, CostaRica));
        Assert.False(TaskRules.IsOverdue(Open(18), Today, CostaRica));
    }

    [Fact]
    public void The_derivation_is_deterministic()
    {
        var task = Open(15, 20);

        Assert.Equal(Effective(task, 18), Effective(task, 18));
        Assert.Equal(D(15), task.Scheduled);
    }

    // ── Zona horaria (§13.3, ficha §6 prueba 5) ──
    [Fact]
    public void C26_N19_today_follows_the_person_zone_at_the_costa_rica_midnight_boundary()
    {
        var at2330 = DateTimeOffset.Parse("2026-10-19T05:30:00Z", System.Globalization.CultureInfo.InvariantCulture);
        var newYork = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

        Assert.Equal(new DateOnly(2026, 10, 18), TaskRules.LocalDate(at2330, CostaRica));
        Assert.Equal(new DateOnly(2026, 10, 19), TaskRules.LocalDate(at2330, newYork));
        Assert.Equal(new DateOnly(2026, 10, 19), TaskRules.LocalDate(at2330, TimeZoneInfo.Utc));
    }

    [Fact]
    public void A_task_of_day_18_stays_in_today_at_2330_local_and_leaves_only_at_midnight_local()
    {
        var task = Open(18);
        var lastMinute = DateTimeOffset.Parse("2026-10-19T05:59:00Z", System.Globalization.CultureInfo.InvariantCulture);
        var midnight = DateTimeOffset.Parse("2026-10-19T06:00:00Z", System.Globalization.CultureInfo.InvariantCulture);

        Assert.False(TaskRules.IsOverdue(task, TaskRules.LocalDate(lastMinute, CostaRica), CostaRica));
        Assert.True(TaskRules.IsOverdue(task, TaskRules.LocalDate(midnight, CostaRica), CostaRica));
    }

    [Fact]
    public void A_zone_with_daylight_saving_time_keeps_its_midnight_when_the_clocks_change()
    {
        var newYork = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var before = DateTimeOffset.Parse("2026-11-02T04:59:00Z", System.Globalization.CultureInfo.InvariantCulture);
        var after = DateTimeOffset.Parse("2026-11-02T05:00:00Z", System.Globalization.CultureInfo.InvariantCulture);

        // El 1 de noviembre de 2026 termina el horario de verano: la medianoche local pasa a ser 05:00 UTC.
        Assert.Equal(new DateOnly(2026, 11, 1), TaskRules.LocalDate(before, newYork));
        Assert.Equal(new DateOnly(2026, 11, 2), TaskRules.LocalDate(after, newYork));
    }

    [Fact]
    public void An_invalid_zone_is_detected_and_a_valid_one_resolves()
    {
        Assert.False(TaskRules.TryResolveZone("Mars/Olympus", out _));
        Assert.False(TaskRules.TryResolveZone("  ", out _));
        var resolved = TaskRules.TryResolveZone("America/Costa_Rica", out var zone);
        Assert.True(resolved);
        Assert.NotNull(zone);
        Assert.Equal(TimeSpan.FromHours(-6), zone.BaseUtcOffset);
    }

    // ── Validación (§13.2, §13.4) ──
    [Theory]
    [InlineData("2026-10-18", "2026-10-17")] // N08/N26
    [InlineData("2026-10-18", "2026-10-16")] // N28
    [InlineData("2026-10-26", "2026-10-25")] // N27 (cambiar el día a 26)
    public void The_day_after_the_deadline_is_rejected_with_the_brisa_message(string day, string due)
    {
        var result = TaskRules.Validate("Tarea", null, day, due, null);

        Assert.True(result.IsFailure);
        Assert.Equal(BrisaErrors.DayAfterDeadlineCode, result.Error.Code);
        Assert.Equal(BrisaErrors.DayAfterDeadlineMessage, result.Error.Message);
        Assert.Equal(ErrorType.Validation, result.Error.Type);
    }

    [Fact]
    public void N27_moving_the_deadline_before_the_effective_day_is_valid_while_day_is_not_after_it()
    {
        // Guardada P=15, L=25 (el editor muestra el 18): cambiar L a 17 compara con el día guardado (15 ≤ 17).
        Assert.True(TaskRules.Validate("Tarea", null, "2026-10-15", "2026-10-17", null).IsSuccess);
    }

    [Fact]
    public void A_blank_title_is_rejected_and_the_minimal_creation_with_only_a_title_is_valid()
    {
        Assert.Equal(BrisaErrors.TitleRequiredCode, TaskRules.Validate("   ", null, "2026-10-18", null, null).Error.Code);

        var ok = TaskRules.Validate("  Comprar pan  ", null, "2026-10-18", "", null);
        Assert.True(ok.IsSuccess);
        Assert.Equal("Comprar pan", ok.Value.Title);
        Assert.Null(ok.Value.DueDate);
    }

    [Fact]
    public void N18_limits_are_150_and_2000_characters_after_trim_and_nothing_is_truncated()
    {
        Assert.True(TaskRules.Validate(new string('a', 150), null, "2026-10-18", null, null).IsSuccess);
        Assert.Equal(BrisaErrors.TitleTooLongCode, TaskRules.Validate(new string('a', 151), null, "2026-10-18", null, null).Error.Code);
        Assert.True(TaskRules.Validate("x", new string('b', 2000), "2026-10-18", null, null).IsSuccess);
        Assert.Equal(BrisaErrors.NotesTooLongCode, TaskRules.Validate("x", new string('b', 2001), "2026-10-18", null, null).Error.Code);
    }

    [Theory]
    [InlineData("18/10/2026")]
    [InlineData("2026-13-01")]
    [InlineData("")]
    [InlineData(null)]
    public void An_invalid_or_missing_day_is_rejected(string? day)
    {
        Assert.Equal(BrisaErrors.DateInvalidCode, TaskRules.Validate("x", null, day, null, null).Error.Code);
    }

    [Theory]
    [InlineData("rojo")]
    [InlineData("#12345")]
    [InlineData("#GGGGGG")]
    public void A_color_that_is_not_rrggbb_is_rejected(string color)
    {
        Assert.Equal(BrisaErrors.ColorInvalidCode, TaskRules.Validate("x", null, "2026-10-18", null, color).Error.Code);
    }
}
