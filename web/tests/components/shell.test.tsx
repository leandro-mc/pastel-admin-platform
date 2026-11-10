import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Users } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { AuthContext, type AuthContextValue } from "../../src/core/auth";
import {
  DevModeContext,
  type DevModeValue,
} from "../../src/core/devmode/context";
import { NO_ROLE } from "../../src/core/devmode";
import type { ModuleManifest } from "../../src/core/modules/types";
import BottomNav from "../../src/app/shell/BottomNav";
import Breadcrumbs from "../../src/app/shell/Breadcrumbs";
import DevRoleSelector from "../../src/app/shell/DevRoleSelector";
import NavList from "../../src/app/shell/NavList";
import SimulationBanner from "../../src/app/shell/SimulationBanner";
import { activeNavItem, buildTrail } from "../../src/app/shell/navigation";

// El catálogo real depende del módulo virtual de Vite; el banner solo necesita el nombre de la app.
vi.mock("../../src/app/modules", () => ({
  allModules: [{ code: "brisa", name: "Brisa", basePath: "/brisa" }],
  useAccessibleModules: () => [],
}));

afterEach(cleanup);

const item = (to: string, label: string, extra: object = {}) => ({
  label,
  to,
  icon: Users,
  ...extra,
});

function moduleWith(nav: ModuleManifest["nav"]): ModuleManifest {
  return {
    code: "brisa",
    name: "Brisa",
    tagline: "x",
    basePath: "/brisa",
    icon: Users,
    nav,
    routes: [],
    access: "permission",
  } as unknown as ModuleManifest;
}

function auth(permissions: string[] = []): AuthContextValue {
  const set = new Set(permissions);
  return {
    status: "authenticated",
    user: null,
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

function at(path: string, ui: React.ReactNode, permissions: string[] = []) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={auth(permissions)}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("shell — navegación", () => {
  const nav = [
    item("usuarios", "Usuarios", { alsoActiveOn: ["", "accesos/usuario"] }),
    item("roles", "Roles", { alsoActiveOn: ["accesos/rol"] }),
  ];
  const mod = moduleWith(nav);

  it("marca el ítem más específico y no deja «Inicio» activo en todas las subpáginas", () => {
    expect(activeNavItem(mod, nav, "/brisa/roles")?.label).toBe("Roles");
    expect(activeNavItem(mod, nav, "/brisa")?.label).toBe("Usuarios");
    expect(activeNavItem(mod, nav, "/brisa/accesos/rol/7")?.label).toBe(
      "Roles",
    );
    expect(activeNavItem(mod, nav, "/brisa/accesos/usuario/3")?.label).toBe(
      "Usuarios",
    );
    expect(activeNavItem(mod, nav, "/otra")).toBeUndefined();

    const withHome = [item("", "Inicio"), item("pendientes", "Pendientes")];
    expect(activeNavItem(mod, withHome, "/brisa/pendientes")?.label).toBe(
      "Pendientes",
    );
    expect(activeNavItem(mod, withHome, "/brisa")?.label).toBe("Inicio");
    // Una subpágina sin ítem propio no debe dejar «Inicio» marcado: la raíz solo coincide exacta.
    expect(activeNavItem(mod, withHome, "/brisa/ajustes")).toBeUndefined();
  });

  it("construye migas reales sin repetir el nombre de la app", () => {
    const matches = (...crumbs: string[]) =>
      crumbs.map((crumb) => ({ handle: { crumb } }));
    expect(
      buildTrail({
        pathname: "/brisa/roles",
        module: mod,
        items: nav,
        matches: matches("Brisa", "Roles"),
      }),
    ).toEqual([{ label: "Roles", to: undefined }]);
    expect(
      buildTrail({
        pathname: "/brisa/accesos/rol/7",
        module: mod,
        items: nav,
        matches: matches("Brisa", "Accesos"),
      }),
    ).toEqual([{ label: "Roles", to: "/brisa/roles" }, { label: "Accesos" }]);
    expect(
      buildTrail({ pathname: "/cuenta", module: mod, items: nav, matches: [] }),
    ).toEqual([{ label: "Mi cuenta" }]);
  });
});

describe("shell — barra lateral", () => {
  it("filtra por permiso, marca el activo con aria-current y cumple axe", async () => {
    const mod = moduleWith([
      item("a", "Alfa"),
      item("b", "Beta", { requiredPermission: "x.read" }),
    ]);
    const { container } = at(
      "/brisa/a",
      <NavList module={mod} collapsed={false} />,
    );
    expect(screen.getByRole("link", { name: "Alfa" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "Beta" })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("muestra encabezados de grupo solo con al menos dos grupos", () => {
    const grouped = moduleWith([
      item("a", "Alfa", { group: "Personas" }),
      item("b", "Beta", { group: "Plataforma" }),
    ]);
    const { unmount } = at(
      "/brisa/a",
      <NavList module={grouped} collapsed={false} />,
    );
    expect(screen.getByText("Personas")).toBeInTheDocument();
    expect(screen.getByText("Plataforma")).toBeInTheDocument();
    unmount();

    const oneGroup = moduleWith([
      item("a", "Alfa", { group: "Personas" }),
      item("b", "Beta", { group: "Personas" }),
    ]);
    at("/brisa/a", <NavList module={oneGroup} collapsed={false} />);
    expect(screen.queryByText("Personas")).toBeNull();
  });

  it("plegada conserva el nombre accesible de cada destino", () => {
    const mod = moduleWith([item("a", "Alfa"), item("b", "Beta")]);
    at("/brisa/a", <NavList module={mod} collapsed />);
    expect(screen.getByRole("link", { name: "Alfa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Beta" })).toBeInTheDocument();
  });
});

describe("shell — barra inferior", () => {
  const many = (count: number) =>
    moduleWith(
      Array.from({ length: count }, (_, i) => item(`s${i}`, `Sección ${i}`)),
    );

  it("no se dibuja con menos de dos destinos", () => {
    const { container } = at("/brisa", <BottomNav module={moduleWith([])} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("muestra hasta cinco destinos, todos visibles y con texto, y cumple axe", async () => {
    const { container } = at("/brisa/s0", <BottomNav module={many(5)} />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Más secciones" })).toBeNull();
    expect(screen.getByRole("link", { name: "Sección 0" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("con más de cinco muestra cuatro y «Más» con el resto; «Más» se marca si el activo está dentro", async () => {
    const user = userEvent.setup();
    at("/brisa/s6", <BottomNav module={many(7)} />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    const more = screen.getByRole("button", { name: "Más secciones" });
    expect(more).toHaveAttribute("data-active", "true");
    await user.click(more);
    const menu = await screen.findByRole("menu", { name: "Más secciones" });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(3);
  });
});

describe("shell — migas", () => {
  it("la última es la página actual y no es un enlace", () => {
    render(
      <Breadcrumbs
        trail={[{ label: "Usuarios", to: "/u" }, { label: "Accesos" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Usuarios" })).toHaveAttribute(
      "href",
      "/u",
    );
    expect(screen.getByText("Accesos")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Accesos" })).toBeNull();
  });
  it("sin migas no dibuja nada", () => {
    const { container } = render(<Breadcrumbs trail={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("shell — modo desarrollador", () => {
  const dev = (over: Partial<DevModeValue>): DevModeValue => ({
    enabled: true,
    activeApp: "brisa",
    roles: {
      status: "ready",
      items: [
        {
          name: "Brisa — Usuario",
          description: null,
          isSystemRole: false,
          permissions: [],
        },
      ],
      retry: vi.fn(),
    },
    selected: null,
    simulating: false,
    select: vi.fn(),
    ...over,
  });
  const withDev = (value: DevModeValue, ui: React.ReactNode) =>
    render(
      <DevModeContext.Provider value={value}>{ui}</DevModeContext.Provider>,
    );

  it("no aparece sin el modo habilitado ni fuera de una app", () => {
    const first = withDev(dev({ enabled: false }), <DevRoleSelector />);
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();
    const second = withDev(dev({ activeApp: null }), <DevRoleSelector />);
    expect(second.container).toBeEmptyDOMElement();
  });

  it("ofrece acceso real, los roles de la app y «sin rol», y elegir uno lo aplica", async () => {
    const user = userEvent.setup();
    const value = dev({});
    withDev(value, <DevRoleSelector />);
    await user.click(screen.getByRole("button", { name: /Ver como/ }));
    expect(
      await screen.findByRole("menuitemradio", { name: "Mi acceso real" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /Sin rol en esta aplicación/ }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("menuitemradio", { name: /Brisa — Usuario/ }),
    );
    expect(value.select).toHaveBeenCalledWith("Brisa — Usuario");
  });

  it("el aviso nombra el rol y permite salir", async () => {
    const user = userEvent.setup();
    const value = dev({ simulating: true, selected: "Brisa — Usuario" });
    withDev(value, <SimulationBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Vista previa como «Brisa — Usuario» en Brisa.",
    );
    await user.click(
      screen.getByRole("button", { name: "Salir de la vista previa" }),
    );
    expect(value.select).toHaveBeenCalledWith(null);
  });

  it("«sin rol» se muestra con su nombre y sin aviso si no hay vista previa", () => {
    const shown = withDev(
      dev({ simulating: true, selected: NO_ROLE }),
      <SimulationBanner />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sin rol en esta aplicación",
    );
    shown.unmount();
    const hidden = withDev(dev({}), <SimulationBanner />);
    expect(hidden.container).toBeEmptyDOMElement();
  });
});
