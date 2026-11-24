import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PreferencesProvider } from "../../src/core/preferences";
import { publicProfileSchema } from "../../src/modules/huella/api/schemas";
import {
  PublicProfileView,
  safeHref,
} from "../../src/modules/huella/components/PublicProfileView";
import { fingerprintShape } from "../../src/modules/huella/lib/fingerprint";
import {
  countEvidence,
  parseTerms,
  segments,
} from "../../src/modules/huella/lib/highlight";

const localized = (headline: string, summary: string, bullet: string) => ({
  headline,
  summary,
  facts: {
    yearsOfExperience: 6,
    currentRole: "QA Lead",
    currentCompany: "Acme",
    currentSince: "2022-03",
    previousRole: null,
    previousCompany: null,
    previousYears: null,
  },
  highlights: [{ figure: "-40 %", text: bullet }],
  experience: [
    {
      role: "QA Lead",
      company: "Acme",
      location: null,
      start: "2022-03",
      end: null,
      achievements: [{ figure: null, text: "Cobertura de API con Postman." }],
    },
  ],
  projects: [],
  skills: [{ label: "Pruebas", items: ["Playwright"] }],
  education: [],
  certifications: [],
  languages: [],
});

const profile = publicProfileSchema.parse({
  name: "Marta Solís",
  location: null,
  availability: null,
  contact: { email: null, phone: null },
  links: [
    { kind: "website", label: "Sitio", url: "https://ejemplo.dev" },
    { kind: "other", label: "Raro", url: "javascript:alert(1)" },
  ],
  hasCv: false,
  es: localized(
    "Ingeniera de QA",
    "Automatizo pruebas de extremo a extremo con Playwright.",
    "Reduje el tiempo de CI con pipelines en paralelo.",
  ),
  en: localized(
    "QA Engineer",
    "I automate end-to-end tests with Playwright.",
    "Cut CI time with parallel pipelines.",
  ),
});

afterEach(cleanup);

describe("huella · resaltador", () => {
  it("encuentra términos sin importar tildes ni mayúsculas, y dice cuáles no figuran", () => {
    const counts = countEvidence(
      ["Reduje el tiempo de integración continua", "Playwright y k6"],
      ["CI/CD", "playwright", "Kubernetes"],
    );
    expect(counts).toEqual([1, 1, 0]);
  });

  it("no marca coincidencias dentro de otra palabra", () => {
    expect(countEvidence(["capital", "API REST"], ["api"])).toEqual([1]);
    expect(segments("rapidez", ["api"]).every((s) => s.term === null)).toBe(
      true,
    );
  });

  it("limita y limpia los términos escritos", () => {
    expect(parseTerms(" a, b ;; c\n d ")).toEqual(["a", "b", "c", "d"]);
    expect(
      parseTerms(Array.from({ length: 30 }, (_, i) => `t${i}`).join(",")),
    ).toHaveLength(12);
  });
});

describe("huella · huella generativa", () => {
  it("es determinista por semilla y cambia con otra", () => {
    const a = fingerprintShape("0123456789abcdef");
    expect(fingerprintShape("0123456789abcdef")).toEqual(a);
    expect(fingerprintShape("fedcba9876543210").id).not.toBe(a.id);
  });
});

describe("huella · perfil público", () => {
  it("solo enlaza direcciones http(s)", () => {
    expect(safeHref("https://ejemplo.dev")).toBe("https://ejemplo.dev/");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("no es una url")).toBeNull();
  });

  it("no muestra contacto que el servidor no envió y abre enlaces de forma segura", () => {
    render(
      <PublicProfileView
        profile={profile}
        seed="0123456789abcdef"
        lang="es"
        onLangChange={() => undefined}
      />,
      { wrapper: PreferencesProvider },
    );
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Contacto" }),
    ).toBeInTheDocument();
    const site = screen.getByRole("link", { name: "https://ejemplo.dev" });
    expect(site).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.queryByRole("link", { name: /javascript:/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver CV" }),
    ).not.toBeInTheDocument();
  });

  it("marca la evidencia y declara lo que no figura", async () => {
    const user = userEvent.setup();
    render(
      <PublicProfileView
        profile={profile}
        seed="0123456789abcdef"
        lang="es"
        onLangChange={() => undefined}
      />,
      { wrapper: PreferencesProvider },
    );
    await user.type(screen.getByRole("textbox"), "Playwright, Kubernetes");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("1 de 2 términos con evidencia");
    const results = within(screen.getAllByRole("list")[0]!);
    expect(
      results.getByRole("button", { name: /Kubernetes · sin evidencia/ }),
    ).toBeDisabled();
  });

  it("muestra el idioma elegido y ofrece cambiarlo, junto con el tema", async () => {
    const user = userEvent.setup();
    const changes: string[] = [];
    render(
      <PublicProfileView
        profile={profile}
        seed="0123456789abcdef"
        lang="en"
        onLangChange={(l) => changes.push(l)}
      />,
      { wrapper: PreferencesProvider },
    );
    expect(screen.getByText("QA Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Ingeniera de QA")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Español" }));
    expect(changes).toEqual(["es"]);
    expect(screen.getByRole("button", { name: /Theme/ })).toBeInTheDocument();
  });
});
