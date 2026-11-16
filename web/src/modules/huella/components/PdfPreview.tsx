import { useEffect, useRef, useState } from "react";
import { Button, Panel } from "@/core/ui";
import { strings } from "../strings";
import { ErrorNotice } from "./Form";

const t = strings.studio.preview;

type Props = {
  title: string;
  /** Pide el PDF con la sesión vigente (no un enlace directo: el token de acceso puede haber vencido). */
  load: () => Promise<Blob>;
  /** Cambia cuando el documento cambia en el servidor (p. ej. `updatedAt`): vuelve a pedir el PDF. */
  version: string;
  available: boolean;
};

/**
 * Vista previa del PDF real (el mismo que se descarga) con el visor del navegador, sin descargarlo. El archivo se pide
 * con la sesión y se muestra desde una URL `blob:` local (la CSP solo admite marcos propios: `frame-src 'self' blob:`).
 */
export function PdfPreview({ title, load, version, available }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  // `load` cambia en cada render; el documento se identifica por `version`.
  const loader = useRef(load);
  loader.current = load;

  useEffect(() => {
    if (!available) return;
    let active = true;
    let created: string | null = null;
    setUrl(null);
    setError(null);
    loader
      .current()
      .then((blob) => {
        if (!active) return;
        created = URL.createObjectURL(
          blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" }),
        );
        setUrl(created);
      })
      .catch((e: unknown) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [version, available, attempt]);

  return (
    <Panel
      title={t.title}
      description={t.description}
      actions={
        url ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() => window.open(url, "_blank", "noopener")}
          >
            {t.openTab}
          </Button>
        ) : null
      }
    >
      {!available ? (
        <p className="text-sm text-muted">{t.unavailable}</p>
      ) : error ? (
        <div className="flex flex-col items-start gap-3">
          <ErrorNotice error={error} />
          <Button variant="secondary" type="button" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </Button>
        </div>
      ) : url ? (
        <iframe
          title={title}
          src={`${url}#view=FitH`}
          className="h-[80vh] min-h-[28rem] w-full rounded-lg border border-line bg-surface"
        />
      ) : (
        <p role="status" className="text-sm text-muted">
          {t.loading}
        </p>
      )}
    </Panel>
  );
}
