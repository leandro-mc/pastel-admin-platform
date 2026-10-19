import { Check, CircleHelp } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type NoticeTone = "success" | "error";
export type Notify = (message: string, tone?: NoticeTone) => void;

type Notice = { id: number; message: string; tone: NoticeTone };

const NotificationsContext = createContext<Notify | null>(null);

// Transitorio: el estilo heredado `.toast` es fixed y varios se solaparían; WP8 lo sustituye por el kit de UI (cola real).
const MAX_VISIBLE = 1;
const DURATION_MS: Record<NoticeTone, number> = { success: 5000, error: 9000 };

/**
 * Avisos transitorios (no reemplazan a los errores junto al campo ni a las pantallas de error).
 * Región viva: los éxitos se anuncian con `status` y los errores con `alert`. El visual se rehace con el kit de UI en WP8.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotices((current) => current.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (message, tone = "success") => {
      const id = nextId.current++;
      setNotices((current) =>
        [...current, { id, message, tone }].slice(-MAX_VISIBLE),
      );
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), DURATION_MS[tone]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <>
        {notices.map((notice) => (
          <div
            key={notice.id}
            role={notice.tone === "error" ? "alert" : "status"}
            className={`toast ${notice.tone}`}
          >
            <span className="toast-symbol">
              {notice.tone === "success" ? (
                <Check size={17} />
              ) : (
                <CircleHelp size={17} />
              )}
            </span>
            <span>{notice.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(notice.id)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        ))}
      </>
    </NotificationsContext.Provider>
  );
}

export function useNotify(): Notify {
  const value = useContext(NotificationsContext);
  if (!value)
    throw new Error("useNotify debe usarse dentro de NotificationsProvider.");
  return value;
}
