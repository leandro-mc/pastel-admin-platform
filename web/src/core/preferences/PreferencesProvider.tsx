import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { log } from "@/core/log";

export type Theme = "light" | "dark";
export type TextSize = "small" | "normal" | "large" | "xlarge";

/** Escala global del texto y de las medidas expresadas en rem; Normal sigue siendo el valor recomendado. */
export const TEXT_SIZE_PERCENT: Record<TextSize, number> = {
  small: 90,
  normal: 100,
  large: 115,
  xlarge: 130,
};

const THEME_KEY = "pastel-theme";
const TEXT_SIZE_KEY = "pastel-text-size";

type PreferencesValue = {
  theme: Theme;
  textSize: TextSize;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setTextSize: (size: TextSize) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

// Son preferencias no sensibles; el almacenamiento puede estar bloqueado (modo privado), por eso todo va protegido.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    log.warn("No se pudo guardar la preferencia", error);
  }
}

function initialTheme(): Theme {
  const stored = read(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Primera visita: se respeta la preferencia del sistema.
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function initialTextSize(): TextSize {
  const stored = read(TEXT_SIZE_KEY);
  return stored === "small" || stored === "large" || stored === "xlarge" ? stored : "normal";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [textSize, setTextSizeState] = useState<TextSize>(initialTextSize);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    // Toda la interfaz usa rem: cambiar el tamaño de la raíz escala todo.
    document.documentElement.style.fontSize = `${TEXT_SIZE_PERCENT[textSize]}%`;
  }, [textSize]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    write(THEME_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      write(THEME_KEY, next);
      return next;
    });
  }, []);

  const setTextSize = useCallback((next: TextSize) => {
    setTextSizeState(next);
    write(TEXT_SIZE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ theme, textSize, setTheme, toggleTheme, setTextSize }),
    [theme, textSize, setTheme, toggleTheme, setTextSize],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value)
    throw new Error(
      "usePreferences debe usarse dentro de PreferencesProvider.",
    );
  return value;
}
