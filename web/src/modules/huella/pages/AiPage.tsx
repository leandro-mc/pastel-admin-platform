import { useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Badge,
  Button,
  CheckboxField,
  ConfirmDialog,
  PageHeader,
  Panel,
  SelectField,
  TextField,
} from "@/core/ui";
import {
  useAiModels,
  useAiSettings,
  useDeleteAiCredential,
  useSaveAiCredential,
} from "../api/hooks";
import type { AiModel, AiProvider, AiSettings } from "../api/schemas";
import { ErrorNotice, Loaded, fieldError } from "../components/Form";
import { strings } from "../strings";

const t = strings.aiSettings;

/** Dónde crear la clave de cada proveedor (sitios oficiales). */
const KEY_PAGES: Record<string, string> = {
  gemini: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
};

export function Component() {
  const settings = useAiSettings();
  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader title={t.title} description={t.description} />
      <Loaded query={settings}>
        {(data) => <ProviderForm settings={data} />}
      </Loaded>
    </div>
  );
}

function ProviderForm({ settings }: { settings: AiSettings }) {
  const [providerId, setProviderId] = useState(
    settings.activeProvider ?? settings.providers[0]?.id ?? "gemini",
  );
  const provider = settings.providers.find((p) => p.id === providerId);
  return (
    <Panel title={t.provider} description={t.privacy}>
      <div className="flex flex-col gap-5">
        <SelectField
          label={t.provider}
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          options={settings.providers.map((p) => ({
            value: p.id,
            label: `${p.label}${p.isActive ? ` · ${t.active}` : p.configured ? ` · ${t.configured}` : ""}`,
          }))}
        />
        {provider ? (
          <CredentialEditor key={provider.id} provider={provider} />
        ) : null}
      </div>
    </Panel>
  );
}

function CredentialEditor({ provider }: { provider: AiProvider }) {
  const notify = useNotify();
  const save = useSaveAiCredential();
  const remove = useDeleteAiCredential();
  const models = useAiModels();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(provider.model ?? provider.defaultModel);
  const [makeActive, setMakeActive] = useState(
    provider.isActive || !provider.configured,
  );
  const [confirming, setConfirming] = useState(false);
  const [list, setList] = useState<readonly AiModel[]>([]);

  const options = (
    list.some((m) => m.id === model)
      ? list
      : [{ id: model, label: model }, ...list]
  ).map((m) => ({ value: m.id, label: m.label }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {provider.isActive ? <Badge variant="accent">{t.active}</Badge> : null}
        <Badge variant={provider.configured ? "success" : "neutral"}>
          {provider.configured ? t.configured : t.notConfigured}
        </Badge>
        <a
          href={KEY_PAGES[provider.id]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent-strong underline"
        >
          {t.getKey}
        </a>
      </div>
      {provider.configured && !provider.readable ? (
        <p className="text-sm text-danger">{t.unreadable}</p>
      ) : null}

      <TextField
        label={t.apiKey}
        type="password"
        revealable
        autoComplete="off"
        spellCheck={false}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        hint={
          provider.configured && provider.keyHint
            ? t.apiKeyKept(provider.keyHint)
            : t.apiKeyNew
        }
        error={fieldError(save.error ?? models.error, "apiKey")}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <SelectField
            label={t.model}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            options={options}
            hint={t.modelHint}
            error={fieldError(save.error, "model")}
          />
        </div>
        <Button
          variant="secondary"
          type="button"
          disabled={apiKey.trim() === "" && !provider.configured}
          loading={models.isPending}
          onClick={() =>
            models.mutate(
              { provider: provider.id, apiKey: apiKey.trim() || null },
              {
                onSuccess: (found) => {
                  setList(found);
                  if (found.length > 0 && !found.some((m) => m.id === model)) {
                    setModel(
                      found.find((m) => m.id === provider.defaultModel)?.id ??
                        found[0]!.id,
                    );
                  }
                  notify(t.modelsLoaded(found.length));
                },
              },
            )
          }
        >
          {t.loadModels}
        </Button>
      </div>

      <CheckboxField
        label={t.makeActive}
        checked={makeActive}
        onChange={(e) => setMakeActive(e.target.checked)}
      />

      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          type="button"
          loading={save.isPending}
          loadingLabel={strings.common.saving}
          disabled={apiKey.trim() === "" && !provider.configured}
          onClick={() =>
            save.mutate(
              {
                provider: provider.id,
                apiKey: apiKey.trim() || null,
                model,
                makeActive,
              },
              {
                onSuccess: () => {
                  setApiKey("");
                  notify(t.saved);
                },
              },
            )
          }
        >
          {t.save}
        </Button>
        {provider.configured ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setConfirming(true)}
          >
            {t.remove}
          </Button>
        ) : null}
      </div>
      <ErrorNotice error={save.error ?? models.error ?? remove.error} />

      {confirming ? (
        <ConfirmDialog
          title={t.removeConfirm}
          message={t.removeDescription}
          confirmLabel={t.remove}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            remove.mutate(provider.id, {
              onSuccess: () => {
                setConfirming(false);
                notify(t.removed);
              },
            })
          }
        />
      ) : null}
    </div>
  );
}
