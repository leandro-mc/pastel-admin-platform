import { useState, type FormEvent } from "react";
import { Button, CheckboxField, SelectField, TextField } from "@/core/ui";
import { useCreateOrder, useUpdateOrder } from "../../api/mutations";
import { useBuyers, useProducts, useSeasons } from "../../api/queries";
import type { OrderDetail } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { fieldMessage } from "../../errors";
import { parseDecimal, toFieldText, todayIso } from "../../format";
import { strings } from "../../strings";

const t = strings.orders.form;

type LineRow = { productId: string; kilograms: string; pricePerKg: string };

type Props = {
  /** Sin pedido: alta. Con pedido: edición (comprador y temporada no cambian). */
  order?: OrderDetail;
  onDone: (order: OrderDetail) => void;
  onCancel: () => void;
};

export function OrderForm({ order, onDone, onCancel }: Props) {
  const buyers = useBuyers({ page: 1, pageSize: 100 }, { enabled: !order });
  const seasons = useSeasons();
  const products = useProducts(true);
  const create = useCreateOrder();
  const update = useUpdateOrder();
  const mutation = order ? update : create;

  const activeSeason = seasons.data?.find((season) => season.status === "Active");
  const [buyerId, setBuyerId] = useState(order?.summary.buyerId ?? "");
  const [seasonId, setSeasonId] = useState(order?.summary.seasonId ?? "");
  const [requiredOn, setRequiredOn] = useState(order?.summary.requiredOn ?? todayIso());
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [lines, setLines] = useState<LineRow[]>(
    order && order.lines.length > 0
      ? order.lines.map((line) => ({
          productId: line.productId,
          kilograms: toFieldText(line.kilograms),
          pricePerKg: toFieldText(line.pricePerKg),
        }))
      : [{ productId: "", kilograms: "", pricePerKg: "" }],
  );
  const [invalid, setInvalid] = useState<Record<string, string>>({});

  const setLine = (index: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems: Record<string, string> = {};
    const parsed = lines.map((row, index) => {
      const kilograms = parseDecimal(row.kilograms);
      const price = parseDecimal(row.pricePerKg);
      if (kilograms === null) problems[`lines[${index}].kilograms`] = strings.common.invalidNumber;
      if (price === null) problems[`lines[${index}].pricePerKg`] = strings.common.invalidNumber;
      return { productId: row.productId, kilograms: kilograms ?? 0, pricePerKg: price ?? 0 };
    });
    setInvalid(problems);
    if (Object.keys(problems).length > 0) return;

    const body = {
      buyerId: buyerId || undefined,
      seasonId: seasonId || activeSeason?.id,
      requiredOn,
      notes: notes.trim() || undefined,
      lines: parsed,
      confirm,
      note: note.trim() || undefined,
      version: order?.summary.version,
    };
    if (order) update.mutate({ id: order.summary.id, body }, { onSuccess: onDone });
    else create.mutate(body, { onSuccess: onDone });
  };

  const productOptions = (selected: string) =>
    (products.data ?? []).map((product) => ({
      value: product.id,
      label: product.isActive ? product.name : `${product.name} (inactivo)`,
      disabled: !product.isActive && product.id !== selected,
    }));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {!order ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t.buyer}
            placeholder={t.buyerPlaceholder}
            value={buyerId}
            onChange={(event) => setBuyerId(event.target.value)}
            options={(buyers.data?.items ?? [])
              .filter((buyer) => !buyer.isArchived)
              .map((buyer) => ({ value: buyer.id, label: buyer.name }))}
            hint={buyers.data && buyers.data.items.length === 0 ? t.needBuyers : undefined}
            error={fieldMessage(mutation.error, "buyerId")}
          />
          <SelectField
            label={t.season}
            placeholder={t.seasonPlaceholder}
            value={seasonId || activeSeason?.id || ""}
            onChange={(event) => setSeasonId(event.target.value)}
            options={(seasons.data ?? [])
              .filter((season) => season.status === "Active")
              .map((season) => ({ value: season.id, label: season.name }))}
            error={fieldMessage(mutation.error, "seasonId")}
          />
        </div>
      ) : null}
      <TextField
        type="date"
        label={t.requiredOn}
        value={requiredOn}
        onChange={(event) => setRequiredOn(event.target.value)}
        error={fieldMessage(mutation.error, "requiredOn")}
        required
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-fg">{t.lines}</legend>
        {lines.map((row, index) => (
          <div
            key={index}
            className="grid items-end gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(8rem,10rem)_minmax(9rem,12rem)]"
          >
            <SelectField
              label={t.product}
              placeholder={t.productPlaceholder}
              value={row.productId}
              onChange={(event) => setLine(index, { productId: event.target.value })}
              options={productOptions(row.productId)}
              error={fieldMessage(mutation.error, `lines[${index}].productId`)}
            />
            <TextField
              label={t.kilograms}
              inputMode="decimal"
              value={row.kilograms}
              onChange={(event) => setLine(index, { kilograms: event.target.value })}
              error={invalid[`lines[${index}].kilograms`] ?? fieldMessage(mutation.error, `lines[${index}].kilograms`)}
            />
            <TextField
              label={t.pricePerKg}
              inputMode="decimal"
              value={row.pricePerKg}
              onChange={(event) => setLine(index, { pricePerKg: event.target.value })}
              error={invalid[`lines[${index}].pricePerKg`] ?? fieldMessage(mutation.error, `lines[${index}].pricePerKg`)}
            />
          </div>
        ))}
        {fieldMessage(mutation.error, "lines") ? (
          <p role="alert" className="text-sm text-danger">
            {fieldMessage(mutation.error, "lines")}
          </p>
        ) : null}
      </fieldset>
      <TextField
        label={t.notes}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        error={fieldMessage(mutation.error, "notes")}
        maxLength={1000}
      />
      {order ? (
        <TextField
          label={t.changeNote}
          hint={t.changeNoteHint}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={fieldMessage(mutation.error, "note")}
          maxLength={500}
        />
      ) : (
        <CheckboxField
          label={t.confirmOnSave}
          description={t.confirmHint}
          checked={confirm}
          onChange={(event) => setConfirm(event.target.checked)}
        />
      )}
      <FormAlert error={mutation.error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          {strings.common.cancel}
        </Button>
        <Button type="submit" loading={mutation.isPending} loadingLabel={strings.common.saving}>
          {strings.common.save}
        </Button>
      </div>
    </form>
  );
}
