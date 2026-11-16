import { useState } from "react";
import {
  Badge,
  Button,
  CheckboxField,
  ConfirmDialog,
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
import { Collapsible } from "./Collapsible";
import { ErrorNotice } from "./Form";
import { SaveStatus } from "./SaveStatus";
import { newKey } from "./SectionEditor";
import { SkillPicker } from "./SkillPicker";
import { useAutosaveRows, type Row } from "./useAutosaveRows";

const text = strings.bank.achievements;

type AchievementRow = Row & {
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

const isReady = (r: AchievementRow) =>
  r.shortText.trim() !== "" && r.longText.trim() !== "";

type Props = {
  kind: ParentKind;
  parentId: string;
  achievements: readonly Achievement[];
  skills: readonly Skill[];
};

/**
 * Logros de una experiencia o de un proyecto: derivarlos del relato, escribirlos o pedirlos a una IA. El bloque y cada
 * logro llegan cerrados, y todo se guarda solo (un logro nuevo, al tener sus dos textos).
 */
export function AchievementsEditor({
  kind,
  parentId,
  achievements,
  skills,
}: Props) {
  const save = useSaveAchievements(kind, parentId);
  const derive = useDerive(kind, parentId);
  const list = useAutosaveRows<Achievement, AchievementRow>({
    source: achievements,
    toRow,
    toPayload,
    isReady,
    save: (items) =>
      save
        .mutateAsync(items)
        .then(
          (bank) =>
            (kind === "projects" ? bank.projects : bank.experiences).find(
              (p) => p.id === parentId,
            )?.achievements ?? [],
        ),
  });
  const [derivation, setDerivation] = useState<Derivation | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [toRemove, setToRemove] = useState<AchievementRow | null>(null);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const add = (rows: AchievementRow[]) => {
    setBlockOpen(true);
    setOpen((current) => new Set([...current, ...rows.map((r) => r.key)]));
    list.add(...rows);
  };

  return (
    <Collapsible
      heading="h4"
      title={text.count(list.rows.length)}
      expanded={blockOpen}
      onToggle={() => setBlockOpen((v) => !v)}
      actions={<SaveStatus state={list.state} />}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{text.description}</p>
        {list.rows.length === 0 ? (
          <p className="text-sm text-muted">{text.empty}</p>
        ) : null}
        {list.rows.map((row) => {
          const err = (field: string) => list.errorOf(row.key, field);
          const label = row.shortText.trim() || text.newAchievement;
          return (
            <Collapsible
              key={row.key}
              heading="h5"
              title={label}
              expanded={open.has(row.key)}
              onToggle={() => toggle(row.key)}
              actions={
                <>
                  <Badge>
                    {text.visibilityOptions[
                      row.visibility as keyof typeof text.visibilityOptions
                    ] ?? row.visibility}
                  </Badge>
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label={`${strings.common.remove}: ${label}`}
                    onClick={() => setToRemove(row)}
                  >
                    {strings.common.remove}
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-3">
                {!row.id && !isReady(row) ? (
                  <p className="text-sm text-muted">
                    {strings.autosave.incomplete(text.readyHint)}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label={text.shortText}
                    value={row.shortText}
                    error={err("shortText")}
                    onChange={(e) =>
                      list.update(row.key, { shortText: e.target.value })
                    }
                  />
                  <TextField
                    label={text.longText}
                    value={row.longText}
                    error={err("longText")}
                    onChange={(e) =>
                      list.update(row.key, { longText: e.target.value })
                    }
                  />
                  <TextField
                    label={text.resultValue}
                    value={row.resultValue}
                    error={err("resultValue")}
                    onChange={(e) =>
                      list.update(row.key, { resultValue: e.target.value })
                    }
                  />
                  <TextField
                    label={text.resultUnit}
                    value={row.resultUnit}
                    error={err("resultUnit")}
                    onChange={(e) =>
                      list.update(row.key, { resultUnit: e.target.value })
                    }
                  />
                  <SelectField
                    label={text.strength}
                    options={strengthOptions}
                    value={row.strength}
                    onChange={(e) =>
                      list.update(row.key, { strength: e.target.value })
                    }
                  />
                  <SelectField
                    label={text.visibility}
                    options={visibilityOptions}
                    value={row.visibility}
                    onChange={(e) =>
                      list.update(row.key, { visibility: e.target.value })
                    }
                  />
                  <SelectField
                    label={text.impactType}
                    options={impactOptions}
                    value={row.impactType}
                    onChange={(e) =>
                      list.update(row.key, { impactType: e.target.value })
                    }
                  />
                  <CheckboxField
                    label={text.verified}
                    checked={row.verified}
                    onChange={(e) =>
                      list.update(row.key, { verified: e.target.checked })
                    }
                  />
                </div>
                <SkillPicker
                  skills={skills}
                  selectedIds={row.skillIds}
                  onChange={(ids) => list.update(row.key, { skillIds: ids })}
                />
              </div>
            </Collapsible>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            type="button"
            loading={derive.isPending}
            loadingLabel={text.deriving}
            onClick={() =>
              derive.mutate(undefined, { onSuccess: setDerivation })
            }
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
        </div>
        <ErrorNotice error={list.error ?? derive.error} />

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
      </div>

      {toRemove ? (
        <ConfirmDialog
          title={strings.confirm.removeTitle(strings.confirm.what.achievement)}
          message={strings.confirm.removeMessage(
            toRemove.shortText.trim() || text.newAchievement,
          )}
          confirmLabel={strings.common.remove}
          cancelLabel={strings.common.cancel}
          onClose={() => setToRemove(null)}
          onConfirm={() => {
            list.remove(toRemove.key);
            setToRemove(null);
          }}
        />
      ) : null}
    </Collapsible>
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
