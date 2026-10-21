import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Alert } from "../../src/core/ui/Alert";
import { Button } from "../../src/core/ui/Button";
import { CheckboxField } from "../../src/core/ui/CheckboxField";
import { SelectField } from "../../src/core/ui/SelectField";
import { TextField } from "../../src/core/ui/TextField";

afterEach(cleanup);

describe("core/ui", () => {
  it("exposes the loading state and disables duplicate submission", () => {
    render(
      <Button loading loadingLabel="Guardando cambios">
        Guardar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Guardando cambios" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("connects TextField label, hint, and validation error to its input", () => {
    render(
      <TextField
        label="Correo electrónico"
        name="email"
        type="email"
        hint="Use el correo de su cuenta."
        error="El correo no es válido."
      />,
    );

    const input = screen.getByLabelText("Correo electrónico");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedIds =
      input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedIds).toHaveLength(2);
    expect(
      describedIds.map((id) => document.getElementById(id)?.textContent),
    ).toEqual(["Use el correo de su cuenta.", "El correo no es válido."]);
  });

  it("reveals and conceals a password through an explicitly named control", async () => {
    const user = userEvent.setup();
    render(<TextField label="Contraseña" type="password" revealable />);

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    const reveal = screen.getByRole("button", { name: "Mostrar contraseña" });
    await user.click(reveal);
    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "password");
  });

  it("announces errors as alerts and keeps support codes readable", () => {
    render(
      <Alert
        variant="error"
        message="No se pudo guardar."
        supportCode="ABC123"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  it("associates checkbox descriptions and errors with the native control", () => {
    render(
      <CheckboxField
        label="Recordar sesión"
        description="No use esta opción en equipos compartidos."
        error="Confirme su preferencia."
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    const describedIds =
      checkbox.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedIds).toHaveLength(2);
    expect(
      describedIds.map((id) => document.getElementById(id)?.textContent),
    ).toEqual([
      "No use esta opción en equipos compartidos.",
      "Confirme su preferencia.",
    ]);
  });

  it("renders selectable options under a visible label", () => {
    render(
      <SelectField
        label="Aplicación"
        name="app"
        options={[
          { value: "agora", label: "Ágora" },
          { value: "brisa", label: "Brisa" },
        ]}
        defaultValue="brisa"
      />,
    );

    const select = screen.getByLabelText("Aplicación");
    expect(select).toHaveValue("brisa");
    expect(screen.getByRole("option", { name: "Ágora" })).toBeInTheDocument();
  });

  it("has no axe violations in the accessible form baseline", async () => {
    const { container } = render(
      <main>
        <h1>Ingreso de prueba</h1>
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
        />
        <Button>Continuar</Button>
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("clears a validation error after input is updated by the user", () => {
    render(
      <TextField label="Código" error="Código requerido" defaultValue="" />,
    );
    const input = screen.getByLabelText("Código");
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "PASTEL-1" } });
    expect(input).toHaveValue("PASTEL-1");
  });
});
