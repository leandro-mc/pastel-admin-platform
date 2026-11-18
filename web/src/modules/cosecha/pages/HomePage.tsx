import { Navigate } from "react-router";
import { useAuth } from "@/core/auth";
import { StateView } from "@/core/ui";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { TodayPage } from "./TodayPage";

/**
 * Portada del módulo según lo que la cuenta puede ver: el gestor entra a «Hoy»; un comprador va directo a «Mis pedidos»;
 * una cuenta sin pantallas disponibles recibe una explicación en vez de una página vacía.
 */
export function Component() {
  const { hasPermission } = useAuth();
  if (hasPermission(cosechaPermissions.shipmentsRead)) return <TodayPage />;
  if (hasPermission(cosechaPermissions.ordersReadOwn)) {
    return <Navigate to={cosechaPaths.myOrders} replace />;
  }
  return (
    <section data-module="cosecha" className="mx-auto max-w-xl p-8">
      <StateView status="empty" title={strings.name} description={strings.today.noAccess} />
    </section>
  );
}
