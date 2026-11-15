import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/core/api";
import {
  AuthContext,
  useAuth,
  type AuthContextValue,
} from "../../src/core/auth";
import {
  DEVELOPER_MODE_PERMISSION,
  DevModeProvider,
  NO_ROLE,
  appCodeForPath,
  applySimulation,
  useDevMode,
} from "../../src/core/devmode";
import {
  readSelection,
  writeSelection,
} from "../../src/core/devmode/simulation";

vi.mock("../../src/core/api", () => ({ api: { get: vi.fn() } }));

const apps = [
  { code: "identity", basePath: "/configuracion" },
  { code: "brisa", basePath: "/brisa" },
];
const resolveApp = (pathname: string) => appCodeForPath(pathname, apps);

const brisaRoles = {
  app: "brisa",
  appPermissions: ["brisa.access", "brisa.items.manage"],
  roles: [
    {
      name: "Brisa — Usuario",
      description: null,
      isSystemRole: false,
      permissions: ["brisa.access"],
    },
  ],
};

function fakeAuth(permissions: string[], userId = "u1"): AuthContextValue {
  const set = new Set(permissions);
  return {
    status: "authenticated",
    user: { id: userId } as AuthContextValue["user"],
    permissions: set,
    error: null,
    sessionExpired: false,
    hasPermission: (code) => set.has(code),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    reload: vi.fn(),
    clearSessionExpired: vi.fn(),
  };
}

function Probe() {
  const auth = useAuth();
  const dev = useDevMode();
  return (
    <div>
      <p data-testid="manage">
        {String(auth.hasPermission("brisa.items.manage"))}
      </p>
      <p data-testid="access">{String(auth.hasPermission("brisa.access"))}</p>
      <p data-testid="settings">
        {String(auth.hasPermission("settings.users.read"))}
      </p>
      <p data-testid="enabled">{String(dev.enabled)}</p>
      <p data-testid="simulating">{String(dev.simulating)}</p>
      <button onClick={() => dev.select("Brisa — Usuario")}>elegir</button>
      <button onClick={() => dev.select(NO_ROLE)}>sin rol</button>
      <button onClick={() => dev.select(null)}>real</button>
    </div>
  );
}

function renderAt(path: string, auth: AuthContextValue) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={auth}>
          <DevModeProvider resolveApp={resolveApp}>
            <Probe />
          </DevModeProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const real = [
  DEVELOPER_MODE_PERMISSION,
  "settings.users.read",
  "brisa.access",
  "brisa.items.manage",
];

beforeEach(() => {
  window.sessionStorage.clear();
  vi.mocked(api.get).mockResolvedValue(brisaRoles);
});
afterEach(cleanup);

describe("core/devmode — lógica pura", () => {
  it("reemplaza solo la porción de la app activa y deja intacto el resto", () => {
    const result = applySimulation(
      new Set(["settings.users.read", "brisa.access", "brisa.items.manage"]),
      ["brisa.access", "brisa.items.manage"],
      ["brisa.access"],
    );
    expect([...result].sort()).toEqual(["brisa.access", "settings.users.read"]);
  });

  it("descarta permisos del rol que no pertenecen a la app (no puede añadir nada más)", () => {
    const result = applySimulation(
      new Set(),
      ["brisa.access"],
      ["brisa.access", "platform.owner"],
    );
    expect([...result]).toEqual(["brisa.access"]);
  });

  it("resuelve la app por ruta, con la coincidencia más específica", () => {
    expect(appCodeForPath("/brisa/pendientes", apps)).toBe("brisa");
    expect(appCodeForPath("/configuracion", apps)).toBe("identity");
    expect(appCodeForPath("/cuenta", apps)).toBeNull();
    expect(appCodeForPath("/brisanueva", apps)).toBeNull();
  });

  it("guarda solo nombres y descarta datos inesperados", () => {
    writeSelection("u1", { brisa: "Usuario" });
    expect(readSelection("u1")).toEqual({ brisa: "Usuario" });
    window.sessionStorage.setItem("pastel-devmode:u2", '["x"]');
    expect(readSelection("u2")).toEqual({});
    window.sessionStorage.setItem("pastel-devmode:u3", "{no es json");
    expect(readSelection("u3")).toEqual({});
  });
});

describe("core/devmode — proveedor", () => {
  it("no hace nada ni consulta la API sin el permiso", () => {
    renderAt("/brisa", fakeAuth(["settings.users.read", "brisa.access"]));
    expect(screen.getByTestId("enabled")).toHaveTextContent("false");
    expect(screen.getByTestId("access")).toHaveTextContent("true");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("muestra la interfaz de un rol sin tocar el resto ni el estado real", async () => {
    const user = userEvent.setup();
    renderAt("/brisa/inicio", fakeAuth(real));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe(
      "/api/admin/developer/roles?app=brisa",
    );

    await user.click(screen.getByRole("button", { name: "elegir" }));
    expect(screen.getByTestId("simulating")).toHaveTextContent("true");
    expect(screen.getByTestId("manage")).toHaveTextContent("false");
    expect(screen.getByTestId("access")).toHaveTextContent("true");
    expect(screen.getByTestId("settings")).toHaveTextContent("true");
    // El modo sigue habilitado: se decide con la sesión real, no con la simulada.
    expect(screen.getByTestId("enabled")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "real" }));
    expect(screen.getByTestId("manage")).toHaveTextContent("true");
  });

  it("«sin rol» quita los permisos de la app y conserva el modo habilitado", async () => {
    const user = userEvent.setup();
    renderAt("/brisa", fakeAuth(real));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "sin rol" }));
    expect(screen.getByTestId("access")).toHaveTextContent("false");
    expect(screen.getByTestId("settings")).toHaveTextContent("true");
    expect(screen.getByTestId("enabled")).toHaveTextContent("true");
  });

  it("solo envía la consulta de roles: elegir un rol no genera ninguna otra petición", async () => {
    const user = userEvent.setup();
    renderAt("/brisa", fakeAuth(real));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "elegir" }));
    await user.click(screen.getByRole("button", { name: "real" }));
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("guarda solo el nombre del rol, por cuenta, y no lo restaura para otra cuenta", async () => {
    const user = userEvent.setup();
    const first = renderAt("/brisa", fakeAuth(real, "u1"));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "elegir" }));
    const stored = window.sessionStorage.getItem("pastel-devmode:u1") ?? "";
    expect(JSON.parse(stored)).toEqual({ brisa: "Brisa — Usuario" });
    expect(stored).not.toContain("brisa.access");
    first.unmount();

    renderAt("/brisa", fakeAuth(real, "u2"));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByTestId("simulating")).toHaveTextContent("false");
  });

  it("restaura la elección de la misma cuenta al recargar", async () => {
    writeSelection("u1", { brisa: "Brisa — Usuario" });
    renderAt("/brisa", fakeAuth(real, "u1"));
    await waitFor(() =>
      expect(screen.getByTestId("simulating")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("manage")).toHaveTextContent("false");
  });

  it("descarta una elección guardada si el rol ya no existe", async () => {
    writeSelection("u1", { brisa: "Rol eliminado" });
    renderAt("/brisa", fakeAuth(real, "u1"));
    await waitFor(() =>
      expect(screen.getByTestId("enabled")).toHaveTextContent("true"),
    );
    await waitFor(() => expect(readSelection("u1")).toEqual({}));
    expect(screen.getByTestId("simulating")).toHaveTextContent("false");
    expect(screen.getByTestId("manage")).toHaveTextContent("true");
  });

  it("borra la elección si la cuenta pierde el permiso", async () => {
    writeSelection("u1", { brisa: "Brisa — Usuario" });
    renderAt("/brisa", fakeAuth(["settings.users.read"], "u1"));
    await waitFor(() => expect(readSelection("u1")).toEqual({}));
    expect(screen.getByTestId("simulating")).toHaveTextContent("false");
  });
});
