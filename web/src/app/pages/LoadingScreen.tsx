import { LoaderCircle } from "lucide-react";
import { strings } from "../strings";

/** Estado de carga a pantalla completa (sesión o módulo). Respeta `prefers-reduced-motion`. */
export default function LoadingScreen() {
  return (
    <div
      role="status"
      className="flex min-h-[50vh] items-center justify-center gap-3 text-muted"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-6 animate-spin motion-reduce:animate-none"
      />
      <span>{strings.loading}</span>
    </div>
  );
}
