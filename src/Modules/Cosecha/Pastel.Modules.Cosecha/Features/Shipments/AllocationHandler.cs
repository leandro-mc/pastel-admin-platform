using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Shipments;

internal sealed record AllocationCandidate(
    Guid ProducerId, string Name, string? PrimaryPhone, decimal CapacityKg, decimal? RequestedKg, decimal? AvailableKg, string? DeliveryStatus);

internal sealed record AllocationCandidates(Guid ShipmentId, decimal TargetKg, decimal StepKg, IReadOnlyList<AllocationCandidate> Producers);

internal sealed record ParticipantInput(Guid? ProducerId, bool Included, decimal? AvailableKg);

internal sealed record SuggestRequest(IReadOnlyList<ParticipantInput>? Participants, decimal? StepKg);

internal sealed record SuggestedRow(Guid ProducerId, string Name, decimal CapacityKg, decimal SuggestedKg);

/// <summary><c>ShortfallKg</c> es lo que no se pudo repartir porque los topes suman menos que el objetivo: la interfaz debe mostrarlo de forma destacada.</summary>
internal sealed record AllocationSuggestion(decimal TargetKg, decimal AllocatedKg, decimal ShortfallKg, IReadOnlyList<SuggestedRow> Rows);

internal sealed record DeliveryInput(Guid? ProducerId, decimal? RequestedKg, decimal? AvailableKg);

internal sealed record ApplyAllocationRequest(IReadOnlyList<DeliveryInput>? Deliveries, string? Note, uint Version);

/// <summary>Reparto del envío entre productores (<c>docs/modules/COSECHA.md</c> §5): sugiere, la persona ajusta, y recién entonces se guarda.</summary>
internal sealed class AllocationHandler(CosechaDbContext db, Stamper stamper, ChangeLog changeLog, ShipmentQueries queries)
{
    private const int MaxProducers = 300;
    private const decimal MaxKg = 10_000_000m;

    public async Task<Result<AllocationCandidates>> CandidatesAsync(Guid shipmentId, CancellationToken ct)
    {
        var shipment = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == shipmentId, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        var planned = await db.ShipmentOrders.AsNoTracking().Where(so => so.ShipmentId == shipmentId).SumAsync(so => so.PlannedKg, ct);
        var capacities = await db.ProducerCapacities.AsNoTracking().Where(c => c.SeasonId == shipment.SeasonId).ToListAsync(ct);
        var deliveries = await db.Deliveries.AsNoTracking().Where(d => d.ShipmentId == shipmentId).ToListAsync(ct);
        var ids = capacities.Select(c => c.ProducerId).Concat(deliveries.Select(d => d.ProducerId)).Distinct().ToList();
        var producers = await db.Producers.AsNoTracking().Where(p => ids.Contains(p.Id)).ToListAsync(ct);
        var phones = await db.ProducerPhones.AsNoTracking().Where(ph => ids.Contains(ph.ProducerId)).OrderBy(ph => ph.SortOrder).ToListAsync(ct);

        var rows = producers
            .Where(p => p.ArchivedAt is null || deliveries.Any(d => d.ProducerId == p.Id))
            .Select(p =>
            {
                var delivery = deliveries.FirstOrDefault(d => d.ProducerId == p.Id);
                return new AllocationCandidate(
                    p.Id,
                    p.Name,
                    (phones.FirstOrDefault(ph => ph.ProducerId == p.Id && ph.IsPrimary) ?? phones.FirstOrDefault(ph => ph.ProducerId == p.Id))?.Phone,
                    capacities.FirstOrDefault(c => c.ProducerId == p.Id)?.EstimatedCapacityKg ?? 0m,
                    delivery?.RequestedKg,
                    delivery?.AvailableKg,
                    delivery?.Status.ToString());
            })
            .OrderBy(c => c.Name)
            .ToList();
        return new AllocationCandidates(shipmentId, ShipmentMath.TargetKg(planned, shipment.BufferPercent), ProportionalAllocator.DefaultStepKg, rows);
    }

    /// <summary>Calcula el reparto sin guardar nada. El peso de cada productor es su capacidad estimada en la temporada del envío.</summary>
    public async Task<Result<AllocationSuggestion>> SuggestAsync(Guid shipmentId, SuggestRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var step = errors.OptionalDecimal("stepKg", request.StepKg, 0.01m, 1000m) ?? ProportionalAllocator.DefaultStepKg;
        var participants = new List<ParticipantInput>();
        if (request.Participants is null || request.Participants.Count == 0)
        {
            errors.Add("participants", "Elija al menos un productor.");
        }
        else if (request.Participants.Count > MaxProducers)
        {
            errors.Add("participants", $"Se admiten hasta {MaxProducers} productores.");
        }
        else
        {
            for (var i = 0; i < request.Participants.Count; i++)
            {
                var input = request.Participants[i];
                if (input.ProducerId is null || participants.Any(p => p.ProducerId == input.ProducerId))
                {
                    errors.Add($"participants[{i}].producerId", input.ProducerId is null ? "Elija un productor." : "Este productor está repetido.");
                    continue;
                }

                errors.OptionalDecimal($"participants[{i}].availableKg", input.AvailableKg, 0m, MaxKg);
                participants.Add(input);
            }
        }

        if (errors.Any)
        {
            return errors.ToError("cosecha.allocation.invalid");
        }

        var shipment = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == shipmentId, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        var planned = await db.ShipmentOrders.AsNoTracking().Where(so => so.ShipmentId == shipmentId).SumAsync(so => so.PlannedKg, ct);
        var ids = participants.Select(p => p.ProducerId!.Value).ToList();
        var producers = await db.Producers.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        if (producers.Count != ids.Count)
        {
            return errors.Add("participants", "Algún productor no existe.").ToError("cosecha.allocation.invalid");
        }

        var capacities = await db.ProducerCapacities.AsNoTracking()
            .Where(c => c.SeasonId == shipment.SeasonId && ids.Contains(c.ProducerId))
            .ToDictionaryAsync(c => c.ProducerId, c => c.EstimatedCapacityKg, ct);

        var result = ProportionalAllocator.Allocate(
            ShipmentMath.TargetKg(planned, shipment.BufferPercent),
            [.. participants.Select(p => new AllocationParticipant(p.ProducerId!.Value, capacities.GetValueOrDefault(p.ProducerId.Value), p.AvailableKg, p.Included))],
            step);
        var rows = result.Shares
            .Select(share => new SuggestedRow(share.Id, producers[share.Id], capacities.GetValueOrDefault(share.Id), share.Kg))
            .OrderBy(r => r.Name)
            .ToList();
        return new AllocationSuggestion(result.TargetKg, result.AllocatedKg, result.ShortfallKg, rows);
    }

    /// <summary>
    /// Guarda el reparto como entregas solicitadas. Es un «fijar el conjunto»: crea, ajusta o quita entregas que aún no se recibieron;
    /// las ya recibidas no se tocan (cambiarlas es un conflicto). Cada ajuste de kilos sobre una entrega existente queda en el registro de cambios.
    /// </summary>
    public async Task<Result<ShipmentDetail>> ApplyAsync(Guid shipmentId, ApplyAllocationRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var note = errors.OptionalText("note", request.Note, 500);
        var inputs = new List<(Guid ProducerId, decimal RequestedKg, decimal? AvailableKg)>();
        if (request.Deliveries is null)
        {
            errors.Add("deliveries", "Indique el reparto.");
        }
        else if (request.Deliveries.Count > MaxProducers)
        {
            errors.Add("deliveries", $"Se admiten hasta {MaxProducers} productores.");
        }
        else
        {
            for (var i = 0; i < request.Deliveries.Count; i++)
            {
                var input = request.Deliveries[i];
                if (input.ProducerId is not { } producerId || inputs.Any(x => x.ProducerId == producerId))
                {
                    errors.Add($"deliveries[{i}].producerId", input.ProducerId is null ? "Elija un productor." : "Este productor está repetido.");
                    continue;
                }

                var requested = errors.RequiredDecimal($"deliveries[{i}].requestedKg", input.RequestedKg, 0m, MaxKg);
                var available = errors.OptionalDecimal($"deliveries[{i}].availableKg", input.AvailableKg, 0m, MaxKg);
                if (requested is not null)
                {
                    inputs.Add((producerId, requested.Value, available));
                }
            }
        }

        if (errors.Any)
        {
            return errors.ToError("cosecha.allocation.invalid");
        }

        async Task<Result> WorkAsync(CancellationToken token)
        {
            var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == shipmentId, token);
            if (shipment is null)
            {
                return CosechaErrors.NotFound;
            }

            if (shipment.Status == ShipmentStatus.Closed && note is null)
            {
                return CosechaErrors.ChangeNoteRequired;
            }

            var season = await db.Seasons.AsNoTracking().FirstAsync(s => s.Id == shipment.SeasonId, token);
            var existing = await db.Deliveries.Where(d => d.ShipmentId == shipmentId).ToListAsync(token);
            var ids = inputs.Select(i => i.ProducerId).Concat(existing.Select(e => e.ProducerId)).Distinct().ToList();
            var producers = await db.Producers.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p, token);

            db.Expect(shipment, request.Version);
            stamper.Updated(shipment);
            string Label(string what, Guid producerId) => Texts.Truncate($"{what} ({producers.GetValueOrDefault(producerId)?.Name ?? "productor"})", 60);

            foreach (var (producerId, requestedKg, availableKg) in inputs)
            {
                var current = existing.FirstOrDefault(e => e.ProducerId == producerId);
                if (!producers.TryGetValue(producerId, out var producer))
                {
                    return new FieldErrors().Add("deliveries", "Algún productor no existe.").ToError("cosecha.allocation.invalid");
                }

                if (current is null)
                {
                    if (requestedKg == 0m)
                    {
                        continue;
                    }

                    if (season.Status != SeasonStatus.Active)
                    {
                        return CosechaErrors.SeasonClosed;
                    }

                    if (producer.ArchivedAt is not null)
                    {
                        return CosechaErrors.RecordArchived;
                    }

                    db.Deliveries.Add(stamper.Created(new ProducerDelivery
                    {
                        ShipmentId = shipmentId,
                        ProducerId = producerId,
                        RequestedKg = requestedKg,
                        AvailableKg = availableKg,
                        RejectedKg = 0m,
                        PricePerKg = season.DefaultProducerPricePerKg,
                        Status = DeliveryStatus.Requested,
                    }));
                    continue;
                }

                if (current.Status == DeliveryStatus.Received)
                {
                    if (requestedKg != current.RequestedKg)
                    {
                        return CosechaErrors.DeliveryHasReception;
                    }

                    continue;
                }

                if (requestedKg == 0m)
                {
                    changeLog.Record(nameof(ProducerDelivery), current.Id, Label("Kilos solicitados", producerId), current.RequestedKg, null, note);
                    db.Deliveries.Remove(current);
                    continue;
                }

                changeLog.Record(nameof(ProducerDelivery), current.Id, Label("Kilos solicitados", producerId), current.RequestedKg, requestedKg, note);
                changeLog.Record(nameof(ProducerDelivery), current.Id, Label("Tope de este envío", producerId), current.AvailableKg, availableKg, note);
                current.RequestedKg = requestedKg;
                current.AvailableKg = availableKg;
                if (current.Status == DeliveryStatus.NoDelivery)
                {
                    current.Status = DeliveryStatus.Requested;
                }

                stamper.Updated(current);
            }

            foreach (var left in existing.Where(e => inputs.All(i => i.ProducerId != e.ProducerId) && e.Status != DeliveryStatus.Received))
            {
                changeLog.Record(nameof(ProducerDelivery), left.Id, Label("Kilos solicitados", left.ProducerId), left.RequestedKg, null, note);
                db.Deliveries.Remove(left);
            }

            await db.SaveChangesAsync(token);
            return Result.Success();
        }

        var outcome = await TransactionRunner.RunSerializableAsync(db, WorkAsync, ct);
        if (outcome.IsFailure)
        {
            return outcome.Error;
        }

        return await queries.DetailAsync(shipmentId, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }
}
