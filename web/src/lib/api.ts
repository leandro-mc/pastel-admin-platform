export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const csrfCookieName = '__Host-pastel_csrf';
let csrfPromise: Promise<void> | null = null;

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  const item = document.cookie.split('; ').find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}

export function ensureCsrf(): Promise<void> {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new ApiError(response.status, 'No se pudo iniciar una sesión segura.');
      })
      .catch((error: unknown) => {
        csrfPromise = null;
        throw error;
      });
  }
  return csrfPromise;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrf();
    let csrf = readCookie(csrfCookieName);
    if (!csrf) {
      // Recover when the CSRF cookie expires in a long-lived browser tab.
      csrfPromise = null;
      await ensureCsrf();
      csrf = readCookie(csrfCookieName);
    }
    if (!csrf) throw new ApiError(400, 'No se encontró el token de seguridad. Recargá la página.');
    headers.set('X-CSRF-TOKEN', csrf);
  }
  const response = await fetch(path, { ...options, method, headers, credentials: 'include', cache: 'no-store' });
  if (!response.ok) {
    let message = `La solicitud falló (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string') message = body.detail;
      else if (typeof body === 'object' && body !== null && 'title' in body && typeof body.title === 'string') message = body.title;
    } catch {
      // Keep the generic message if the server response is not JSON.
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
