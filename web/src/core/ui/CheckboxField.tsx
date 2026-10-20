import { useId, type ComponentProps, type ReactNode } from "react";
import { checkboxClass, labelClass } from "./styles";

export type CheckboxFieldProps = Omit<
  ComponentProps<"input">,
  "className" | "type"
> & {
  label: ReactNode;
  description?: string;
  error?: string;
};

/** Casilla nativa con etiqueta/ayuda/error y una zona táctil amplia. */
export function CheckboxField({
  label,
  description,
  error,
  id,
  ...input
}: CheckboxFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [input["aria-describedby"], description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="flex min-h-11 items-start gap-3 text-sm text-fg">
        <input
          {...input}
          id={inputId}
          type="checkbox"
          className={checkboxClass}
          aria-invalid={error ? true : input["aria-invalid"]}
          aria-describedby={describedBy}
        />
        <span className="flex flex-col gap-1">
          <span className={labelClass}>{label}</span>
          {description ? <span id={descriptionId} className="text-sm text-muted">{description}</span> : null}
        </span>
      </label>
      {error ? <p id={errorId} className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
