import { useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Badge,
  Button,
  ConfirmDialog,
  PageHeader,
  Panel,
  SelectField,
  TextField,
} from "@/core/ui";
import {
  useBank,
  useDeleteVersion,
  useGenerateCv,
  useOffer,
  useVersion,
  useVersions,
} from "../api/hooks";
import { CvEditor } from "../components/CvEditor";
import { ErrorNotice, Loaded } from "../components/Form";
import { EvidenceMap, OfferPanel } from "../components/OfferPanel";
import { formatDateTime } from "../lib/format";
import { strings } from "../strings";

/** Nivel de CV que viene elegido al abrir «Crear CV». */
const DEFAULT_LEVEL = "mid";

const g = strings.studio.generate;
const v = strings.studio.versions;

export function Component() {
  const [offerId, setOfferId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title={strings.studio.title}
        description={strings.studio.description}
      />
      <OfferPanel selectedId={offerId} onSelect={setOfferId} />
      <SelectedOffer id={offerId} />
      <GeneratePanel offerId={offerId} onGenerated={setVersionId} />
      <VersionsPanel selectedId={versionId} onSelect={setVersionId} />
      <SelectedVersion id={versionId} />
    </div>
  );
}

function SelectedOffer({ id }: { id: string | null }) {
  const offer = useOffer(id);
  if (id === null) return null;
  return (
    <Loaded query={offer}>{(data) => <EvidenceMap offer={data} />}</Loaded>
  );
}

function GeneratePanel({
  offerId,
  onGenerated,
}: {
  offerId: string | null;
  onGenerated: (id: string) => void;
}) {
  const bank = useBank();
  const generate = useGenerateCv();
  const [focus, setFocus] = useState("");
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [paper, setPaper] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [name, setName] = useState("");

  const achievements = bank.data
    ? bank.data.experiences.reduce((n, e) => n + e.achievements.length, 0) +
      bank.data.projects.reduce((n, p) => n + p.achievements.length, 0)
    : null;
  const notes = bank.data?.notes;
  const effectivePaper = paper ?? notes?.preferredPaper ?? "letter";
  const effectiveLanguage = language ?? notes?.preferredLanguage ?? "es";

  return (
    <Panel title={g.title}>
      <div className="flex flex-col gap-4">
        {achievements === 0 ? (
          <p className="text-sm text-muted">{g.empty}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label={g.focus}
              hint={offerId ? undefined : g.focusHint}
              value={focus}
              disabled={offerId !== null}
              onChange={(e) => setFocus(e.target.value)}
            />
          </div>
          <SelectField
            label={g.level}
            options={Object.entries(g.levels).map(([value, label]) => ({
              value,
              label,
            }))}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
          <SelectField
            label={g.paper}
            options={Object.entries(strings.bank.papers).map(
              ([value, label]) => ({ value, label }),
            )}
            value={effectivePaper}
            onChange={(e) => setPaper(e.target.value)}
          />
          <SelectField
            label={g.language}
            options={Object.entries(strings.bank.languages).map(
              ([value, label]) => ({ value, label }),
            )}
            value={effectiveLanguage}
            onChange={(e) => setLanguage(e.target.value)}
          />
          <TextField
            label={g.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted">
          {offerId
            ? "Se generará a partir de la oferta seleccionada."
            : g.noOffer}
        </p>
        <div>
          <Button
            variant="primary"
            type="button"
            disabled={achievements === 0}
            loading={generate.isPending}
            loadingLabel={g.submitting}
            onClick={() =>
              generate.mutate(
                {
                  offerId,
                  focus: offerId ? null : focus || null,
                  level,
                  paper: effectivePaper,
                  language: effectiveLanguage,
                  name: name || null,
                },
                { onSuccess: (version) => onGenerated(version.summary.id) },
              )
            }
          >
            {g.submit}
          </Button>
        </div>
        <ErrorNotice error={generate.error} />
      </div>
    </Panel>
  );
}

function VersionsPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const notify = useNotify();
  const versions = useVersions();
  const remove = useDeleteVersion();
  const [toDelete, setToDelete] = useState<string | null>(null);
  return (
    <Panel title={v.title}>
      <Loaded query={versions}>
        {(list) =>
          list.length === 0 ? (
            <p className="text-sm text-muted">{v.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {item.name}
                    </p>
                    <p className="text-sm text-muted">
                      {v.pagesLines(
                        item.pages,
                        item.linesUsed,
                        item.lineBudget,
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {v.createdAt}{" "}
                      <time dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isPublic ? (
                      <Badge variant="accent">{v.public}</Badge>
                    ) : null}
                    <Button
                      variant={selectedId === item.id ? "primary" : "secondary"}
                      type="button"
                      aria-pressed={selectedId === item.id}
                      onClick={() => onSelect(item.id)}
                    >
                      {v.open}
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      aria-label={`${v.delete}: ${item.name}`}
                      onClick={() => setToDelete(item.id)}
                    >
                      {strings.common.delete}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Loaded>
      {toDelete ? (
        <ConfirmDialog
          title={v.deleteTitle}
          message={v.deleteMessage}
          confirmLabel={strings.common.delete}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete, {
              onSuccess: () => {
                if (selectedId === toDelete) onSelect(null);
                setToDelete(null);
                notify(strings.common.saved);
              },
            })
          }
        />
      ) : null}
    </Panel>
  );
}

function SelectedVersion({ id }: { id: string | null }) {
  const version = useVersion(id);
  if (id === null) return null;
  return (
    <Loaded query={version}>{(data) => <CvEditor version={data} />}</Loaded>
  );
}
