import { useEffect, useState } from "react";
import { focusClass, labelClass } from "@/core/ui/styles";
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
import {
  LinkGlyph,
  linkIconKeys,
  resolveLinkIcon,
} from "../lib/linkIcons";
import { strings } from "../strings";
import { ErrorNotice, fieldError } from "./Form";
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
  icon: string | null;
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

/** Botón de un icono del selector: marcado cuando es el elegido. */
const iconChoice = (selected: boolean) =>
  `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-3 text-fg hover:bg-accent-soft ${focusClass} ${
    selected ? "border-accent bg-accent-soft" : "border-line-strong bg-surface"
  }`;

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
  const [iconOpen, setIconOpen] = useState<string | null>(null);

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
          icon: l.icon,
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
        <p className="self-end text-sm text-muted">{t.headlineMoved}</p>
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
        {draft.links.map((link, index) => {
          const current = resolveLinkIcon(link.kind, link.icon);
          const pickerId = `huella-icon-${link.key}`;
          return (
            <div key={link.key} className="flex flex-col gap-2">
              <div className="grid items-end gap-3 sm:grid-cols-[9rem_auto_1fr_2fr_auto]">
                <SelectField
                  label={t.linkKind}
                  options={kindOptions}
                  value={link.kind}
                  onChange={(e) => setLink(index, { kind: e.target.value })}
                />
                <div className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t.linkIcon}</span>
                  <button
                    type="button"
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 text-fg hover:bg-accent-soft ${focusClass}`}
                    aria-expanded={iconOpen === link.key}
                    aria-controls={pickerId}
                    aria-label={t.iconChange(t.icons[current])}
                    onClick={() =>
                      setIconOpen(iconOpen === link.key ? null : link.key)
                    }
                  >
                    <LinkGlyph kind={link.kind} icon={link.icon} />
                  </button>
                </div>
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
              {iconOpen === link.key ? (
                <div
                  id={pickerId}
                  role="group"
                  aria-label={t.iconPick}
                  className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3"
                >
                  <button
                    type="button"
                    aria-pressed={link.icon === null}
                    className={iconChoice(link.icon === null)}
                    onClick={() => {
                      setLink(index, { icon: null });
                      setIconOpen(null);
                    }}
                  >
                    <LinkGlyph kind={link.kind} icon={null} />
                    <span className="text-sm">
                      {t.iconAuto}
                      <span className="text-muted"> · {t.iconAutoHint}</span>
                    </span>
                  </button>
                  {linkIconKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      title={t.icons[key]}
                      aria-label={t.icons[key]}
                      aria-pressed={link.icon === key}
                      className={iconChoice(link.icon === key)}
                      onClick={() => {
                        setLink(index, { icon: key });
                        setIconOpen(null);
                      }}
                    >
                      <LinkGlyph kind={link.kind} icon={key} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
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
                    icon: null,
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
