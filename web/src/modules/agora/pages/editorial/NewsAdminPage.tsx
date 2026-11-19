import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { isApiError } from "@/core/api";
import { useNotify } from "@/core/notifications";
import {
  Alert,
  Badge,
  Button,
  CheckboxField,
  ConfirmDialog,
  Dialog,
  StateView,
  TextField,
} from "@/core/ui";
import { primaryButton } from "@/core/ui/styles";
import { useDeleteNews, useSaveNews, type NewsInput } from "../../api/mutations";
import { useNews } from "../../api/queries";
import type { News } from "../../api/schemas";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState, Pager } from "../../components/Feedback";
import { TextAreaField } from "../../components/TextAreaField";
import { describeError, formatDateOnly } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const n = strings.editorial.news;

const toInput = (item?: News): NewsInput => ({
  headline: item?.headline ?? "",
  outlet: item?.outlet ?? "",
  publishedOn: item?.publishedOn ?? "",
  url: item?.url ?? "",
  contextNote: item?.contextNote ?? "",
  topic: item?.topic ?? "",
  isFeatured: item?.isFeatured ?? false,
});

/** Noticias enlazadas: titular, medio, fecha, enlace y un contexto propio de Ágora. */
export function Component() {
  useDocumentTitle(strings.editorial.nav.news);
  const [editing, setEditing] = useState<News | "new" | null>(null);
  return (
    <EditorialShell
      permission={agoraPermissions.manage}
      title={strings.editorial.nav.news}
      description={n.description}
      actions={
        <button type="button" className={primaryButton} onClick={() => setEditing("new")}>
          {n.newLink}
        </button>
      }
    >
      <NewsList onEdit={setEditing} />
      {editing ? (
        <NewsDialog item={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />
      ) : null}
    </EditorialShell>
  );
}

function NewsList({ onEdit }: { onEdit: (item: News) => void }) {
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const news = useNews("", page);
  const remove = useDeleteNews();
  const [toDelete, setToDelete] = useState<News | null>(null);

  if (news.isPending) return <LoadingState />;
  if (news.isError) return <LoadError error={news.error} onRetry={() => void news.refetch()} />;
  if (news.data.items.length === 0) return <StateView status="empty" title={strings.news.empty} />;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {news.data.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              {item.isFeatured ? <Badge variant="accent">{strings.news.featured}</Badge> : null}
              {item.topic ? <Badge>{item.topic}</Badge> : null}
            </div>
            <h2 className="text-base font-bold text-fg">{item.headline}</h2>
            <p className="text-sm text-fg-secondary">{item.contextNote}</p>
            <p className="text-xs text-muted">
              {item.outlet} · {formatDateOnly(item.publishedOn)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => onEdit(item)}>
                <Pencil aria-hidden="true" size={16} />
                {strings.editorial.common.edit}
              </Button>
              <Button variant="danger" onClick={() => setToDelete(item)}>
                <Trash2 aria-hidden="true" size={16} />
                {strings.editorial.common.delete}
              </Button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
              >
                {strings.news.readAt(item.outlet)}
                <ExternalLink aria-hidden="true" size={14} />
              </a>
            </div>
          </li>
        ))}
      </ul>
      <Pager page={news.data.page} totalPages={news.data.totalPages} onPage={setPage} />

      {toDelete ? (
        <ConfirmDialog
          title={n.deleteTitle}
          message={`${toDelete.headline}. ${n.deleteMessage}`}
          confirmLabel={strings.editorial.common.delete}
          cancelLabel={strings.editorial.common.cancel}
          pending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                notify(n.deleted);
                setToDelete(null);
              },
              onError: () => setToDelete(null),
            })
          }
        />
      ) : null}
    </div>
  );
}

function NewsDialog({ item, onClose }: { item: News | undefined; onClose: () => void }) {
  const notify = useNotify();
  const save = useSaveNews();
  const [form, setForm] = useState<NewsInput>(toInput(item));
  const set = <K extends keyof NewsInput>(key: K, value: NewsInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const errors = isApiError(save.error) ? save.error.errors : {};
  const first = (key: string) => errors[key]?.[0];
  const onlyGeneral = save.isError && Object.keys(errors).length === 0;

  return (
    <Dialog
      title={item ? n.editLink : n.newLink}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(
            { id: item?.id, input: form },
            {
              onSuccess: () => {
                notify(n.saved);
                onClose();
              },
            },
          );
        }}
      >
        <TextField label={n.headline} value={form.headline} maxLength={200} required error={first("headline")} onChange={(event) => set("headline", event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={n.outlet} value={form.outlet} maxLength={100} required error={first("outlet")} onChange={(event) => set("outlet", event.target.value)} />
          <TextField label={n.date} type="date" value={form.publishedOn} required error={first("publishedOn")} onChange={(event) => set("publishedOn", event.target.value)} />
        </div>
        <TextField label={n.url} type="url" value={form.url} maxLength={500} required error={first("url")} onChange={(event) => set("url", event.target.value)} />
        <TextAreaField label={n.context} hint={n.contextHint} value={form.contextNote} maxLength={500} rows={4} required error={first("contextNote")} onChange={(event) => set("contextNote", event.target.value)} />
        <TextField label={`${n.topic} ${strings.editorial.common.optional}`} value={form.topic} maxLength={80} error={first("topic")} onChange={(event) => set("topic", event.target.value)} />
        <CheckboxField label={n.featured} description={n.featuredHint} checked={form.isFeatured} onChange={(event) => set("isFeatured", event.target.checked)} />
        {onlyGeneral ? <Alert variant="error" message={describeError(save.error)} /> : null}
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
