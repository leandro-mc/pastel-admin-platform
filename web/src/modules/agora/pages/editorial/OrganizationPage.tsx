import { Pencil } from "lucide-react";
import { useState } from "react";
import { isApiError } from "@/core/api";
import { useNotify } from "@/core/notifications";
import { Alert, Button, Dialog, Panel, TextField } from "@/core/ui";
import { useSaveTaxonomy, type TaxonomyInput } from "../../api/mutations";
import { useEditorialTaxonomy } from "../../api/queries";
import type { TaxonomyItem } from "../../api/schemas";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState } from "../../components/Feedback";
import { TextAreaField } from "../../components/TextAreaField";
import { describeError } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const o = strings.editorial.organization;

type Editing = { kind: "categories" | "series"; item?: TaxonomyItem };

/** Temas (categorías) y series. El enlace de cada uno no cambia al renombrarlo. */
export function Component() {
  useDocumentTitle(strings.editorial.nav.organization);
  return (
    <EditorialShell
      permission={agoraPermissions.manage}
      title={strings.editorial.nav.organization}
      description={o.description}
    >
      <Body />
    </EditorialShell>
  );
}

function Body() {
  const taxonomy = useEditorialTaxonomy();
  const [editing, setEditing] = useState<Editing | null>(null);

  if (taxonomy.isPending) return <LoadingState />;
  if (taxonomy.isError)
    return <LoadError error={taxonomy.error} onRetry={() => void taxonomy.refetch()} />;

  const group = (
    kind: Editing["kind"],
    title: string,
    addLabel: string,
    items: TaxonomyItem[],
  ) => (
    <Panel
      title={title}
      actions={
        <Button variant="secondary" onClick={() => setEditing({ kind })}>
          {addLabel}
        </Button>
      }
    >
      {items.length === 0 ? <p className="text-fg-secondary">{o.empty}</p> : null}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold text-fg">{item.name}</span>
              <span className="text-xs text-muted">
                {o.pieces(item.articleCount)} · /{item.slug}
              </span>
              {item.description ? (
                <span className="text-sm text-fg-secondary">{item.description}</span>
              ) : null}
            </span>
            <Button variant="ghost" onClick={() => setEditing({ kind, item })}>
              <Pencil aria-hidden="true" size={16} />
              {o.edit}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );

  return (
    <>
      {group("categories", o.categories, o.newCategory, taxonomy.data.categories)}
      {group("series", o.series, o.newSeries, taxonomy.data.series)}
      {editing ? <TaxonomyDialog editing={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function TaxonomyDialog({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const notify = useNotify();
  const save = useSaveTaxonomy();
  const { item, kind } = editing;
  const [form, setForm] = useState<TaxonomyInput>({
    name: item?.name ?? "",
    description: item?.description ?? "",
    sortOrder: item?.sortOrder.toString() ?? "0",
  });
  const errors = isApiError(save.error) ? save.error.errors : {};
  const general = save.isError && Object.keys(errors).length === 0;

  const title = item
    ? kind === "categories" ? o.editCategory : o.editSeries
    : kind === "categories" ? o.newCategory : o.newSeries;

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(
            { kind, id: item?.id, input: form },
            {
              onSuccess: () => {
                notify(o.saved);
                onClose();
              },
            },
          );
        }}
      >
        <TextField label={o.name} value={form.name} maxLength={kind === "categories" ? 80 : 100} required error={errors.name?.[0]} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextAreaField label={`${o.descriptionField} ${strings.editorial.common.optional}`} value={form.description} maxLength={300} rows={3} error={errors.description?.[0]} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <TextField label={o.order} hint={o.orderHint} type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
        {general ? <Alert variant="error" message={describeError(save.error)} /> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {strings.editorial.common.cancel}
          </Button>
          <Button type="submit" loading={save.isPending} loadingLabel={strings.editorial.common.saving}>
            {strings.editorial.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
