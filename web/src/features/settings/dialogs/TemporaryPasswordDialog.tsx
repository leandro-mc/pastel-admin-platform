import { KeyRound, X } from "lucide-react";
import type { Notify } from "../../types";

type TemporaryPasswordDialogProps = {
  password: string;
  onClose: () => void;
  notify: Notify;
};

export function TemporaryPasswordDialog({
  password,
  onClose,
  notify,
}: TemporaryPasswordDialogProps) {
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      notify("Contraseña copiada al portapapeles.", "success");
    } catch {
      notify(
        "No se pudo copiar automáticamente. Copiá la contraseña manualmente.",
        "error",
      );
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <span className="eyebrow">RESTABLECIMIENTO COMPLETO</span>
            <h2>Contraseña temporal</h2>
            <p>
              Copiala ahora y entregala al usuario por un canal seguro. No se
              volverá a mostrar.
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="modal-content">
          <div className="temporary-password">{password}</div>
          <button
            className="button button-soft full-width"
            onClick={() => void copyPassword()}
          >
            <KeyRound size={16} /> Copiar contraseña
          </button>
        </div>

        <div className="modal-actions">
          <button className="button button-primary" onClick={onClose}>
            Listo, ya la guardé
          </button>
        </div>
      </section>
    </div>
  );
}
