using Pastel.Modules.Brisa.Domain;
using Xunit;

namespace Pastel.Modules.Brisa.Tests;

/// <summary>
/// Prueba esencial 6 de Etapa 1 (ficha §6): importación con el archivo sintético de inventario §9.5. Los esperados salen del
/// inventario: 5 registros, 4 abiertas y 1 hecha, 3 con fecha límite; todo o nada; prioridad desconocida → Media con aviso.
/// </summary>
public sealed class ImportParserTests
{
    private const string Sample = """
        [
         {"id":"7d1f3a52-9c40-4e6b-8a17-2b5c0e9d4f01","title":"Llamar al banco","details":"","scheduledDate":"2026-10-18","priority":"HIGH","colorHex":"#F6DDCE","dueDate":"","completed":false,"createdAt":1792278000000},
         {"id":"a3c8e2b9-51d7-4f06-9b3e-6e1a7c2d8f02","title":"Enviar informe mensual","details":"","scheduledDate":"2026-10-15","priority":"MEDIUM","colorHex":"#DCEAF4","dueDate":"2026-10-20","completed":false,"createdAt":1792022400000},
         {"id":"5e9b0c47-2a8d-4d13-a6f5-3c7b1e0a9d03","title":"Ordenar el escritorio","details":"","scheduledDate":"2026-10-16","priority":"LOW","colorHex":"#E5EDC8","dueDate":"","completed":false,"createdAt":1792108800000},
         {"id":"c2406d8e-7b1f-4a95-8e2c-9d5f3a1b6e04","title":"Pagar el recibo de agua","details":"","scheduledDate":"2026-10-14","priority":"HIGH","colorHex":"#F5E9B9","dueDate":"2026-10-16","completed":true,"createdAt":1791936000000},
         {"id":"e81a5f30-6c9d-4b27-b4a8-1f2e7d0c5a05","title":"Revisar presupuesto","details":"Incluye ajustes de septiembre","scheduledDate":"2026-10-14","priority":"MEDIUM","colorHex":"#D4E9E1","dueDate":"2026-10-17","completed":false,"createdAt":1792300000000}
        ]
        """;

    [Fact]
    public void The_sample_file_is_accepted_with_the_expected_totals_and_nothing_is_lost()
    {
        var analysis = ImportParser.Parse(Sample);

        Assert.True(analysis.Accepted);
        Assert.Empty(analysis.Errors);
        Assert.Empty(analysis.Warnings);

        var summary = ImportSummary.Of(analysis.Records.ToList());
        Assert.Equal(5, summary.Records);
        Assert.Equal(4, summary.Open);
        Assert.Equal(1, summary.Done);
        Assert.Equal(3, summary.WithDeadline);
        Assert.Equal(new DateOnly(2026, 10, 14), summary.From);
        Assert.Equal(new DateOnly(2026, 10, 18), summary.To);

        // Los campos de cada registro llegan íntegros, y el id del archivo se conserva (hace idempotente la reimportación).
        var review = analysis.Records.Single(r => r.Title == "Revisar presupuesto");
        Assert.Equal(Guid.Parse("e81a5f30-6c9d-4b27-b4a8-1f2e7d0c5a05"), review.Id);
        Assert.Equal("Incluye ajustes de septiembre", review.Notes);
        Assert.Equal(new DateOnly(2026, 10, 14), review.ScheduledDate);
        Assert.Equal(new DateOnly(2026, 10, 17), review.DueDate);
        Assert.Equal(TaskPriority.Medium, review.Priority);
        Assert.Equal("#D4E9E1", review.ColorHex);
        Assert.False(review.Completed);
        Assert.Equal(DateTimeOffset.FromUnixTimeMilliseconds(1792300000000), review.CreatedAt);

        var paid = analysis.Records.Single(r => r.Title == "Pagar el recibo de agua");
        Assert.True(paid.Completed);
        Assert.Null(analysis.Records.Single(r => r.Title == "Llamar al banco").DueDate);
    }

    [Fact]
    public void A_corrupt_file_gives_a_clear_error_and_zero_records()
    {
        // Mismo archivo con la coma entre dos registros eliminada.
        var corrupt = Sample.Replace("1792278000000},\n {", "1792278000000}\n {", StringComparison.Ordinal);
        Assert.NotEqual(Sample, corrupt);

        var analysis = ImportParser.Parse(corrupt);

        Assert.False(analysis.Accepted);
        Assert.Empty(analysis.Records);
        var error = Assert.Single(analysis.Errors);
        Assert.Null(error.Row);
        Assert.Contains("JSON", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void A_day_after_its_deadline_rejects_that_record_and_the_whole_batch()
    {
        // «Revisar presupuesto» con día 2026-10-20 y fecha límite 2026-10-17.
        var invalid = Sample.Replace(
            "\"scheduledDate\":\"2026-10-14\",\"priority\":\"MEDIUM\",\"colorHex\":\"#D4E9E1\"",
            "\"scheduledDate\":\"2026-10-20\",\"priority\":\"MEDIUM\",\"colorHex\":\"#D4E9E1\"",
            StringComparison.Ordinal);

        var analysis = ImportParser.Parse(invalid);

        Assert.False(analysis.Accepted);
        Assert.Empty(analysis.Records);
        var error = Assert.Single(analysis.Errors);
        Assert.Equal(5, error.Row);
        Assert.Equal("dueDate", error.Field);
        Assert.Equal(BrisaErrors.DayAfterDeadlineMessage, error.Message);
    }

    [Fact]
    public void An_unknown_or_missing_priority_becomes_medium_and_only_the_unknown_one_warns()
    {
        var analysis = ImportParser.Parse("""
            [
             {"id":"11111111-1111-4111-8111-111111111111","title":"A","scheduledDate":"2026-10-18","priority":"URGENT","createdAt":1792278000000},
             {"id":"22222222-2222-4222-8222-222222222222","title":"B","scheduledDate":"2026-10-18","createdAt":1792278000000}
            ]
            """);

        Assert.True(analysis.Accepted);
        Assert.All(analysis.Records, record => Assert.Equal(TaskPriority.Medium, record.Priority));
        var warning = Assert.Single(analysis.Warnings);
        Assert.Equal(1, warning.Row);
        Assert.Equal("priority", warning.Field);
        Assert.Equal(TaskRules.DefaultColorHex, analysis.Records[0].ColorHex);
    }

    [Fact]
    public void A_missing_creation_date_warns_and_the_envelope_format_is_accepted()
    {
        var analysis = ImportParser.Parse("""
            {"format":"brisa-export","version":1,"exportedAt":"2026-10-18T21:00:00Z","timeZone":"America/Costa_Rica",
             "tasks":[{"id":"11111111-1111-4111-8111-111111111111","title":"A","scheduledDate":"2026-10-18"}]}
            """);

        Assert.True(analysis.Accepted);
        Assert.Single(analysis.Records);
        Assert.Equal("createdAt", Assert.Single(analysis.Warnings).Field);
    }

    [Theory]
    [InlineData("""{"format":"otra-cosa","version":1,"tasks":[]}""")]
    [InlineData("""{"format":"brisa-export","version":2,"tasks":[]}""")]
    [InlineData("""{"hola":1}""")]
    [InlineData("""[]""")]
    [InlineData("")]
    public void Files_with_the_wrong_shape_or_no_tasks_are_rejected(string content)
    {
        var analysis = ImportParser.Parse(content);

        Assert.False(analysis.Accepted);
        Assert.Empty(analysis.Records);
    }

    [Fact]
    public void Invalid_records_report_row_field_and_reason_for_every_problem()
    {
        var analysis = ImportParser.Parse("""
            [
             {"id":"no-es-uuid","title":"A","scheduledDate":"2026-10-18"},
             {"id":"11111111-1111-4111-8111-111111111111","title":"   ","scheduledDate":"2026-13-40","colorHex":"rojo"},
             {"id":"22222222-2222-4222-8222-222222222222","title":"B","scheduledDate":"2026-10-18","completed":"si"},
             {"id":"22222222-2222-4222-8222-222222222222","title":"C","scheduledDate":"2026-10-18"}
            ]
            """);

        Assert.False(analysis.Accepted);
        Assert.Empty(analysis.Records);
        Assert.Contains(analysis.Errors, e => e is { Row: 1, Field: "id" });
        Assert.Contains(analysis.Errors, e => e is { Row: 2, Field: "title" });
        Assert.Contains(analysis.Errors, e => e is { Row: 2, Field: "scheduledDate" });
        Assert.Contains(analysis.Errors, e => e is { Row: 2, Field: "colorHex" });
        Assert.Contains(analysis.Errors, e => e is { Row: 3, Field: "completed" });
        Assert.Contains(analysis.Errors, e => e is { Row: 4, Field: "id" });
    }

    [Fact]
    public void Notes_over_2000_characters_are_reported_with_the_source_field_name()
    {
        var analysis = ImportParser.Parse(
            $$"""[{"id":"11111111-1111-4111-8111-111111111111","title":"A","details":"{{new string('n', 2001)}}","scheduledDate":"2026-10-18"}]""");

        Assert.False(analysis.Accepted);
        Assert.Contains(analysis.Errors, e => e is { Row: 1, Field: "details" });
    }

    [Fact]
    public void An_existing_task_with_the_same_content_is_recognised_and_a_changed_one_is_not()
    {
        var record = ImportParser.Parse(Sample).Records.Single(r => r.Title == "Revisar presupuesto");
        var stored = new BrisaTask
        {
            Id = record.Id,
            OwnerId = Guid.NewGuid(),
            Title = record.Title,
            Notes = record.Notes,
            ScheduledDate = record.ScheduledDate,
            DueDate = record.DueDate,
            Priority = record.Priority,
            ColorHex = record.ColorHex,
            IsCompleted = record.Completed,
            CreatedAt = record.CreatedAt!.Value,
        };

        Assert.True(record.SameAs(stored));

        stored.Title = "Revisar presupuesto (editada)";
        Assert.False(record.SameAs(stored));
    }
}
