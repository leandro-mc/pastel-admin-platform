import {
  BookOpen,
  Briefcase,
  Code,
  Dribbble,
  Facebook,
  Figma,
  FileText,
  Github,
  Gitlab,
  Globe,
  Instagram,
  Link as GenericLink,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";

/**
 * Catálogo de iconos de enlace. Las claves son las mismas que acepta el servidor (`LinkIcons.Keys`): ahí solo se guarda
 * la clave, nunca una imagen; aquí cada clave se dibuja con un icono propio de la interfaz.
 */
const glyphs = {
  globe: Globe,
  linkedin: Linkedin,
  github: Github,
  gitlab: Gitlab,
  twitter: Twitter,
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
  figma: Figma,
  dribbble: Dribbble,
  briefcase: Briefcase,
  code: Code,
  file: FileText,
  book: BookOpen,
  mail: Mail,
  link: GenericLink,
} satisfies Record<string, LucideIcon>;

export type LinkIconKey = keyof typeof glyphs;

export const linkIconKeys = Object.keys(glyphs) as LinkIconKey[];

/** Icono que corresponde a cada tipo de enlace mientras la persona no elija otro. */
const defaultForKind: Record<string, LinkIconKey> = {
  website: "globe",
  linkedin: "linkedin",
  github: "github",
  other: "link",
};

const isKey = (value: string): value is LinkIconKey => value in glyphs;

/** Icono efectivo: el elegido si es válido; si no, el predeterminado del tipo. */
export function resolveLinkIcon(
  kind: string,
  icon: string | null | undefined,
): LinkIconKey {
  if (icon && isKey(icon)) return icon;
  return defaultForKind[kind] ?? "link";
}

/** Dibuja el icono de un enlace; decorativo (el texto del enlace ya lo nombra). */
export function LinkGlyph({
  kind,
  icon,
  className,
}: {
  kind: string;
  icon?: string | null;
  className?: string;
}) {
  const Glyph = glyphs[resolveLinkIcon(kind, icon)];
  return <Glyph aria-hidden="true" className={className} size={18} />;
}
