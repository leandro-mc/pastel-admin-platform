import { X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { focusClass } from "@/core/ui/styles";
import type { Skill } from "../api/schemas";
import { strings } from "../strings";
import { SearchField, fold } from "./SearchField";

const t = strings.bank.achievements;
const MAX_SUGGESTIONS = 8;

type Props = {
  skills: readonly Skill[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
};

/**
 * Habilidades que demuestra un logro. No lista todas las del banco: solo las agregadas (como etiquetas) y un buscador
 * que ofrece las que aún no están. Así la pantalla no se llena con cientos de casillas.
 */
export function SkillPicker({ skills, selectedIds, onChange }: Props) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => skills.find((s) => s.id === id))
        .filter((s): s is Skill => s !== undefined),
    [selectedIds, skills],
  );
  const needle = fold(query.trim());
  const suggestions = useMemo(
    () =>
      needle === ""
        ? []
        : skills
            .filter(
              (s) =>
                !selectedIds.includes(s.id) &&
                fold(`${s.name} ${s.aliases ?? ""} ${s.category}`).includes(
                  needle,
                ),
            )
            .slice(0, MAX_SUGGESTIONS),
    [skills, selectedIds, needle],
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-fg">{t.skills}</p>
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t.skills}>
          {selected.map((skill) => (
            <li
              key={skill.id}
              className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-accent-soft py-0.5 pr-1 pl-3 text-sm text-fg"
            >
              {skill.name}
              <button
                type="button"
                aria-label={`${t.removeSkill}: ${skill.name}`}
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== skill.id))
                }
                className={`inline-grid size-7 place-items-center rounded-full text-fg-secondary hover:bg-surface ${focusClass}`}
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t.noSkills}</p>
      )}
      {skills.length === 0 ? (
        <p className="text-sm text-muted">{t.bankHasNoSkills}</p>
      ) : (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            label={t.skillSearch}
          />
          {needle !== "" ? (
            suggestions.length > 0 ? (
              <ul
                id={listId}
                aria-label={t.skillSearch}
                className="flex flex-wrap gap-2"
              >
                {suggestions.map((skill) => (
                  <li key={skill.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...selectedIds, skill.id]);
                        setQuery("");
                      }}
                      className={`min-h-9 rounded-full border border-line px-3 text-sm text-fg hover:bg-accent-soft ${focusClass}`}
                    >
                      {t.addSkill(skill.name)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t.noSkillMatches}</p>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
