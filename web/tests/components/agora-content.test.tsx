import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { SealBadge } from "../../src/modules/agora/components/SealBadge";
import { VideoFacade } from "../../src/modules/agora/components/VideoFacade";
import type { Seal } from "../../src/modules/agora/api/schemas";
import { MarkdownView } from "../../src/modules/agora/lib/MarkdownView";
import { isSafeHref, parseMarkdown } from "../../src/modules/agora/lib/markdown";
import { strings } from "../../src/modules/agora/strings";

afterEach(cleanup);

const seal = (state: Seal["state"], names: string[] = []): Seal => ({
  state,
  activeReviews: names.length,
  requiredReviews: 1,
  verifiers: names.map((name) => ({ name, verifiedAt: "2026-11-02T12:00:00Z" })),
});

describe("agora · Markdown seguro", () => {
  const hostile = [
    "Hola <script>alert(1)</script> mundo",
    "<img src=x onerror=alert(1)>",
    "[clic](javascript:alert(1))",
    "[clic](JaVaScRiPt:alert(1))",
    "[clic](data:text/html;base64,PHNjcmlwdD4=)",
    "[clic](&#106;avascript:alert(1))",
    "![pixel](https://evil.example/pixel.png)",
    "<a href=\"javascript:alert(1)\">x</a>",
  ].join("\n\n");

  it("no produce HTML ejecutable: el HTML crudo se ve como texto y los enlaces peligrosos se descartan", () => {
    const { container } = render(<MarkdownView source={hostile} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    for (const anchor of container.querySelectorAll("a")) {
      expect(anchor.getAttribute("href")).not.toMatch(/^(javascript|data):/i);
    }
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("solo acepta enlaces http, https, mailto y ancla", () => {
    expect(isSafeHref("https://example.org/ley?a=1&b=2")).toBe(true);
    expect(isSafeHref("mailto:equipo@example.org")).toBe(true);
    expect(isSafeHref("#fuentes")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref(" javascript:alert(1)")).toBe(false);
    expect(isSafeHref("https://user:pass@example.org")).toBe(false);
    expect(isSafeHref("/ruta-relativa")).toBe(false);
  });

  it("conserva el contenido legítimo", () => {
    const blocks = parseMarkdown(
      "## Título\n\nTexto con **negrita** y [un enlace](https://example.org).\n\n- uno\n- dos\n\n> Cita\n",
    );

    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "quote"]);
    render(<MarkdownView source="Un [enlace](https://example.org) con **negrita**." />);
    const link = screen.getByRole("link", { name: "enlace" });
    expect(link).toHaveAttribute("href", "https://example.org");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("agora · sello de verificación", () => {
  it("muestra los tres estados con texto, no solo con color", () => {
    const { rerender } = render(<SealBadge seal={seal("pending")} />);
    expect(screen.getByText(strings.seal.pending)).toBeInTheDocument();

    rerender(<SealBadge seal={seal("modifiedAfterVerification")} />);
    expect(screen.getByText(strings.seal.modified)).toBeInTheDocument();

    rerender(<SealBadge seal={seal("verified", ["Ana Rojas"])} />);
    expect(screen.getByText(strings.seal.verifiedBy("Ana Rojas"))).toBeInTheDocument();
  });

  it("no tiene problemas de accesibilidad detectables", async () => {
    const { container } = render(<SealBadge seal={seal("verified", ["Ana Rojas"])} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("agora · video con fachada", () => {
  const video = { youTubeId: "dQw4w9WgXcQ", title: "Entrevista", note: null };

  it("no carga YouTube hasta que la persona lo pide y siempre ofrece el enlace directo", async () => {
    const { container } = render(<VideoFacade video={video} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("link", { name: /Ver en YouTube/ })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );

    await userEvent.click(screen.getByRole("button", { name: /Reproducir video/ }));

    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("src")).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
    );
  });

  it("rechaza un identificador manipulado", () => {
    const { container } = render(
      <VideoFacade video={{ ...video, youTubeId: 'x"><script>alert(1)</script>' }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("agora · voz de la interfaz (AG-TXT-01)", () => {
  it("usa el trato de usted: sin voseo ni tuteo en los textos", () => {
    const text = JSON.stringify(strings, (_key, value: unknown) =>
      typeof value === "function" ? (value as (...args: never[]) => string).toString() : value,
    );
    const voseoOTuteo =
      /\b(vos|tenés|querés|podés|sabés|hacé|mirá|elegí|escribí|iniciá|tú|tienes|quieres|puedes|sabes|haz|mira|elige|escribe tu|tu cuenta|tus )\b/i;

    expect(text).not.toMatch(voseoOTuteo);
  });
});
