import { Moon, Sun } from "lucide-react";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TooltipTrigger,
} from "react-aria-components";
import { usePreferences, type TextSize } from "@/core/preferences";
import { shellStrings } from "../strings";
import { useShell } from "./ShellContext";
import TextSizeGlyph from "./TextSizeGlyph";

const { account, preferences } = shellStrings;

/** Una «A» por tamaño, de menor a mayor: el tamaño del dibujo ya dice qué hace cada botón. */
const sizes: { id: TextSize; label: string; px: number }[] = [
  { id: "small", label: account.small, px: 14 },
  { id: "normal", label: account.normal, px: 17 },
  { id: "large", label: account.large, px: 20 },
  { id: "xlarge", label: account.xlarge, px: 24 },
];

const isTextSize = (value: unknown): value is TextSize =>
  sizes.some((size) => size.id === value);

/**
 * Tema y tamaño de texto como controles de icono, sin listas de texto: un único botón luna/sol (igual que en el inicio de
 * sesión) y una fila de «A» de cuatro tamaños con la elegida marcada. Cada botón muestra su nombre al pasar el cursor o
 * enfocarlo. Se fijan una vez, por eso viven en el menú de cuenta («Preferencias» si no hay sesión) y no en la barra.
 */
export default function PreferenceControls() {
  const { theme, toggleTheme, textSize, setTextSize } = usePreferences();
  const { moduleCode } = useShell();
  const themeLabel =
    theme === "light" ? preferences.themeToDark : preferences.themeToLight;

  return (
    <div className="shell-prefs">
      <div className="shell-pref-row">
        <span className="shell-pref-label">{preferences.appearance}</span>
        <TooltipTrigger delay={400}>
          <Button
            className="shell-btn shell-theme-btn"
            aria-label={themeLabel}
            onPress={toggleTheme}
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" />
            ) : (
              <Sun aria-hidden="true" />
            )}
          </Button>
          <Tooltip className="shell-tooltip" data-module={moduleCode}>
            {themeLabel}
          </Tooltip>
        </TooltipTrigger>
      </div>

      <div className="shell-pref-stack">
        <span className="shell-pref-label" id="shell-size-label">
          {account.textSize}
        </span>
        <ToggleButtonGroup
          aria-labelledby="shell-size-label"
          className="shell-size-group"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[textSize]}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (isTextSize(next)) setTextSize(next);
          }}
        >
          {sizes.map((size) => (
            <TooltipTrigger key={size.id} delay={400}>
              <ToggleButton
                id={size.id}
                aria-label={size.label}
                className="shell-size-btn"
              >
                <TextSizeGlyph px={size.px} />
              </ToggleButton>
              <Tooltip className="shell-tooltip" data-module={moduleCode}>
                {size.label}
              </Tooltip>
            </TooltipTrigger>
          ))}
        </ToggleButtonGroup>
      </div>
    </div>
  );
}
