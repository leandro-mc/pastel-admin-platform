import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { isApiError } from "@/core/api";
import { useNotify } from "@/core/notifications";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Panel,
  SelectField,
  TextField,
} from "@/core/ui";
import {
  useAddCorrection,
  useArticleTransition,
  useSaveArticle,
  type ArticleInput,
  type SourceInput,
} from "../../api/mutations";
import { useEditorialArticle, useEditorialTaxonomy } from "../../api/queries";
import type {
  ContentType,
  EditorialArticle,
  SourceKind,
  TaxonomyItem,
} from "../../api/schemas";
import { contentTypeLabels } from "../../components/ContentTypeBadge";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState } from "../../components/Feedback";
import { SealExplanation } from "../../components/SealBadge";
import { TextAreaField } from "../../components/TextAreaField";
import { describeError } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPaths } from "../../paths";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const e = strings.editorial.editor;

const emptySource = (): SourceInput => ({
  title: "",
  author: "",
  publishedOn: "",
  url: "",
  kind: "other",
  contextNote: "",
});

const emptyInput = (): ArticleInput => ({
  title: "",
  summary: "",
  contentType: "",
  knownText: "",
  unknownText: "",
  whyItMatters: "",
  body: "",
  categoryId: "",
  seriesId: "",
  seriesOrder: "",
  periodLabel: "",
  tags: [],
  sources: [emptySource(), emptySource()],
  video: { url: "", title: "", note: "" },
});

function toInput(article: EditorialArticle): ArticleInput {
  const detail = article.detail;
  return {
    title: detail.card.title,
    summary: detail.card.summary,
    contentType: detail.card.contentType,
    knownText: detail.knownText ?? "",
    unknownText: detail.unknownText ?? "",
    whyItMatters: detail.whyItMatters ?? "",
    body: detail.body,
    categoryId: article.categoryId,
    seriesId: article.seriesId ?? "",
    seriesOrder: detail.card.seriesOrder?.toString() ?? "",
    periodLabel: detail.periodLabel ?? "",
    tags: detail.tags,
    sources: detail.sources.map((source) => ({
      title: source.title,
      author: source.author ?? "",
      publishedOn: source.publishedOn ?? "",
      url: source.url,
      kind: source.kind,
      contextNote: source.contextNote ?? "",
    })),
    video: detail.video
      ? {
          url: detail.video.youTubeId,
          title: detail.video.title,
          note: detail.video.note ?? "",
        }
      : { url: "", title: "", note: "" },
  };
}

const parseTags = (text: string) =>
  text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const sourceKinds: { value: SourceKind; label: string }[] = [
  { value: "official", label: strings.article.sourceKinds.official },
  { value: "press", label: strings.article.sourceKinds.press },
  { value: "academic", label: strings.article.sourceKinds.academic },
  { value: "document", label: strings.article.sourceKinds.document },
  { value: "other", label: strings.article.sourceKinds.other },
];

export function Component() {
  const { id } = useParams();
  useDocumentTitle(id ? e.editTitle : e.newTitle);
  return (
    <EditorialShell
      permission={agoraPermissions.manage}
      title={id ? e.editTitle : e.newTitle}
    >
      <EditorLoader id={id} />
    </EditorialShell>
  );
}

function EditorLoader({ id }: { id: string | undefined }) {
  const taxonomy = useEditorialTaxonomy();
  const article = useEditorialArticle(id);

  if (taxonomy.isPending || (id !== undefined && article.isPending)) {
    return <LoadingState />;
  }
  if (taxonomy.isError) {
    return <LoadError error={taxonomy.error} onRetry={() => void taxonomy.refetch()} />;
  }
  if (id !== undefined && article.isError) {
    return (
      <LoadError
        error={article.error}
        title={e.notFoundTitle}
        onRetry={() => void article.refetch()}
      />
    );
  }
  return (
    <ArticleEditor
      key={article.data?.version ?? "new"}
      existing={article.data}
      categories={taxonomy.data.categories}
      series={taxonomy.data.series}
    />
  );
}

function ArticleEditor({
  existing,
  categories,
  series,
}: {
  existing: EditorialArticle | undefined;
  categories: TaxonomyItem[];
  series: TaxonomyItem[];
}) {
  const navigate = useNavigate();
  const notify = useNotify();
  const save = useSaveArticle();
  const initial = existing ? toInput(existing) : emptyInput();
  const [form, setForm] = useState<ArticleInput>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));

  const archived = existing?.status === "archived";
  const dirty =
    JSON.stringify({ ...form, tags: parseTags(tagsText) }) !==
    JSON.stringify({ ...initial, tags: parseTags(initial.tags.join(", ")) });

  const apiError = isApiError(save.error) ? save.error : undefined;
  const fieldError = (key: string) => apiError?.errors[key]?.[0];
  const conflict = apiError?.code === "agora.article.concurrency";

  const set = <K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setSource = (index: number, patch: Partial<SourceInput>) =>
    setForm((current) => ({
      ...current,
      sources: current.sources.map((source, i) => (i === index ? { ...source, ...patch } : source)),
    }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      {
        id: existing?.detail.card.id,
        input: { ...form, tags: parseTags(tagsText) },
        version: existing?.version,
      },
      {
        onSuccess: (saved) => {
          if (!existing) {
            notify(e.created);
            void navigate(agoraPaths.editorialArticle(saved.detail.card.id), { replace: true });
            return;
          }
          notify(strings.editorial.common.saved);
          if (existing.status === "published" && saved.substantiveVersion > existing.substantiveVersion) {
            notify(e.substantiveChange);
          }
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {archived ? <Alert variant="info" message={e.archivedNote} /> : null}
      {conflict ? (
        <Alert
          variant="warning"
          message={`${e.conflictTitle}. ${e.conflictHint}`}
        />
      ) : null}
      {conflict ? (
        <div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {e.reload}
          </Button>
        </div>
      ) : null}
      {save.isError && !conflict && !apiError?.isValidation ? (
        <Alert variant="error" message={describeError(save.error)} />
      ) : null}

      <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
        <fieldset disabled={archived} className="contents">
          <Panel title={e.sectionContent}>
            <div className="flex flex-col gap-4">
              <TextField
                label={e.title}
                hint={e.titleHint}
                value={form.title}
                maxLength={90}
                required
                error={fieldError("title")}
                onChange={(event) => set("title", event.target.value)}
              />
              <TextAreaField
                label={e.summary}
                hint={`${e.summaryHint} (${form.summary.length}/280)`}
                value={form.summary}
                maxLength={280}
                rows={3}
                required
                error={fieldError("summary")}
                onChange={(event) => set("summary", event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label={e.contentType}
                  placeholder={e.contentTypePlaceholder}
                  value={form.contentType}
                  required
                  error={fieldError("contentType")}
                  options={(Object.keys(contentTypeLabels) as ContentType[]).map((type) => ({
                    value: type,
                    label: contentTypeLabels[type],
                  }))}
                  onChange={(event) => set("contentType", event.target.value as ContentType | "")}
                />
                <SelectField
                  label={e.category}
                  placeholder={e.categoryPlaceholder}
                  value={form.categoryId}
                  required
                  hint={categories.length === 0 ? e.noCategories : undefined}
                  error={fieldError("categoryId")}
                  options={categories.map((category) => ({ value: category.id, label: category.name }))}
                  onChange={(event) => set("categoryId", event.target.value)}
                />
                <SelectField
                  label={`${e.series} ${strings.editorial.common.optional}`}
                  value={form.seriesId}
                  error={fieldError("seriesId")}
                  options={[
                    { value: "", label: strings.editorial.common.none },
                    ...series.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                  onChange={(event) => set("seriesId", event.target.value)}
                />
                <TextField
                  label={e.seriesOrder}
                  type="number"
                  min={1}
                  value={form.seriesOrder}
                  disabled={form.seriesId === ""}
                  onChange={(event) => set("seriesOrder", event.target.value)}
                />
                <TextField
                  label={`${e.period} ${strings.editorial.common.optional}`}
                  hint={e.periodHint}
                  value={form.periodLabel}
                  maxLength={80}
                  error={fieldError("periodLabel")}
                  onChange={(event) => set("periodLabel", event.target.value)}
                />
                <TextField
                  label={`${e.tags} ${strings.editorial.common.optional}`}
                  hint={e.tagsHint}
                  value={tagsText}
                  error={fieldError("tags")}
                  onChange={(event) => setTagsText(event.target.value)}
                />
              </div>
              <TextAreaField
                label={`${e.known} ${strings.editorial.common.optional}`}
                value={form.knownText}
                maxLength={600}
                rows={3}
                error={fieldError("knownText")}
                onChange={(event) => set("knownText", event.target.value)}
              />
              <TextAreaField
                label={`${e.unknown} ${strings.editorial.common.optional}`}
                value={form.unknownText}
                maxLength={400}
                rows={3}
                error={fieldError("unknownText")}
                onChange={(event) => set("unknownText", event.target.value)}
              />
              <TextAreaField
                label={`${e.why} ${strings.editorial.common.optional}`}
                value={form.whyItMatters}
                maxLength={400}
                rows={3}
                error={fieldError("whyItMatters")}
                onChange={(event) => set("whyItMatters", event.target.value)}
              />
              <TextAreaField
                label={e.body}
                hint={e.bodyHint}
                value={form.body}
                rows={14}
                error={fieldError("body")}
                onChange={(event) => set("body", event.target.value)}
              />
            </div>
          </Panel>

          <Panel
            title={e.sectionSources}
            actions={
              <Button
                variant="secondary"
                onClick={() => setForm((c) => ({ ...c, sources: [...c.sources, emptySource()] }))}
              >
                <Plus aria-hidden="true" size={16} />
                {e.addSource}
              </Button>
            }
          >
            {fieldError("sources") ? (
              <p className="mb-3 text-sm text-danger">{fieldError("sources")}</p>
            ) : null}
            {form.sources.length === 0 ? <p className="text-sm text-muted">{e.noSources}</p> : null}
            <ol className="flex flex-col gap-5">
              {form.sources.map((source, index) => (
                <li key={index} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-fg">{e.sourceN(index + 1)}</h3>
                    <Button
                      variant="ghost"
                      aria-label={e.removeSource(index + 1)}
                      onClick={() =>
                        setForm((c) => ({ ...c, sources: c.sources.filter((_, i) => i !== index) }))
                      }
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label={e.sourceTitle}
                      value={source.title}
                      maxLength={200}
                      error={fieldError(`sources[${index}].title`)}
                      onChange={(event) => setSource(index, { title: event.target.value })}
                    />
                    <TextField
                      label={e.sourceUrl}
                      type="url"
                      value={source.url}
                      maxLength={500}
                      error={fieldError(`sources[${index}].url`)}
                      onChange={(event) => setSource(index, { url: event.target.value })}
                    />
                    <SelectField
                      label={e.sourceKind}
                      value={source.kind}
                      options={sourceKinds}
                      error={fieldError(`sources[${index}].kind`)}
                      onChange={(event) => setSource(index, { kind: event.target.value as SourceKind })}
                    />
                    <TextField
                      label={`${e.sourceAuthor} ${strings.editorial.common.optional}`}
                      value={source.author}
                      maxLength={150}
                      error={fieldError(`sources[${index}].author`)}
                      onChange={(event) => setSource(index, { author: event.target.value })}
                    />
                    <TextField
                      label={`${e.sourceDate} ${strings.editorial.common.optional}`}
                      type="date"
                      value={source.publishedOn}
                      onChange={(event) => setSource(index, { publishedOn: event.target.value })}
                    />
                    <TextField
                      label={`${e.sourceNote} ${strings.editorial.common.optional}`}
                      value={source.contextNote}
                      maxLength={400}
                      error={fieldError(`sources[${index}].contextNote`)}
                      onChange={(event) => setSource(index, { contextNote: event.target.value })}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title={`${e.sectionVideo} ${strings.editorial.common.optional}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={e.videoUrl}
                value={form.video.url}
                error={fieldError("video.url")}
                onChange={(event) => set("video", { ...form.video, url: event.target.value })}
              />
              <TextField
                label={e.videoTitle}
                value={form.video.title}
                maxLength={120}
                error={fieldError("video.title")}
                onChange={(event) => set("video", { ...form.video, title: event.target.value })}
              />
              <div className="sm:col-span-2">
                <TextField
                  label={`${e.videoNote} ${strings.editorial.common.optional}`}
                  value={form.video.note}
                  maxLength={300}
                  error={fieldError("video.note")}
                  onChange={(event) => set("video", { ...form.video, note: event.target.value })}
                />
              </div>
            </div>
          </Panel>
        </fieldset>

        {apiError?.isValidation ? (
          <Alert variant="error" message={apiError.detail} />
        ) : null}
        <div>
          <Button
            type="submit"
            loading={save.isPending}
            loadingLabel={strings.editorial.common.saving}
            disabled={archived || (existing !== undefined && !dirty)}
          >
            {e.saveDraft}
          </Button>
        </div>
      </form>

      {existing ? <StatusPanel existing={existing} dirty={dirty} /> : null}
    </div>
  );
}

function StatusPanel({ existing, dirty }: { existing: EditorialArticle; dirty: boolean }) {
  const notify = useNotify();
  const transition = useArticleTransition();
  const [confirm, setConfirm] = useState<"unpublish" | "archive" | null>(null);
  const { detail } = existing;
  const id = detail.card.id;

  const checks = [
    { label: e.checkBasics, ok: true },
    { label: e.checkSources, ok: detail.sources.length >= 2 },
    { label: e.checkBody, ok: detail.body.trim() !== "" },
  ];
  const ready = checks.every((check) => check.ok);

  const run = (action: "publish" | "unpublish" | "archive", message: string) =>
    transition.mutate(
      { id, action },
      {
        onSuccess: () => {
          notify(message);
          setConfirm(null);
        },
        onError: () => setConfirm(null),
      },
    );

  return (
    <Panel
      title={e.sectionStatus}
      description={e.version(existing.substantiveVersion)}
      actions={<Badge>{strings.editorial.status[existing.status]}</Badge>}
    >
      <div className="flex flex-col gap-5">
        {existing.status === "published" ? <SealExplanation seal={detail.card.seal} /> : null}

        {existing.status !== "published" ? (
          <section aria-labelledby="checklist" className="flex flex-col gap-2">
            <h3 id="checklist" className="text-base font-semibold text-fg">
              {e.checklist}
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {checks.map((check) => (
                <li key={check.label} className={check.ok ? "text-fg" : "text-danger"}>
                  {check.ok ? e.checkOk : e.checkMissing}: {check.label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {dirty ? (
          <Alert variant="info" message={e.saveFirst} />
        ) : null}
        {transition.isError ? (
          <Alert variant="error" message={describeError(transition.error)} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {existing.status !== "published" && existing.status !== "archived" ? (
            <Button
              loading={transition.isPending && confirm === null}
              loadingLabel={e.publishing}
              disabled={!ready || dirty}
              onClick={() => run("publish", e.published)}
            >
              {e.publish}
            </Button>
          ) : null}
          {existing.status === "archived" ? (
            <Button variant="secondary" disabled={dirty} onClick={() => run("unpublish", e.unpublished)}>
              {e.restore}
            </Button>
          ) : null}
          {existing.status === "published" ? (
            <Button variant="secondary" onClick={() => setConfirm("unpublish")}>
              {e.unpublish}
            </Button>
          ) : null}
          {existing.status !== "archived" ? (
            <Button variant="danger" onClick={() => setConfirm("archive")}>
              {e.archive}
            </Button>
          ) : null}
          {existing.status === "published" ? (
            <Link
              to={agoraPaths.article(detail.card.slug)}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
            >
              {e.viewPublic}
            </Link>
          ) : null}
        </div>

        {existing.status === "published" ? <CorrectionForm id={id} /> : null}
      </div>

      {confirm === "unpublish" ? (
        <ConfirmDialog
          title={e.unpublishTitle}
          message={e.unpublishMessage}
          confirmLabel={e.unpublish}
          cancelLabel={strings.editorial.common.cancel}
          pending={transition.isPending}
          onConfirm={() => run("unpublish", e.unpublished)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm === "archive" ? (
        <ConfirmDialog
          title={e.archiveTitle}
          message={e.archiveMessage}
          confirmLabel={e.archive}
          cancelLabel={strings.editorial.common.cancel}
          pending={transition.isPending}
          onConfirm={() => run("archive", e.archived)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </Panel>
  );
}

function CorrectionForm({ id }: { id: string }) {
  const notify = useNotify();
  const add = useAddCorrection();
  const [text, setText] = useState("");
  const serverError = isApiError(add.error) ? add.error.errors.text?.[0] : undefined;

  return (
    <form
      className="flex flex-col gap-3 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate(
          { id, text },
          {
            onSuccess: () => {
              notify(e.correctionAdded);
              setText("");
            },
          },
        );
      }}
    >
      <h3 className="text-base font-semibold text-fg">{e.correctionTitle}</h3>
      <TextAreaField
        label={e.correctionField}
        hint={e.correctionHint}
        value={text}
        maxLength={600}
        rows={3}
        error={serverError}
        onChange={(event) => setText(event.target.value)}
      />
      {add.isError && !serverError ? (
        <Alert variant="error" message={describeError(add.error)} />
      ) : null}
      <div>
        <Button
          type="submit"
          variant="secondary"
          loading={add.isPending}
          loadingLabel={strings.editorial.common.saving}
          disabled={text.trim().length < 10}
        >
          {e.correctionSend}
        </Button>
      </div>
    </form>
  );
}
