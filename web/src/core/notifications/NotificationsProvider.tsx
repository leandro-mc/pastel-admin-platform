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

// Transitorio: la posición es fija y varios avisos se solaparían, por eso se muestra uno a la vez; la cola real llega con el kit de UI.
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
            className="fixed right-3 bottom-3 z-50 flex max-w-[min(27rem,calc(100vw-1.5rem))] animate-toast-in items-center gap-3 rounded-xl border border-line bg-surface-raised p-3 text-sm text-fg shadow-lg sm:right-6 sm:bottom-6"
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full ${
                notice.tone === "error"
                  ? "bg-danger-soft text-danger"
                  : "bg-accent-soft text-accent-strong"
              }`}
            >
              {notice.tone === "success" ? (
                <Check aria-hidden="true" size={17} />
              ) : (
                <CircleHelp aria-hidden="true" size={17} />
              )}
            </span>
            <span>{notice.message}</span>
            <button
              type="button"
              className="-my-2 -mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-xl text-muted hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none"
              onClick={() => dismiss(notice.id)}
              aria-label="Cerrar aviso"
            >
              <span aria-hidden="true">×</span>
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
