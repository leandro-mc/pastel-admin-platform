import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Dialog } from "../../src/core/ui/Dialog";

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir diálogo
      </button>
      <button type="button">Otro control de la página</button>
      {open ? (
        <Dialog
          title="Confirmar cambio"
          description="Revise los datos antes de continuar."
          onClose={() => setOpen(false)}
        >
          <button type="button">Aceptar</button>
          <button type="button">Cancelar</button>
        </Dialog>
      ) : null}
    </div>
  );
}

describe("core/ui Dialog (F0-W05)", () => {
  it("has an accessible name from its title and no axe violations", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar cambio",
    });
    expect(dialog).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("moves focus inside the dialog and keeps it there while tabbing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog.contains(document.activeElement)).toBe(true);
    for (let index = 0; index < 8; index += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes with Escape and returns focus to the element that opened it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Abrir diálogo" });
    await user.click(opener);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // React Aria restaura el foco de forma asíncrona (requestAnimationFrame).
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("closes with the explicitly named close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
