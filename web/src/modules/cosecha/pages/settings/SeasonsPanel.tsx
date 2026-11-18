import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import {
  Button,
  ConfirmDialog,
  Dialog,
  Panel,
  SelectField,
  StateView,
  TextField,
} from "@/core/ui";
import {
  useCreateSeason,
  useSetSeasonStatus,
  useUpdateSeason,
} from "../../api/mutations";
import { useProducts, useSeasons } from "../../api/queries";
import type { Season } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { QueryState } from "../../components/QueryState";
import { StatusBadge } from "../../components/StatusBadge";
import { fieldMessage } from "../../errors";
import { formatCrc, formatDate, parseDecimal, toFieldText } from "../../format";
import { strings } from "../../strings";
import { table, tableScroll, td, tdNumber, th, thNumber } from "../../styles";

const t = strings.settings.seasons;

function SeasonDialog({
  season,
  onClose,
}: {
  season?: Season;
  onClose: () => void;
}) {
  const notify = useNotify();
  const products = useProducts();
  const create = useCreateSeason();
  const update = useUpdateSeason();
  const [name, setName] = useState(season?.name ?? "");
  const [productId, setProductId] = useState(season?.productId ?? "");
  const [startsOn, setStartsOn] = useState(season?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(season?.endsOn ?? "");
  const [price, setPrice] = useState(
    toFieldText(season?.defaultProducerPricePerKg),
  );
  const [note, setNote] = useState("");
  const [priceError, setPriceError] = useState<string>();
  const mutation = season ? update : create;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseDecimal(price);
    if (parsed === null) {
      setPriceError(strings.common.invalidNumber);
      return;
    }
    setPriceError(undefined);
    const body = {
      name,
      productId: productId || undefined,
      startsOn,
      endsOn,
      defaultProducerPricePerKg: parsed,
      note: note || undefined,
      version: season?.version,
    };
    const done = () => {
      notify(season ? t.saved : t.created);
      onClose();
    };
    if (season) update.mutate({ id: season.id, body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  };

  return (
    <Dialog title={season ? t.editTitle : t.newTitle} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t.name}
          hint={t.nameHint}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldMessage(mutation.error, "name")}
          maxLength={120}
          required
        />
        <SelectField
          label={t.product}
          placeholder={t.productPlaceholder}
          value={productId}
          disabled={Boolean(season)}
          onChange={(event) => setProductId(event.target.value)}
          options={(products.data ?? []).map((product) => ({
            value: product.id,
            label: product.name,
          }))}
          error={fieldMessage(mutation.error, "productId")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            type="date"
            label={t.startsOn}
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            error={fieldMessage(mutation.error, "startsOn")}
            required
          />
          <TextField
            type="date"
            label={t.endsOn}
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            error={fieldMessage(mutation.error, "endsOn")}
            required
          />
        </div>
        <TextField
          label={t.price}
          hint={t.priceHint}
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          error={
            priceError ?? fieldMessage(mutation.error, "defaultProducerPricePerKg")
          }
          required
        />
        {season ? (
          <TextField
            label={strings.common.noteLabel}
            hint={t.priceNote}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={fieldMessage(mutation.error, "note")}
            maxLength={500}
          />
        ) : null}
        <FormAlert error={mutation.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            loadingLabel={strings.common.saving}
          >
            {strings.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SeasonsPanel({ canManage }: { canManage: boolean }) {
  const notify = useNotify();
  const seasons = useSeasons();
  const products = useProducts();
  const setStatus = useSetSeasonStatus();
  const [editing, setEditing] = useState<Season | "new" | null>(null);
  const [toggling, setToggling] = useState<Season | null>(null);

  const toggle = () => {
    if (!toggling) return;
    const closing = toggling.status === "Active";
    setStatus.mutate(
      {
        id: toggling.id,
        status: closing ? "Closed" : "Active",
        version: toggling.version,
      },
      {
        onSuccess: () => {
          notify(closing ? t.closed : t.reopened);
          setToggling(null);
        },
      },
    );
  };

  return (
    <Panel
      title={t.title}
      description={t.description}
      actions={
        canManage ? (
          <Button
            onClick={() => setEditing("new")}
            disabled={(products.data ?? []).length === 0}
          >
            {t.newButton}
          </Button>
        ) : undefined
      }
    >
      {canManage && products.isSuccess && products.data.length === 0 ? (
        <p className="text-sm text-muted">{t.needProduct}</p>
      ) : null}
      <QueryState query={seasons}>
        {(items) =>
          items.length === 0 ? (
            <StateView status="empty" title={t.empty} />
          ) : (
            <div className={tableScroll}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>{t.name}</th>
                    <th className={th}>{t.product}</th>
                    <th className={th}>
                      {t.startsOn} – {t.endsOn}
                    </th>
                    <th className={thNumber}>{t.price}</th>
                    <th className={th}>{t.status}</th>
                    {canManage ? <th className={th}>{t.actions}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((season) => (
                    <tr key={season.id}>
                      <td className={td}>{season.name}</td>
                      <td className={td}>{season.productName}</td>
                      <td className={td}>
                        {formatDate(season.startsOn)} – {formatDate(season.endsOn)}
                      </td>
                      <td className={tdNumber}>
                        {formatCrc(season.defaultProducerPricePerKg)}
                      </td>
                      <td className={td}>
                        <StatusBadge kind="season" value={season.status} />
                      </td>
                      {canManage ? (
                        <td className={td}>
                          <div className="flex flex-wrap gap-1">
                            <Button variant="link" onClick={() => setEditing(season)}>
                              {strings.common.edit}
                            </Button>
                            <Button variant="link" onClick={() => setToggling(season)}>
                              {season.status === "Active" ? t.close : t.reopen}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </QueryState>
      {editing ? (
        <SeasonDialog
          season={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {toggling ? (
        <ConfirmDialog
          title={toggling.status === "Active" ? t.closeTitle : t.reopenTitle}
          message={
            toggling.status === "Active" ? t.closeMessage : t.reopenMessage
          }
          confirmLabel={
            toggling.status === "Active" ? t.close : t.reopen
          }
          cancelLabel={strings.common.cancel}
          pendingLabel={strings.common.saving}
          pending={setStatus.isPending}
          onConfirm={toggle}
          onClose={() => setToggling(null)}
        >
          <FormAlert error={setStatus.error} />
        </ConfirmDialog>
      ) : null}
    </Panel>
  );
}
