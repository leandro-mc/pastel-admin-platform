import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { api } from "../../src/core/api/client";
import { setSessionExpiredHandler } from "../../src/core/api/session";

// El token CSRF real viaja en una cookie `__Host-` que jsdom no acepta sobre http; se sustituye el módulo.
vi.mock("../../src/core/api/csrf", () => ({
  CSRF_HEADER: "X-CSRF-TOKEN",
  getCsrfToken: () => Promise.resolve("token-de-prueba"),
}));

const okSchema = z.object({ ok: z.boolean() });

type Server = {
  sessionExpired: boolean;
  refreshStatus: number;
  refreshCalls: number;
  calls: string[];
};

function installServer(initial: Partial<Server> = {}): Server {
  const server: Server = {
    sessionExpired: true,
    refreshStatus: 204,
    refreshCalls: 0,
    calls: [],
    ...initial,
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      server.calls.push(`${method} ${path}`);

      if (path === "/api/auth/refresh") {
        server.refreshCalls += 1;
        // Respuesta diferida: da tiempo a que las demás peticiones también reciban 401.
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (server.refreshStatus === 204) server.sessionExpired = false;
        return new Response(null, { status: server.refreshStatus });
      }

      if (server.sessionExpired) {
        return new Response(null, { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return server;
}

beforeEach(() => {
  setSessionExpiredHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionExpiredHandler(null);
});

describe("core/api client", () => {
  it("F0-S202: five simultaneous 401 responses trigger exactly one refresh and all retry successfully", async () => {
    const server = installServer();

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        api.get(`/api/admin/users/${index}`, okSchema, { retries: 0 }),
      ),
    );

    expect(server.refreshCalls).toBe(1);
    expect(results).toEqual(Array.from({ length: 5 }, () => ({ ok: true })));
    // Cada petición se hizo dos veces: la original (401) y el reintento tras el refresco.
    for (let index = 0; index < 5; index += 1) {
      const path = `GET /api/admin/users/${index}`;
      expect(server.calls.filter((call) => call === path)).toHaveLength(2);
    }
  });

  it("F0-S202: a later expiry starts a new refresh instead of reusing the finished one", async () => {
    const server = installServer();
    await api.get("/api/admin/users", okSchema, { retries: 0 });
    expect(server.refreshCalls).toBe(1);

    server.sessionExpired = true;
    await api.get("/api/admin/users", okSchema, { retries: 0 });
    expect(server.refreshCalls).toBe(2);
  });

  it("notifies the expired session when the refresh is rejected and does not retry", async () => {
    const server = installServer({ refreshStatus: 401 });
    const expired = vi.fn();
    setSessionExpiredHandler(expired);

    await expect(
      api.get("/api/admin/users", okSchema, { retries: 0 }),
    ).rejects.toMatchObject({ status: 401 });

    expect(server.refreshCalls).toBe(1);
    expect(expired).toHaveBeenCalled();
    expect(
      server.calls.filter((call) => call === "GET /api/admin/users"),
    ).toHaveLength(1);
  });

  it("does not try to refresh after a 401 from the sign-in routes", async () => {
    const server = installServer();

    await expect(
      api.post("/api/auth/login", okSchema, { email: "a@b.c", password: "x" }),
    ).rejects.toMatchObject({ status: 401 });

    expect(server.refreshCalls).toBe(0);
  });
});
