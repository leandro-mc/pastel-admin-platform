import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { identityStrings } from "../strings";
import { inputClass, labelClass } from "../styles";

export type TextFieldProps = Omit<ComponentProps<"input">, "className"> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  /** Para contraseñas: agrega el botón de mostrar/ocultar. */
  revealable?: boolean;
};

/** Campo con etiqueta visible, ayuda y error asociados (`aria-describedby`). Compatible con `register` de react-hook-form. */
export function TextField({
  label,
  error,
  hint,
  revealable = false,
  id,
  type,
  ...input
}: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [revealed, setRevealed] = useState(false);
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          {...input}
          id={inputId}
          type={revealable && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={revealable ? `${inputClass} pr-12` : inputClass}
        />
        {revealable ? (
          <button
            type="button"
            aria-pressed={revealed}
            aria-label={
              revealed
                ? identityStrings.login.hidePassword
                : identityStrings.login.showPassword
            }
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-xl text-muted hover:text-fg focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none"
          >
            {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
