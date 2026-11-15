import { useId, type ComponentProps, type ReactNode } from "react";
import { labelClass, selectClass } from "./styles";

export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type SelectFieldProps = Omit<
  ComponentProps<"select">,
  "children" | "className"
> & {
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  placeholder?: string;
};

/** Selector con etiqueta visible y referencias accesibles de ayuda/error. */
export function SelectField({
  label,
  options,
  hint,
  error,
  placeholder,
  id,
  required,
  ...select
}: SelectFieldProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;
  const describedBy =
    [select["aria-describedby"], hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className={labelClass}>
        {label}
      </label>
      <select
        {...select}
        id={selectId}
        required={required}
        aria-invalid={error ? true : select["aria-invalid"]}
        aria-describedby={describedBy}
        className={selectClass}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
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
