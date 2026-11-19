/**
 * Markdown de las piezas, interpretado a un árbol propio y renderizado como elementos de React.
 * No existe ruta que produzca HTML: el HTML crudo se muestra como texto y los enlaces solo pueden ser
 * `http`, `https`, `mailto` o ancla. Es la segunda barrera; el servidor ya sanitiza al guardar.
 * Subconjunto admitido: títulos, párrafos, citas, listas, código, regla, **negrita**, *cursiva*, `código` y enlaces.
 */
export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "quote"; blocks: Block[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "code"; text: string }
  | { type: "rule" };

/** Destinos de enlace aceptables. Cualquier otro esquema (`javascript:`, `data:`…) se descarta. */
export function isSafeHref(value: string): boolean {
  const href = value.trim();
  if (href === "" || href.length > 500) return false;
  // eslint-disable-next-line no-control-regex -- se rechazan a propósito los caracteres de control y los espacios
  if (/[\u0000-\u0020\u007f]/.test(href)) return false;
  if (href.startsWith("#")) return true;
  if (/^mailto:./i.test(href)) return true;
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    const url = new URL(href);
    return url.username === "" && url.password === "" && url.hostname !== "";
  } catch {
    return false;
  }
}

type InlineRule = {
  type: "image" | "code" | "link" | "strong" | "em";
  pattern: RegExp;
};

const INLINE_RULES: InlineRule[] = [
  { type: "image", pattern: /!\[([^\]]*)\]\([^)]*\)/ },
  { type: "code", pattern: /`([^`]+)`/ },
  { type: "link", pattern: /\[([^\]]*)\]\(\s*([^)\s]*)(?:\s+"[^"]*")?\s*\)/ },
  { type: "strong", pattern: /\*\*(.+?)\*\*|__(.+?)__/ },
  { type: "em", pattern: /\*(?!\s)(.+?)\*|(?<![\w])_(?!\s)(.+?)_(?![\w])/ },
];

export function parseInline(source: string): Inline[] {
  const result: Inline[] = [];
  let rest = source;

  while (rest.length > 0) {
    let best: { rule: InlineRule; match: RegExpExecArray } | null = null;
    for (const rule of INLINE_RULES) {
      const match = rule.pattern.exec(rest);
      if (match && (best === null || match.index < best.match.index)) {
        best = { rule, match };
      }
    }

    if (best === null) {
      result.push({ type: "text", text: rest });
      break;
    }

    const { rule, match } = best;
    if (match.index > 0) {
      result.push({ type: "text", text: rest.slice(0, match.index) });
    }

    switch (rule.type) {
      case "image":
        // Las imágenes no se admiten: queda el texto alternativo.
        if (match[1]) result.push({ type: "text", text: match[1] });
        break;
      case "code":
        result.push({ type: "code", text: match[1] ?? "" });
        break;
      case "link": {
        const children = parseInline(match[1] ?? "");
        const href = match[2] ?? "";
        if (isSafeHref(href)) result.push({ type: "link", href, children });
        else result.push(...children);
        break;
      }
      case "strong":
        result.push({
          type: "strong",
          children: parseInline(match[1] ?? match[2] ?? ""),
        });
        break;
      case "em":
        result.push({
          type: "em",
          children: parseInline(match[1] ?? match[2] ?? ""),
        });
        break;
    }
    rest = rest.slice(match.index + match[0].length);
  }

  return result;
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^(?:\*{3,}|-{3,}|_{3,})\s*$/;
const FENCE = /^\s{0,3}(```|~~~)/;
const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;

function startsBlock(line: string): boolean {
  return (
    HEADING.test(line) ||
    RULE.test(line) ||
    FENCE.test(line) ||
    LIST_ITEM.test(line) ||
    QUOTE.test(line)
  );
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1] ?? "```";
      const code: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trimStart().startsWith(marker)) {
        code.push(lines[i] ?? "");
        i++;
      }
      i++; // valla de cierre (o fin del texto)
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const depth = Math.min((heading[1] ?? "#").length + 1, 4) as 2 | 3 | 4;
      blocks.push({
        type: "heading",
        level: depth,
        children: parseInline(heading[2] ?? ""),
      });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        inner.push(QUOTE.exec(lines[i] ?? "")?.[1] ?? "");
        i++;
      }
      blocks.push({ type: "quote", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }

    const first = LIST_ITEM.exec(line);
    if (first) {
      const ordered = /\d/.test(first[1] ?? "");
      const items: Inline[][] = [];
      while (i < lines.length) {
        const item = LIST_ITEM.exec(lines[i] ?? "");
        if (!item || /\d/.test(item[1] ?? "") !== ordered) break;
        let text = item[2] ?? "";
        i++;
        while (
          i < lines.length &&
          (lines[i] ?? "").trim() !== "" &&
          /^\s{2,}\S/.test(lines[i] ?? "") &&
          !LIST_ITEM.test(lines[i] ?? "")
        ) {
          text += ` ${(lines[i] ?? "").trim()}`;
          i++;
        }
        items.push(parseInline(text));
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() !== "") {
      if (paragraph.length > 0 && startsBlock(lines[i] ?? "")) break;
      paragraph.push((lines[i] ?? "").trim());
      i++;
    }
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
  }

  return blocks;
}
