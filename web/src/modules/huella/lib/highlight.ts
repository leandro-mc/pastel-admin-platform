/**
 * Resaltador de evidencia: marca en el perfil dónde figura cada término que escribe quien lo lee y dice sin adornos
 * cuáles no figuran. Es un cálculo puro sobre el texto del perfil; no usa IA ni sale del navegador.
 */

export const maxTerms = 12;

/** Quita tildes y pasa a minúsculas para comparar sin importar cómo se escribió. */
export function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Equivalencias que se aceptan como evidencia del mismo término. */
const synonyms: Readonly<Record<string, readonly string[]>> = {
  "ci/cd": ["github actions", "pipeline", "integracion continua"],
  js: ["javascript", "typescript"],
  e2e: ["end-to-end", "playwright", "cypress"],
  "pruebas automatizadas": ["playwright", "cypress", "automatizad"],
  api: ["endpoints", "postman"],
  carga: ["k6"],
  qa: ["pruebas", "calidad"],
};

export function parseTerms(input: string): string[] {
  return input
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxTerms);
}

type Pattern = { pattern: string; term: number };
export type Range = { start: number; end: number; term: number };

const isWordChar = (ch: string | undefined) => /[a-z0-9]/.test(ch ?? "");

function patternsFor(terms: readonly string[]): Pattern[] {
  const list: Pattern[] = [];
  terms.forEach((term, index) => {
    for (const raw of [term, ...(synonyms[fold(term)] ?? [])]) {
      const pattern = fold(raw).trim();
      if (pattern.length > 1) list.push({ pattern, term: index });
    }
  });
  // Los patrones largos primero: «github actions» gana a «actions».
  return list.sort((a, b) => b.pattern.length - a.pattern.length);
}

/** Coincidencias de los términos dentro de un texto, sin solaparse. `fold` conserva la longitud en español. */
export function findRanges(text: string, terms: readonly string[]): Range[] {
  if (terms.length === 0 || text === "") return [];
  const folded = fold(text);
  // Si el plegado cambió la longitud (caracteres raros) no se puede mapear con seguridad: no se marca nada.
  if (folded.length !== text.length) return [];
  const found: Range[] = [];
  for (const { pattern, term } of patternsFor(terms)) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(pattern, from);
      if (at < 0) break;
      const end = at + pattern.length;
      const startsWord = !isWordChar(folded[at - 1]);
      const endsWord = pattern.length > 3 || !isWordChar(folded[end]);
      if (startsWord && endsWord) found.push({ start: at, end, term });
      from = end;
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Range[] = [];
  let last = -1;
  for (const range of found) {
    if (range.start >= last) {
      kept.push(range);
      last = range.end;
    }
  }
  return kept;
}

export type Segment = { text: string; term: number | null };

export function segments(text: string, terms: readonly string[]): Segment[] {
  const ranges = findRanges(text, terms);
  if (ranges.length === 0) return [{ text, term: null }];
  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) out.push({ text: text.slice(pos, r.start), term: null });
    out.push({ text: text.slice(r.start, r.end), term: r.term });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), term: null });
  return out;
}

/** Cuántos lugares del perfil respaldan cada término, en el mismo orden que `terms`. */
export function countEvidence(
  texts: readonly string[],
  terms: readonly string[],
): number[] {
  const counts = terms.map(() => 0);
  for (const text of texts) {
    for (const r of findRanges(text, terms)) counts[r.term]! += 1;
  }
  return counts;
}
