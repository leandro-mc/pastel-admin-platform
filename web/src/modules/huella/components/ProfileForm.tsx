import { useEffect, useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Button,
  CheckboxField,
  ConfirmDialog,
  Panel,
  SelectField,
  TextField,
} from "@/core/ui";
import { useSaveProfile } from "../api/hooks";
import type { Profile } from "../api/schemas";
import { strings } from "../strings";
import { ErrorNotice, TextAreaField, fieldError } from "./Form";
import { newKey } from "./SectionEditor";

const t = strings.publication.profile;
const maxLinks = 8;

type LinkRow = {
  key: string;
  id?: string;
  kind: string;
  label: string;
  url: string;
  isPublic: boolean;
};

type Draft = Omit<Profile, "links" | "isPublished" | "updatedAt"> & {
  links: LinkRow[];
};

const optional = (value: string | null) =>
  value === null || value.trim() === "" ? null : value.trim();

const toDraft = (profile: Profile): Draft => ({
  displayName: profile.displayName,
  headline: profile.headline,
  summary: profile.summary,
  location: profile.location ?? "",
  availability: profile.availability ?? "",
  contactEmail: profile.contactEmail ?? "",
  contactPhone: profile.contactPhone ?? "",
  showContactEmail: profile.showContactEmail,
  showContactPhone: profile.showContactPhone,
  showLocation: profile.showLocation,
  showAvailability: profile.showAvailability,
  links: profile.links.map((l) => ({ ...l, key: l.id })),
});

const kindOptions = Object.entries(t.kinds).map(([value, label]) => ({
  value,
  label,
}));

/** Datos del perfil y enlaces. Los datos de contacto no se muestran a nadie salvo que se activen aquí. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const notify = useNotify();
  const save = useSaveProfile();
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile));
  const [dirty, setDirty] = useState(false);
  const [linkToRemove, setLinkToRemove] = useState<number | null>(null);

  useEffect(() => {
    if (!dirty) setDraft(toDraft(profile));
  }, [profile, dirty]);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const setLink = (index: number, patch: Partial<LinkRow>) =>
    set({
      links: draft.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  const err = (field: string) => fieldError(save.error, field);

  const submit = async () => {
    try {
      await save.mutateAsync({
        displayName: draft.displayName,
        headline: draft.headline,
        summary: draft.summary,
        location: optional(draft.location),
        availability: optional(draft.availability),
        contactEmail: optional(draft.contactEmail),
        contactPhone: optional(draft.contactPhone),
        showContactEmail: draft.showContactEmail,
        showContactPhone: draft.showContactPhone,
        showLocation: draft.showLocation,
        showAvailability: draft.showAvailability,
        links: draft.links.map((l) => ({
          id: l.id,
          kind: l.kind,
          label: l.label,
          url: l.url,
          isPublic: l.isPublic,
        })),
      });
      setDirty(false);
      notify(strings.common.saved);
    } catch {
      /* el error se muestra abajo */
    }
  };

  return (
    <Panel
      title={t.title}
      actions={
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
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t.displayName}
          value={draft.displayName}
          error={err("displayName")}
          onChange={(e) => set({ displayName: e.target.value })}
        />
        <TextField
          label={t.headline}
          value={draft.headline}
          error={err("headline")}
          onChange={(e) => set({ headline: e.target.value })}
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label={t.summary}
            rows={5}
            value={draft.summary}
            error={err("summary")}
            onChange={(e) => set({ summary: e.target.value })}
          />
        </div>
        <TextField
          label={t.location}
          value={draft.location ?? ""}
          error={err("location")}
          onChange={(e) => set({ location: e.target.value })}
        />
        <TextField
          label={t.availability}
          value={draft.availability ?? ""}
          error={err("availability")}
          onChange={(e) => set({ availability: e.target.value })}
        />
        <TextField
          label={t.email}
          type="email"
          value={draft.contactEmail ?? ""}
          error={err("contactEmail")}
          onChange={(e) => set({ contactEmail: e.target.value })}
        />
        <TextField
          label={t.phone}
          type="tel"
          value={draft.contactPhone ?? ""}
          error={err("contactPhone")}
          onChange={(e) => set({ contactPhone: e.target.value })}
        />
      </div>

      <fieldset className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
        <legend className="text-sm font-medium text-fg">
          {strings.publication.title}
        </legend>
        <p className="text-sm text-muted">{t.contactHint}</p>
        <CheckboxField
          label={t.showEmail}
          checked={draft.showContactEmail}
          onChange={(e) => set({ showContactEmail: e.target.checked })}
        />
        <CheckboxField
          label={t.showPhone}
          checked={draft.showContactPhone}
          onChange={(e) => set({ showContactPhone: e.target.checked })}
        />
        <CheckboxField
          label={t.showLocation}
          checked={draft.showLocation}
          onChange={(e) => set({ showLocation: e.target.checked })}
        />
        <CheckboxField
          label={t.showAvailability}
          checked={draft.showAvailability}
          onChange={(e) => set({ showAvailability: e.target.checked })}
        />
      </fieldset>

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="text-base font-semibold text-fg">{t.links}</h3>
        {draft.links.map((link, index) => (
          <div
            key={link.key}
            className="grid items-end gap-3 sm:grid-cols-[9rem_1fr_2fr_auto]"
          >
            <SelectField
              label={t.linkKind}
              options={kindOptions}
              value={link.kind}
              onChange={(e) => setLink(index, { kind: e.target.value })}
            />
            <TextField
              label={t.linkLabel}
              value={link.label}
              error={err(`links[${index}].label`)}
              onChange={(e) => setLink(index, { label: e.target.value })}
            />
            <TextField
              label={t.linkUrl}
              value={link.url}
              error={err(`links[${index}].url`)}
              onChange={(e) => setLink(index, { url: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <CheckboxField
                label={t.linkPublic}
                checked={link.isPublic}
                onChange={(e) => setLink(index, { isPublic: e.target.checked })}
              />
              <Button
                variant="ghost"
                type="button"
                aria-label={`${strings.common.remove}: ${link.label || link.url || t.linkLabel}`}
                onClick={() => setLinkToRemove(index)}
              >
                {strings.common.remove}
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            variant="secondary"
            type="button"
            disabled={draft.links.length >= maxLinks}
            onClick={() =>
              set({
                links: [
                  ...draft.links,
                  {
                    key: newKey(),
                    kind: "website",
                    label: "",
                    url: "",
                    isPublic: true,
                  },
                ],
              })
            }
          >
            {t.addLink}
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <ErrorNotice error={save.error} />
      </div>
      {linkToRemove !== null ? (
        <ConfirmDialog
          title={strings.confirm.removeTitle(strings.confirm.what.link)}
          message={strings.confirm.removeMessage(
            draft.links[linkToRemove]?.label ||
              draft.links[linkToRemove]?.url ||
              t.linkLabel,
          )}
          confirmLabel={strings.common.remove}
          cancelLabel={strings.common.cancel}
          onClose={() => setLinkToRemove(null)}
          onConfirm={() => {
            set({ links: draft.links.filter((_, i) => i !== linkToRemove) });
            setLinkToRemove(null);
          }}
        />
      ) : null}
    </Panel>
  );
}
