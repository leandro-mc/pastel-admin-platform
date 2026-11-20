import { CircleCheck, CircleX } from "lucide-react";
import { Badge, Panel } from "@/core/ui";
import type { BuiltPalette, Check } from "../lib/appearance/palette";
import { strings } from "../strings";

const t = strings.appearance.checks;

function Ratio({ label, value, min }: { label: string; value: number; min: number }) {
  const ok = value >= min;
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <Badge variant={ok ? "success" : "danger"}>
      <Icon aria-hidden="true" className="size-3.5" />
      <span>
        {label} {t.ratio(value)}
      </span>
      <span className="sr-only">{ok ? t.ok : t.fail}</span>
    </Badge>
  );
}

function Row({ check }: { check: Check }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{t.items[check.id]}</p>
        <p className="text-xs text-muted">{t.min(check.min)}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Ratio label={t.light} value={check.light} min={check.min} />
        <Ratio label={t.dark} value={check.dark} min={check.min} />
      </div>
    </li>
  );
}

/** Contraste de los pares que importan (WCAG AA), calculado para el modo claro y el oscuro de la paleta. */
export function PaletteChecks({ built }: { built: BuiltPalette }) {
  return (
    <Panel title={t.title} description={t.description} headingLevel="h3">
      <ul className="flex flex-col divide-y divide-line">
        {built.checks.map((check) => (
          <Row key={check.id} check={check} />
        ))}
      </ul>
    </Panel>
  );
}
