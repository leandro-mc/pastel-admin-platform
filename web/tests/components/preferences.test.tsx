import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { PreferencesProvider } from "../../src/core/preferences";
import PreferenceControls from "../../src/app/shell/PreferenceControls";

function renderControls() {
  return render(
    <PreferencesProvider>
      <PreferenceControls />
    </PreferencesProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  // jsdom no implementa matchMedia; el proveedor lo consulta para el tema inicial.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});
afterEach(cleanup);

describe("shell — preferencias con controles de icono", () => {
  it("el tema es un único botón: luna en claro, sol en oscuro, con nombre accesible", async () => {
    const user = userEvent.setup();
    renderControls();
    const toDark = screen.getByRole("button", { name: "Activar modo oscuro" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await user.click(toDark);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Activar modo claro" }),
    ).toBeInTheDocument();
  });

  it("el tamaño de texto es una fila de cuatro botones con uno seleccionado", () => {
    renderControls();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "Pequeño",
      "Normal",
      "Grande",
      "Muy grande",
    ]);
    expect(
      radios.filter((radio) => radio.getAttribute("aria-checked") === "true"),
    ).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("elegir un tamaño lo marca, quita el anterior y no deja la fila sin selección", async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("radio", { name: "Grande" }));
    expect(screen.getByRole("radio", { name: "Grande" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    // Volver a pulsar la elegida no la deselecciona.
    await user.click(screen.getByRole("radio", { name: "Grande" }));
    expect(screen.getByRole("radio", { name: "Grande" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("cumple axe", async () => {
    const { container } = renderControls();
    expect(await axe(container)).toHaveNoViolations();
  });
});
