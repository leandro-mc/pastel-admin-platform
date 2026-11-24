import { Navigate } from "react-router";

/** La raíz del módulo lleva al banco, que es donde empieza todo. */
export function Component() {
  return <Navigate to="/huella/banco" replace />;
}
