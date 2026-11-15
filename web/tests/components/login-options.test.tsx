import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Component as LoginPage } from "../../src/modules/identity/pages/LoginPage";
import { RegisterForm } from "../../src/modules/identity/components/RegisterForm";
import { identityStrings } from "../../src/modules/identity/strings";

const state = vi.hoisted(() => ({
  options: {
    google: false,
    localLogin: true,
    localRegistration: false,
    passwordPolicy: {
      minLength: 12,
      maxLength: 128,
      description: "Use al menos 12 caracteres.",
    },
  },
  register: vi.fn(),
}));

vi.mock("@/core/auth", () => ({
  useAuth: () => ({
    status: "anonymous",
    user: null,
    login: vi.fn(),
    register: state.register,
  }),
  useAuthOptions: () => ({
    isPending: false,
    isError: false,
    data: state.options,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/core/preferences", () => ({
  usePreferences: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));
vi.mock("@/core/modules/catalog", () => ({
  useAccessibleModules: () => [],
  getRememberedAppPath: () => null,
}));

afterEach(cleanup);

beforeEach(() => {
  state.options = {
    google: false,
    localLogin: true,
    localRegistration: false,
    passwordPolicy: {
      minLength: 12,
      maxLength: 128,
      description: "Use al menos 12 caracteres.",
    },
  };
  state.register.mockReset();
});

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/ingresar"]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage (F0-G11)", () => {
  it("does not show the Google button when the server reports google=false", () => {
    renderLogin();

    expect(
      screen.queryByRole("link", { name: identityStrings.login.google }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(identityStrings.login.google),
    ).not.toBeInTheDocument();
  });

  it("shows the Google button, pointing at the server start route, when google=true", () => {
    state.options = { ...state.options, google: true };
    renderLogin();

    const link = screen.getByRole("link", {
      name: identityStrings.login.google,
    });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/api/auth/google/start"),
    );
  });
});

describe("RegisterForm password policy (F0-S211, client side)", () => {
  async function fill(password: string) {
    const user = userEvent.setup();
    render(
      <RegisterForm
        policy={state.options.passwordPolicy}
        onSuccess={vi.fn()}
      />,
    );
    await user.type(
      screen.getByLabelText(identityStrings.register.name),
      "Ana Prueba",
    );
    await user.type(
      screen.getByLabelText(identityStrings.login.email),
      "ana@example.test",
    );
    await user.type(
      screen.getByLabelText(identityStrings.login.password),
      password,
    );
    await user.click(
      screen.getByRole("button", { name: identityStrings.register.submit }),
    );
  }

  it("rejects a password shorter than the policy the server published", async () => {
    await fill("a".repeat(11));

    expect(
      await screen.findByText(
        identityStrings.validation.passwordLength(12, 128),
      ),
    ).toBeInTheDocument();
    expect(state.register).not.toHaveBeenCalled();
  });

  it("imposes no composition rules: a long lowercase-only password is sent to the server", async () => {
    state.register.mockResolvedValue(undefined);

    await fill("a".repeat(12));

    await waitFor(() => expect(state.register).toHaveBeenCalledTimes(1));
    expect(state.register).toHaveBeenCalledWith(
      "ana@example.test",
      "Ana Prueba",
      "a".repeat(12),
    );
  });

  it("follows the policy values it receives instead of a hard-coded length", async () => {
    state.options = {
      ...state.options,
      passwordPolicy: { ...state.options.passwordPolicy, minLength: 16 },
    };

    await fill("a".repeat(15));

    expect(
      await screen.findByText(
        identityStrings.validation.passwordLength(16, 128),
      ),
    ).toBeInTheDocument();
    expect(state.register).not.toHaveBeenCalled();
  });
});
