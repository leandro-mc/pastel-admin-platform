import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useNotify } from "@/core/notifications";
import {
  Button,
  PageHeader,
  Panel,
  SelectField,
  StateView,
  TextField,
} from "@/core/ui";
import { useCreateShipment } from "../api/mutations";
import { usePendingOrders, useSeasons } from "../api/queries";
import { FormAlert } from "../components/FormAlert";
import { QueryState } from "../components/QueryState";
import { fieldMessage } from "../errors";
import { formatDate, formatKg, nextThursdayIso, parseDecimal, toFieldText } from "../format";
import { cosechaPaths } from "../paths";
import { strings } from "../strings";
import {
  checkboxClass,
  inputClass,
  linkButton,
  pageClass,
  table,
  tableScroll,
  td,
  tdNumber,
  th,
  thNumber,
} from "../styles";

const t = strings.shipments.plan;

/** Planificar un envío: fecha, margen y pedidos pendientes. El reparto entre productores se hace en el detalle. */
export function Component() {
  const navigate = useNavigate();
  const notify = useNotify();
  const seasons = useSeasons();
  const create = useCreateShipment();
  const [seasonId, setSeasonId] = useState("");
  const [date, setDate] = useState(nextThursdayIso());
  const [buffer, setBuffer] = useState("0");
  const [notes, setNotes] = useState("");
  // Pedido marcado -> texto de los kilos a enviar (por defecto, lo que falta planificar).
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string>();

  const season = seasonId || seasons.data?.find((item) => item.status === "Active")?.id || "";
  const pending = usePendingOrders({ seasonId: season, date });

  const total = Object.values(selected).reduce((sum, text) => sum + (parseDecimal(text) ?? 0), 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const bufferValue = parseDecimal(buffer);
    const ids = Object.keys(selected);
    if (bufferValue === null) {
      setProblem(strings.common.invalidNumber);
      return;
    }
    if (ids.length === 0) {
      setProblem(t.needOrders);
      return;
    }
    setProblem(undefined);
    create.mutate(
      {
        seasonId: season,
        shipmentDate: date,
        bufferPercent: bufferValue,
        notes: notes.trim() || undefined,
        orders: ids.map((orderId) => ({ orderId, plannedKg: parseDecimal(selected[orderId] ?? "") ?? undefined })),
      },
      {
        onSuccess: (created) => {
          notify(t.created);
          void navigate(cosechaPaths.shipment(created.summary.id));
        },
      },
    );
  };

  return (
    <section data-module="cosecha" className={pageClass}>
      <Link to={cosechaPaths.shipments} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
        {t.back}
      </Link>
      <PageHeader title={t.title} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Panel>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label={t.season}
              value={season}
              placeholder={strings.common.noSeason}
              onChange={(event) => {
                setSeasonId(event.target.value);
                setSelected({});
              }}
              options={(seasons.data ?? [])
                .filter((item) => item.status === "Active")
                .map((item) => ({ value: item.id, label: item.name }))}
              error={fieldMessage(create.error, "seasonId")}
            />
            <TextField
              type="date"
              label={t.date}
              hint={t.dateHint}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              error={fieldMessage(create.error, "shipmentDate")}
              required
            />
            <TextField
              label={t.buffer}
              hint={t.bufferHint}
              inputMode="decimal"
              value={buffer}
              onChange={(event) => setBuffer(event.target.value)}
              error={fieldMessage(create.error, "bufferPercent")}
            />
          </div>
          <TextField
            label={t.notes}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            error={fieldMessage(create.error, "notes")}
            maxLength={1000}
          />
        </Panel>
        <Panel title={t.ordersTitle} description={t.ordersHint}>
          {season === "" ? (
            <StateView status="empty" title={t.noSeason} />
          ) : (
            <QueryState query={pending}>
              {(orders) =>
                orders.length === 0 ? (
                  <StateView status="empty" title={t.ordersEmpty} />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() =>
                          setSelected(
                            Object.fromEntries(orders.map((o) => [o.orderId, toFieldText(o.unplannedKg)])),
                          )
                        }
                      >
                        {t.selectAll}
                      </Button>
                      <Button variant="ghost" type="button" onClick={() => setSelected({})}>
                        {t.clear}
                      </Button>
                    </div>
                    <div className={tableScroll}>
                      <table className={table}>
                        <thead>
                          <tr>
                            <th className={th}>
                              <span className="sr-only">Incluir</span>
                            </th>
                            <th className={th}>{t.buyer}</th>
                            <th className={th}>{t.required}</th>
                            <th className={thNumber}>{t.ordered}</th>
                            <th className={thNumber}>{t.unplanned}</th>
                            <th className={thNumber}>{t.planned}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => {
                            const checked = order.orderId in selected;
                            return (
                              <tr key={order.orderId}>
                                <td className={td}>
                                  <input
                                    type="checkbox"
                                    className={checkboxClass}
                                    aria-label={`${t.buyer}: ${order.buyerName}`}
                                    checked={checked}
                                    onChange={(event) =>
                                      setSelected((current) => {
                                        const next = { ...current };
                                        if (event.target.checked) next[order.orderId] = toFieldText(order.unplannedKg);
                                        else delete next[order.orderId];
                                        return next;
                                      })
                                    }
                                  />
                                </td>
                                <td className={td}>{order.buyerName}</td>
                                <td className={td}>{formatDate(order.requiredOn)}</td>
                                <td className={tdNumber}>{formatKg(order.orderedKg)}</td>
                                <td className={tdNumber}>{formatKg(order.unplannedKg)}</td>
                                <td className={tdNumber}>
                                  {checked ? (
                                    <input
                                      inputMode="decimal"
                                      className={`${inputClass} w-28 text-right`}
                                      aria-label={`${t.planned}: ${order.buyerName}`}
                                      value={selected[order.orderId] ?? ""}
                                      onChange={(event) =>
                                        setSelected((current) => ({ ...current, [order.orderId]: event.target.value }))
                                      }
                                    />
                                  ) : (
                                    strings.common.none
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm font-semibold text-fg">
                      {t.total}: {formatKg(total)}
                    </p>
                  </>
                )
              }
            </QueryState>
          )}
          {problem ? (
            <p role="alert" className="text-sm text-danger">
              {problem}
            </p>
          ) : null}
          {fieldMessage(create.error, "orders") ? (
            <p role="alert" className="text-sm text-danger">
              {fieldMessage(create.error, "orders")}
            </p>
          ) : null}
          <FormAlert error={create.error} />
          <div className="flex justify-end">
            <Button type="submit" disabled={season === ""} loading={create.isPending} loadingLabel={strings.common.saving}>
              {t.create}
            </Button>
          </div>
        </Panel>
      </form>
    </section>
  );
}
