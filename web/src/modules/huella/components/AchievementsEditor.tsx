import { useEffect, useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Badge,
  Button,
  CheckboxField,
  SelectField,
  TextField,
} from "@/core/ui";
import {
  useAchievementAiPackage,
  useAchievementAiResult,
  useAchievementAiRun,
  useDerive,
  useSaveAchievements,
  type ParentKind,
} from "../api/hooks";
import type { Achievement, Derivation, Proposal, Skill } from "../api/schemas";
import { strings } from "../strings";
import { AiWorkbench } from "./AiWorkbench";
import { ErrorNotice, fieldError } from "./Form";
import { newKey } from "./SectionEditor";

const text = strings.bank.achievements;

type AchievementRow = {
  key: string;
  id?: string;
  shortText: string;
  longText: string;
  rawText: string;
  resultValue: string;
  resultUnit: string;
  resultBaseline: string;
  impactType: string;
  strength: string;
  verified: boolean;
  source: string;
  visibility: string;
  skillIds: string[];
};

const toRow = (a: Achievement): AchievementRow => ({
  key: a.id,
  id: a.id,
  shortText: a.shortText,
  longText: a.longText,
  rawText: a.rawText ?? "",
  resultValue: a.resultValue ?? "",
  resultUnit: a.resultUnit ?? "",
  resultBaseline: a.resultBaseline ?? "",
  impactType: a.impactType,
  strength: String(a.strength),
  verified: a.verified,
  source: a.source,
  visibility: a.visibility,
  skillIds: a.skillIds,
});

const fromProposal = (p: Proposal, source: string): AchievementRow => ({
  key: newKey(),
  shortText: p.shortText,
  longText: p.longText,
  rawText: p.rawText,
  resultValue: p.resultValue ?? "",
  resultUnit: p.resultUnit ?? "",
  resultBaseline: "",
  impactType: p.impactType,
  strength: String(p.strength),
  verified: false,
  source,
  visibility: "both",
  skillIds: p.skillIds,
});

const blank = (): AchievementRow => ({
  key: newKey(),
  shortText: "",
  longText: "",
  rawText: "",
  resultValue: "",
  resultUnit: "",
  resultBaseline: "",
  impactType: "other",
  strength: "3",
  verified: false,
  source: "manual",
  visibility: "both",
  skillIds: [],
});

const optional = (value: string) => (value.trim() === "" ? null : value.trim());

const toPayload = (r: AchievementRow) => ({
  id: r.id,
  shortText: r.shortText,
  longText: r.longText,
  rawText: optional(r.rawText),
  resultValue: optional(r.resultValue),
  resultUnit: optional(r.resultUnit),
  resultBaseline: optional(r.resultBaseline),
  impactType: r.impactType,
  strength: Number(r.strength),
  verified: r.verified,
  source: r.source,
  visibility: r.visibility,
  skillIds: r.skillIds,
});

const impactOptions = Object.entries(text.impact).map(([value, label]) => ({
  value,
  label,
}));
const visibilityOptions = Object.entries(text.visibilityOptions).map(
  ([value, label]) => ({ value, label }),
);
const strengthOptions = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: String(n),
}));

type Props = {
  kind: ParentKind;
  parentId: string;
  achievements: readonly Achievement[];
  skills: readonly Skill[];
};

/** Logros de una experiencia o de un proyecto: derivarlos del relato, escribirlos o validarlos con IA manual. */
export function AchievementsEditor({
  kind,
  parentId,
  achievements,
  skills,
}: Props) {
  const notify = useNotify();
  const save = useSaveAchievements(kind, parentId);
  const derive = useDerive(kind, parentId);
  const [rows, setRows] = useState<AchievementRow[]>(() =>
    achievements.map(toRow),
  );
  const [dirty, setDirty] = useState(false);
  const [derivation, setDerivation] = useState<Derivation | null>(null);

  useEffect(() => {
    if (!dirty) setRows(achievements.map(toRow));
  }, [achievements, dirty]);

  const update = (index: number, patch: Partial<AchievementRow>) => {
    setRows((current) =>
      current.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  };
  const add = (added: AchievementRow[]) => {
    setRows((current) => [...current, ...added]);
    setDirty(true);
  };
  const submit = async () => {
    try {
      await save.mutateAsync(rows.map(toPayload));
      setDirty(false);
      notify(strings.common.saved);
    } catch {
      /* el error se muestra bajo la lista */
    }
  };

  return (
    <section
      className="flex flex-col gap-4 border-t border-line pt-4"
      aria-label={text.title}
    >
      <div>
        <h4 className="text-base font-semibold text-fg">{text.title}</h4>
        <p className="mt-1 text-sm text-muted">{text.description}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{text.empty}</p>
      ) : null}
      {rows.map((row, index) => {
        const err = (field: string) =>
          fieldError(save.error, `items[${index}].${field}`);
        return (
          <div
            key={row.key}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={text.shortText}
                value={row.shortText}
                error={err("shortText")}
                onChange={(e) => update(index, { shortText: e.target.value })}
              />
              <TextField
                label={text.longText}
                value={row.longText}
                error={err("longText")}
                onChange={(e) => update(index, { longText: e.target.value })}
              />
              <TextField
                label={text.resultValue}
                value={row.resultValue}
                error={err("resultValue")}
                onChange={(e) => update(index, { resultValue: e.target.value })}
              />
              <TextField
                label={text.resultUnit}
                value={row.resultUnit}
                error={err("resultUnit")}
                onChange={(e) => update(index, { resultUnit: e.target.value })}
              />
              <SelectField
                label={text.strength}
                options={strengthOptions}
                value={row.strength}
                onChange={(e) => update(index, { strength: e.target.value })}
              />
              <SelectField
                label={text.visibility}
                options={visibilityOptions}
                value={row.visibility}
                onChange={(e) => update(index, { visibility: e.target.value })}
              />
              <SelectField
                label="Tipo de impacto"
                options={impactOptions}
                value={row.impactType}
                onChange={(e) => update(index, { impactType: e.target.value })}
              />
              <CheckboxField
                label={text.verified}
                checked={row.verified}
                onChange={(e) => update(index, { verified: e.target.checked })}
              />
            </div>
            {skills.length > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-fg">
                  {text.skills}
                </legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {skills.map((skill) => (
                    <label
                      key={skill.id}
                      className="inline-flex min-h-8 items-center gap-2 text-sm text-fg"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-accent-strong"
                        checked={row.skillIds.includes(skill.id)}
                        onChange={(e) =>
                          update(index, {
                            skillIds: e.target.checked
                              ? [...row.skillIds, skill.id]
                              : row.skillIds.filter((s) => s !== skill.id),
                          })
                        }
                      />
                      {skill.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setRows((current) => current.filter((_, i) => i !== index));
                  setDirty(true);
                }}
              >
                {strings.common.remove}
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          type="button"
          loading={derive.isPending}
          loadingLabel={text.deriving}
          onClick={() => derive.mutate(undefined, { onSuccess: setDerivation })}
        >
          {text.derive}
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => add([blank()])}
        >
          {text.addManual}
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={!dirty}
          loading={save.isPending}
          loadingLabel={strings.common.saving}
          onClick={() => void submit()}
        >
          {strings.common.save}
        </Button>
      </div>
      <ErrorNotice error={save.error ?? derive.error} />

      {derivation ? (
        <Proposals
          derivation={derivation}
          skills={skills}
          onAccept={(proposal) =>
            add([fromProposal(proposal, derivation.source)])
          }
          onClose={() => setDerivation(null)}
        />
      ) : null}

      <AiManual kind={kind} parentId={parentId} onResult={setDerivation} />
    </section>
  );
}

function Proposals({
  derivation,
  skills,
  onAccept,
  onClose,
}: {
  derivation: Derivation;
  skills: readonly Skill[];
  onAccept: (proposal: Proposal) => void;
  onClose: () => void;
}) {
  const [accepted, setAccepted] = useState<ReadonlySet<number>>(new Set());
  const names = new Map(skills.map((s) => [s.id, s.name]));
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-line-strong p-3"
      role="region"
      aria-label={text.proposals}
    >
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-fg">{text.proposals}</h5>
        <Button variant="ghost" type="button" onClick={onClose}>
          {strings.common.cancel}
        </Button>
      </div>
      {derivation.proposals.length === 0 ? (
        <p className="text-sm text-muted">{text.noProposals}</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {derivation.proposals.map((p, i) => (
          <li
            key={`${p.longText}-${i}`}
            className="flex flex-col gap-1 border-t border-line pt-2 first:border-t-0 first:pt-0"
          >
            <p className="text-sm text-fg">{p.longText}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {p.resultValue ? (
                <Badge variant="accent">
                  {[p.resultValue, p.resultUnit].filter(Boolean).join(" ")}
                </Badge>
              ) : null}
              {p.needsFigure ? <span>{text.needsFigure}</span> : null}
              {p.skillIds.map((id) => (
                <Badge key={id}>{names.get(id)}</Badge>
              ))}
              {p.unknownSkills.map((name) => (
                <Badge key={name} variant="warning">
                  {name}
                </Badge>
              ))}
            </div>
            <div>
              <Button
                variant="secondary"
                type="button"
                disabled={accepted.has(i)}
                onClick={() => {
                  onAccept(p);
                  setAccepted(new Set([...accepted, i]));
                }}
              >
                {text.accept}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {derivation.rejected.length > 0 ? (
        <div className="text-sm text-muted">
          <p className="font-medium text-fg">{text.rejected}</p>
          <ul className="list-disc pl-5">
            {derivation.rejected.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AiManual({
  kind,
  parentId,
  onResult,
}: {
  kind: ParentKind;
  parentId: string;
  onResult: (d: Derivation) => void;
}) {
  const packageMutation = useAchievementAiPackage(kind, parentId);
  const runMutation = useAchievementAiRun(kind, parentId);
  const resultMutation = useAchievementAiResult(kind, parentId);
  return (
    <details className="rounded-lg border border-line p-3">
      <summary className="cursor-pointer text-sm font-medium text-fg">
        {text.ai.title}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-muted">{text.ai.description}</p>
        <AiWorkbench
          fileBase={`huella-logros-${kind === "projects" ? "proyecto" : "experiencia"}`}
          getPackage={() => packageMutation.mutateAsync()}
          preparing={packageMutation.isPending}
          onRun={() => {
            resultMutation.reset();
            runMutation.mutate(undefined, { onSuccess: onResult });
          }}
          running={runMutation.isPending}
          onImport={(json, done) => {
            runMutation.reset();
            resultMutation.mutate(json, {
              onSuccess: (d) => {
                onResult(d);
                done();
              },
            });
          }}
          importing={resultMutation.isPending}
          error={
            runMutation.error ?? resultMutation.error ?? packageMutation.error
          }
          rejected={[]}
        />
      </div>
    </details>
  );
}
