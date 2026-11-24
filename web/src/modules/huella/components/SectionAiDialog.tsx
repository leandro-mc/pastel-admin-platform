import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Dialog } from "@/core/ui";
import { fetchSectionPackage, importSection } from "../api/hooks";
import type { CvSection } from "../api/schemas";
import { messageOf } from "../lib/useAiJob";
import { strings } from "../strings";
import { AiWorkbench } from "./AiWorkbench";

const f = strings.studio.editor.free.ai;

type Props = {
  versionId: string;
  /** Sección del CV (`SectionKey`): la que se regenera o se genera por primera vez. */
  section: string;
  title: string;
  /** Qué va a pasar (en una regeneración, que se pierde lo anterior de esa sección). */
  message: string;
  /** El borrador actual, para que la IA no repita lo que dicen las demás secciones. */
  draft: () => unknown;
  /** Vía 1: el proveedor configurado. Quien llama cierra este diálogo y muestra su ventana de progreso. */
  onRun: () => void;
  /** Vía 3: la sección que devolvió la IA externa ya validada por el servidor (aún sin guardar). */
  onImported: (section: CvSection) => void;
  onClose: () => void;
};

/**
 * Regenerar o generar una sección en la edición libre, con las mismas vías que el resto de las acciones de IA: el proveedor
 * configurado (clave del propietario) o una IA externa (descargar el prompt y pegar su respuesta). Las dos pasan por las
 * mismas validaciones del servidor y ninguna guarda: la sección queda en el borrador hasta «Guardar cambios».
 */
export function SectionAiDialog({ versionId, section, title, message, draft, onRun, onImported, onClose }: Props) {
  const notify = useNotify();
  const [preparing, setPreparing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [rejected, setRejected] = useState<readonly string[]>([]);
  const body = () => ({ section, draft: draft() });

  return (
    <Dialog title={title} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-secondary">{message}</p>
        <AiWorkbench
          fileBase={`huella-seccion-${section}`}
          getPackage={async () => {
            setPreparing(true);
            setError(null);
            try {
              return await fetchSectionPackage(versionId, body());
            } catch (e) {
              setError(e);
              throw e;
            } finally {
              setPreparing(false);
            }
          }}
          preparing={preparing}
          onRun={onRun}
          running={false}
          onImport={(json, done) => {
            setError(null);
            setImporting(true);
            importSection(versionId, { ...body(), json })
              .then((result) => {
                setRejected(result.warnings);
                done();
                onImported(result);
              })
              .catch((e: unknown) => {
                setError(e);
                notify(messageOf(e), "error");
              })
              .finally(() => setImporting(false));
          }}
          importing={importing}
          error={error}
          rejected={rejected}
          runLabel={(label, model) => f.run(label, model)}
          externalHint={f.externalHint}
          hideBusy
        />
      </div>
    </Dialog>
  );
}
