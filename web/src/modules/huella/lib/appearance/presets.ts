import type { PaletteColors } from "./palette";

export type PaletteDef = {
  id: string;
  name: string;
  /** Una línea que diga cómo se siente (texto de la tarjeta). */
  description: string;
  colors: PaletteColors;
  /** Las predefinidas no se editan ni se borran; una propia sí. */
  builtIn: boolean;
};

/** Id de la paleta que ya trae `module-themes.css`: elegirla quita cualquier ajuste y deja la hoja base. */
export const DEFAULT_PALETTE_ID = "grafito";

/**
 * Tres paletas pensadas para trabajar horas con ellas: saturación baja, sin brillos, sin morado. La primera es la que
 * trae la aplicación (`module-themes.css`); sus cuatro colores sirven para partir de ella al crear una propia.
 */
export const PRESETS: readonly PaletteDef[] = [
  {
    id: DEFAULT_PALETTE_ID,
    name: "Grafito",
    description: "Neutra y sobria: gris frío con acento grafito.",
    colors: { fondo: "#eaecf0", texto: "#0d1117", acento: "#3a414b", realce: "#3a414b" },
    builtIn: true,
  },
  {
    id: "arena",
    name: "Arena",
    description: "Cálida y de papel: tonos tierra con acento marrón.",
    colors: { fondo: "#eeeae2", texto: "#26211c", acento: "#6b4a32", realce: "#8a6a3c" },
    builtIn: true,
  },
  {
    id: "acero",
    name: "Acero",
    description: "Fría y serena: gris azulado con acento azul apagado.",
    colors: { fondo: "#e7ebf0", texto: "#10161d", acento: "#3f5a78", realce: "#3f5a78" },
    builtIn: true,
  },
  {
    id: "vino",
    name: "Vino",
    description: "Elegante y cálida: gris rosado con acento vino.",
    colors: { fondo: "#efeaea", texto: "#231d1e", acento: "#7a2e3b", realce: "#8f4452" },
    builtIn: true,
  },
];
