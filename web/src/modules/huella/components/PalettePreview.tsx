import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Alert, Badge, Button } from "@/core/ui";
import { inputClass, labelClass } from "@/core/ui/styles";
import type { Mode, Tokens } from "../lib/appearance/palette";
import { chipClass, markedBadge, markedSurface, nestedCard } from "../lib/marker";
import { strings } from "../strings";

const t = strings.appearance.preview.sample;
const sidebarItems = [strings.nav.bank, strings.nav.studio, strings.nav.history] as const;

type Props = {
  tokens: Tokens;
  mode: Mode;
};

/**
 * La pantalla «Crear CV y carta» en pequeño, pintada con los tokens de una paleta (variables CSS en línea, por CSSOM: la CSP
 * no admite estilos escritos como texto). Usa los componentes reales del núcleo, así que lo que se ve aquí es lo que se
 * obtiene en la aplicación: nivel de fondo → panel → tarjeta, tres niveles de texto, acciones por jerarquía, lo elegido y
 * los estados. Es solo una muestra: va oculta a los lectores de pantalla (las comprobaciones de contraste son la versión
 * accesible) y sin foco ni interacción.
 */
export function PalettePreview({ tokens, mode }: Props) {
  return (
    <div
      aria-hidden="true"
      inert
      style={{ ...(tokens as CSSProperties), colorScheme: mode }}
      className="overflow-hidden rounded-2xl border border-line-strong bg-app text-fg"
    >
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)]">
        <nav className="flex flex-col gap-1 border-r border-line bg-[var(--sidebar-bg)] p-2">
          {sidebarItems.map((item, index) => (
            <span
              key={item}
              className={`rounded-lg px-2 py-2 text-xs font-medium ${
                index === 1 ? "bg-accent-soft font-semibold text-accent-strong" : "text-fg-secondary"
              }`}
            >
              {item}
            </span>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
          <header>
            <p className="text-lg font-semibold tracking-tight text-fg">{t.pageTitle}</p>
            <p className="text-xs text-muted">{t.pageDescription}</p>
          </header>

          <div className="flex gap-1 border-b border-line">
            {t.tabs.map((tab, index) => (
              <span
                key={tab}
                className={`border-b-2 px-2.5 py-1.5 text-xs font-medium ${
                  index === 1 ? "border-accent-strong text-accent-strong" : "border-transparent text-fg-secondary"
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-soft)]">
            <div>
              <p className="text-sm font-semibold text-fg">{t.panelTitle}</p>
              <p className="text-xs text-muted">{t.panelText}</p>
            </div>

            <div className={`flex flex-col gap-2 rounded-xl border p-3 ${nestedCard}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-fg">{t.cardTitle}</p>
                  <p className="text-xs text-fg-secondary">{t.cardCompany}</p>
                  <p className="text-xs text-muted">{t.cardMeta}</p>
                </div>
                <Badge variant="neutral">{t.badges.neutral}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="info">{t.badges.info}</Badge>
                <Badge variant="success">{t.badges.success}</Badge>
                <Badge variant="warning">{t.badges.warning}</Badge>
                <Badge variant="danger">{t.badges.danger}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="tonal" type="button">
                  {t.buttons.tonal}
                </Button>
                <Button variant="secondary" type="button">
                  {t.buttons.secondary}
                </Button>
                <Button variant="quietDanger" type="button">
                  {t.buttons.danger}
                </Button>
              </div>
            </div>

            <div className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${markedSurface}`}>
              <div>
                <p className="text-sm font-semibold text-fg">{t.cardTitle}</p>
                <p className="text-xs text-fg-secondary">{t.cardCompany}</p>
              </div>
              <span className={markedBadge}>
                <Check aria-hidden="true" className="size-3.5" />
                {strings.studio.offers.selected}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={chipClass(true)}>
                <Check aria-hidden="true" className="size-4" />
                {t.chips[0]}
              </span>
              <span className={chipClass(false)}>{t.chips[1]}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t.field}</span>
              <span className={`${inputClass} flex items-center`}>{t.fieldValue}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" type="button">
                {t.buttons.primary}
              </Button>
              <Button variant="ghost" type="button">
                {t.buttons.ghost}
              </Button>
              <span className="text-sm font-medium text-accent-strong underline">{t.link}</span>
            </div>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <Alert variant="info" message={t.info} />
            <Alert variant="warning" message={t.warning} />
            <Alert variant="success" message={t.success} />
            <Alert variant="error" message={t.error} />
          </div>
        </div>
      </div>
    </div>
  );
}
