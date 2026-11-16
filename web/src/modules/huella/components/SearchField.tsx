import { Search } from "lucide-react";
import { focusClass } from "@/core/ui/styles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Nombre accesible (el campo no muestra etiqueta visible para mantenerse discreto). */
  label: string;
  placeholder?: string;
};

/** Buscador discreto para listas largas. */
export function SearchField({ value, onChange, label, placeholder }: Props) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-fg placeholder:text-muted ${focusClass}`}
      />
    </div>
  );
}

/** Texto sin tildes ni mayúsculas, para que «educacion» encuentre «Educación». */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
