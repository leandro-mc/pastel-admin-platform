import { useAuth } from "@/core/auth";
import type { Group } from "../api/schemas";

/** La interfaz solo oculta lo que el servidor rechazaría: escribir exige el permiso y un grupo abierto. El servidor decide siempre. */
export function useCanWrite(group: Group | undefined): boolean {
  const { hasPermission } = useAuth();
  return Boolean(group) && !group?.isClosed && hasPermission("balance.groups.manage");
}
