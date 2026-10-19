import { Outlet } from "react-router";
import { useAuth } from "@/core/auth";
import ForbiddenPage from "../pages/ForbiddenPage";

type Props = {
  /** Basta con tener uno de estos permisos. */
  anyOf: readonly string[];
};

/** Muestra la página 403 si la persona no tiene ningún permiso de la lista. Va dentro de `RequireAuth`. */
export default function RequirePermission({ anyOf }: Props) {
  const { hasPermission } = useAuth();
  return anyOf.some(hasPermission) ? <Outlet /> : <ForbiddenPage />;
}
