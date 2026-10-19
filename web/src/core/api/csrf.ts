import { ApiError } from "./errors";
import { apiMessages } from "./messages";

const CSRF_COOKIE = "__Host-pastel_csrf";
export const CSRF_HEADER = "X-CSRF-TOKEN";

let pending: Promise<void> | null = null;

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  const item = document.cookie.split("; ").find((v) => v.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}

function requestToken(): Promise<void> {
  pending ??= fetch("/api/auth/csrf", {
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        throw new ApiError({
          status: response.status,
          code: "client.csrf_unavailable",
          detail: apiMessages.csrf,
        });
      }
    })
    .catch((error: unknown) => {
      pending = null;
      throw error instanceof ApiError
        ? error
        : new ApiError({
            status: 0,
            code: "client.network",
            detail: apiMessages.network,
            cause: error,
          });
    });
  return pending;
}

/** Devuelve el token CSRF vigente; lo solicita (una sola vez a la vez) si la cookie no existe o venció. */
export async function getCsrfToken(): Promise<string> {
  await requestToken();
  let token = readCookie(CSRF_COOKIE);
  if (!token) {
    pending = null;
    await requestToken();
    token = readCookie(CSRF_COOKIE);
  }
  if (!token) {
    throw new ApiError({
      status: 400,
      code: "client.csrf_missing",
      detail: apiMessages.csrf,
    });
  }
  return token;
}
