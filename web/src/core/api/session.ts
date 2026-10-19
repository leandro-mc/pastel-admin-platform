/**
 * Aviso de sesión vencida. El proveedor de sesión (AuthProvider) registra aquí qué hacer; el cliente API solo avisa.
 * Como la cookie de sesión es HttpOnly, el cliente no sabe si hubo sesión: el proveedor decide si el aviso aplica
 * (una persona anónima que consulta `/api/auth/me` no debe ver «Su sesión venció»).
 */
type Listener = () => void;

let listener: Listener | null = null;

export function setSessionExpiredHandler(handler: Listener | null): void {
  listener = handler;
}

export function notifySessionExpired(): void {
  listener?.();
}
