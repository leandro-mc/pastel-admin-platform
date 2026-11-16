import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { Alert, Button, PageHeader, TextField } from "@/core/ui";
import { useJoinGroup } from "../api/mutations";
import { messageFor } from "../lib/errors";
import { strings } from "../strings";

/** Del texto pegado (enlace completo o solo el token) saca el token: lo que sigue al último «#». */
function extractToken(text: string): string {
  const trimmed = text.trim();
  const index = trimmed.lastIndexOf("#");
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

/**
 * Ingreso con enlace y código. El token llega en el fragmento `#` del enlace (no viaja al servidor al abrir la página) y se envía en el
 * cuerpo. Si el fragmento se perdió (p. ej. tras iniciar sesión), se puede pegar el enlace.
 */
export function Component() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const join = useJoinGroup();
  const linkToken = hash.replace(/^#/, "");
  const [pasted, setPasted] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();
  const token = linkToken || extractToken(pasted);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (token === "") return setLocalError(strings.join.linkRequired);
    if (!/^[0-9]{4}$/.test(code)) return setLocalError(strings.join.codeRule);
    setLocalError(undefined);
    join.mutate({ token, code }, { onSuccess: (joined) => void navigate(`/balance/grupos/${joined.groupId}`) });
  }

  return (
    <div data-module="balance" className="mx-auto flex w-full max-w-lg flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={strings.join.title} description={strings.join.description} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        {join.error ? <Alert variant="error" message={messageFor(join.error)} /> : null}
        {linkToken ? (
          <Alert variant="info" message={strings.join.linkDetected} />
        ) : (
          <TextField
            label={strings.join.link}
            hint={strings.join.linkHint}
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            autoComplete="off"
          />
        )}
        <TextField
          label={strings.join.code}
          hint={strings.join.codeHint}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          error={localError}
        />
        <Button type="submit" loading={join.isPending} loadingLabel={strings.join.joining}>
          {strings.join.submit}
        </Button>
      </form>
    </div>
  );
}
