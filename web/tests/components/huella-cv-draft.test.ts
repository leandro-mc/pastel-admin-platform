import { describe, expect, it } from "vitest";
import type { CvDocument } from "../../src/modules/huella/api/schemas";
import {
  fingerprintOf,
  move,
  newBullet,
  remove,
  toDraft,
  toInput,
  update,
} from "../../src/modules/huella/lib/cvDraft";

const doc = {
  language: "es",
  format: "standard",
  header: { name: "Ana", headline: "Ingeniera", contactLine1: ["Heredia"], contactLine2: ["github.com/a"] },
  summary: "Resumen.",
  skills: [{ label: "Lenguajes", items: ["Java", "Kotlin"] }],
  competencies: [],
  experience: [
    {
      title: "Dev",
      subtitle: "Empresa",
      location: null,
      context: null,
      dates: "2024",
      lineBudget: 5,
      bullets: [
        { text: "Uno", sourceIds: ["11111111-1111-4111-8111-111111111111"], shortText: null, score: 1 },
        { text: "Dos", sourceIds: [], shortText: "d", score: 0 },
      ],
    },
  ],
  projects: [],
  education: [],
  extras: [],
  extrasLabel: null,
} as unknown as CvDocument;

// Edición libre del CV: «Cambios sin guardar» solo debe aparecer cuando algo cambió de verdad, y quitar o mover filas no
// puede perder datos de las demás (las viñetas conservan el logro de origen).
describe("borrador de la edición libre", () => {
  it("cargar el documento no cuenta como cambio y volver al original deja de serlo", () => {
    const saved = fingerprintOf(toDraft(doc));
    expect(fingerprintOf(toDraft(doc))).toBe(saved);

    const draft = toDraft(doc);
    const [entry] = draft.experience!;
    const bullet = entry!.bullets[0]!;
    const edited = { ...draft, experience: [{ ...entry!, bullets: update(entry!.bullets, bullet.key, { text: "Cambiado" }) }] };
    expect(fingerprintOf(edited)).not.toBe(saved);
    const reverted = { ...draft, experience: [{ ...entry!, bullets: update(entry!.bullets, bullet.key, { text: "Uno" }) }] };
    expect(fingerprintOf(reverted)).toBe(saved);
  });

  it("quitar secciones y viñetas las envía vacías y las viñetas conservan su fuente", () => {
    const draft = toDraft(doc);
    expect(draft.projects).toBeNull();
    expect(toInput(draft).experience[0]!.bullets[0]!.sourceIds).toEqual(["11111111-1111-4111-8111-111111111111"]);

    const input = toInput({ ...draft, summary: null, skills: null, experience: null });
    expect(input.summary).toBe("");
    expect(input.skills).toEqual([]);
    expect(input.experience).toEqual([]);
  });

  it("ordena, quita y agrega viñetas", () => {
    const draft = toDraft(doc);
    const bullets = draft.experience![0]!.bullets;
    expect(move(bullets, bullets[1]!.key, -1).map((b) => b.text)).toEqual(["Dos", "Uno"]);
    expect(move(bullets, bullets[0]!.key, -1).map((b) => b.text)).toEqual(["Uno", "Dos"]);
    expect(remove(bullets, bullets[0]!.key).map((b) => b.text)).toEqual(["Dos"]);
    expect([...bullets, newBullet("Tres")]).toHaveLength(3);
  });

  // CV de competencias y habilidades: las personales son una categoría más de «Habilidades»; se renombra como cualquier otra y
  // conserva su marca al guardar (así el servidor sabe cuál es y no la trata como técnica).
  it("la categoría de competencias personales conserva su marca al renombrarla", () => {
    const combined = {
      ...doc,
      format: "combined",
      skills: [
        { label: "Personales", items: ["Adaptabilidad", "Comunicación"], soft: true },
        { label: "Lenguajes", items: ["Java"] },
      ],
    } as unknown as CvDocument;
    const draft = toDraft(combined);
    expect(draft.skills!.map((g) => g.soft)).toEqual([true, false]);

    const renamed = { ...draft, skills: update(draft.skills!, draft.skills![0]!.key, { label: "Blandas" }) };
    const sent = toInput(renamed).skills;
    expect(sent.map((g) => g.label)).toEqual(["Blandas", "Lenguajes"]);
    expect(sent.map((g) => g.soft)).toEqual([true, false]);
    expect(fingerprintOf(renamed)).not.toBe(fingerprintOf(draft));
  });
});
