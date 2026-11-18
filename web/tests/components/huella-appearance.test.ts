import { describe, expect, it } from "vitest";
import { isPurple } from "../../src/modules/huella/lib/appearance/color";
import { buildPalette, parseColors } from "../../src/modules/huella/lib/appearance/palette";
import { PRESETS } from "../../src/modules/huella/lib/appearance/presets";

// Regla dura de diseño («sin morado») y accesibilidad (WCAG AA): ninguna paleta, predefinida o propia, puede romperlas.
describe("paletas de Huella", () => {
  it("las predefinidas cumplen el contraste mínimo en claro y en oscuro y no usan morado", () => {
    for (const preset of PRESETS) {
      const built = buildPalette(preset.colors);
      expect(built.purple, preset.name).toEqual([]);
      for (const check of built.checks) {
        expect(check.light, `${preset.name} · ${check.id} (claro)`).toBeGreaterThanOrEqual(check.min);
        expect(check.dark, `${preset.name} · ${check.id} (oscuro)`).toBeGreaterThanOrEqual(check.min);
      }
    }
  });

  it("una paleta propia con un tono morado se rechaza y una con un color chillón se ajusta", () => {
    expect(parseColors({ fondo: "#eaecf0", texto: "#0d1117", acento: "#7b3fa0", realce: "#7b3fa0" }).errors.acento).toBe(
      "purple",
    );
    expect(parseColors({ fondo: "zzz", texto: "#0d1117", acento: "#3a414b", realce: "#3a414b" }).errors.fondo).toBe(
      "invalid",
    );

    const neon = parseColors({ fondo: "#e0fffa", texto: "#00332e", acento: "#00ffd5", realce: "#00ffd5" });
    expect(neon.colors).not.toBeNull();
    const built = buildPalette(neon.colors!);
    expect(built.resolved.acento).not.toBe("#00ffd5");
    expect(built.checks.every((c) => c.light >= c.min && c.dark >= c.min)).toBe(true);
  });

  it("un casi-blanco neutro no cuenta como morado pero un lavanda real sí", () => {
    expect(isPurple("#f8f8fa")).toBe(false);
    expect(isPurple("#f3eef9")).toBe(true);
  });
});
