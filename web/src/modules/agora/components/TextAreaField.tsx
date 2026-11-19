import { useId, type ComponentProps } from "react";
import { inputClass, labelClass } from "@/core/ui/styles";

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "className"> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Área de texto con etiqueta, ayuda y error asociados (el kit de UI de core solo trae campos de una línea). */
export function TextAreaField({
  label,
  hint,
  error,
  id,
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputClass} py-2 leading-relaxed`}
        {...props}
      />
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
