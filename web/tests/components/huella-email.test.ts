import { describe, expect, it } from "vitest";
import { gmailHref, isAddress, mailtoHref, wholeEmail } from "../../src/modules/huella/lib/email";

describe("enlaces del correo de postulación", () => {
  it("arma un mailto con el destinatario, el asunto y el cuerpo con saltos de línea de correo", () => {
    const href = mailtoHref("seleccion@empresa.com", "Postulación: Dev - Ana", "Hola,\n\nAdjunto mi CV.");

    expect(href.startsWith("mailto:seleccion@empresa.com?")).toBe(true);
    expect(href).toContain("subject=Postulaci%C3%B3n%3A%20Dev%20-%20Ana");
    expect(href).toContain("body=Hola%2C%0D%0A%0D%0AAdjunto%20mi%20CV.");
  });

  it("sin un destinatario válido deja el «Para» vacío en vez de armar un enlace con campos de más", () => {
    for (const bad of ["", "no es correo", "a@b.com?bcc=otro@x.com", "a@b.com,otro@x.com"]) {
      expect(isAddress(bad)).toBe(false);
      expect(mailtoHref(bad, "Asunto", "Cuerpo").startsWith("mailto:?subject=")).toBe(true);
      expect(gmailHref(bad, "Asunto", "Cuerpo")).not.toContain("to=");
    }
  });

  it("abre Gmail con la redacción ya escrita y junta asunto y cuerpo al copiar todo", () => {
    const href = gmailHref("seleccion@empresa.com", "Asunto", "Cuerpo");

    expect(href.startsWith("https://mail.google.com/mail/?")).toBe(true);
    expect(href).toContain("to=seleccion%40empresa.com");
    expect(href).toContain("su=Asunto");
    expect(wholeEmail("Asunto", "Cuerpo")).toBe("Asunto\n\nCuerpo");
  });
});
