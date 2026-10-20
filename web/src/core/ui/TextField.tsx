import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { uiStrings } from "./strings";
import { inputClass, labelClass } from "./styles";

export type TextFieldProps = Omit<
  ComponentProps<"input">,
  "className"
> & {
  label: string;
  error?: string;
  hint?: string;
  revealable?: boolean;
  revealLabels?: { show: string; hide: string };
};

/** Campo etiquetado con ayuda y error asociados a través de aria-describedby. */
export function TextField({
  label,
  error,
  hint,
  revealable = false,
  revealLabels = {
    show: uiStrings.password.show,
    hide: uiStrings.password.hide,
  },
  id,
  type,
  ...input
}: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [input["aria-describedby"], hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const [revealed, setRevealed] = useState(false);

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
          aria-invalid={error ? true : input["aria-invalid"]}
          aria-describedby={describedBy}
          className={revealable ? `${inputClass} pr-12` : inputClass}
        />
        {revealable ? (
          <button
            type="button"
            aria-pressed={revealed}
            aria-label={revealed ? revealLabels.hide : revealLabels.show}
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-xl text-muted hover:text-fg focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        ) : null}
      </div>
      {hint ? <p id={hintId} className="text-sm text-muted">{hint}</p> : null}
      {error ? <p id={errorId} className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
