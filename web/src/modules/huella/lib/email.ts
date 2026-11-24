/*
 * Enlaces para abrir el correo de postulación ya escrito. Un enlace no puede adjuntar archivos: el CV lo adjunta la persona.
 * El destinatario solo entra si parece una dirección simple (el servidor ya lo valida; aquí se vuelve a comprobar para que un
 * valor raro nunca arme un enlace con campos de más).
 */

const address = /^[^\s@,;?&#<>"']+@[^\s@,;?&#<>"']+\.[^\s@,;?&#<>"']{2,}$/;

/** ¿Es una dirección simple y segura para un enlace? */
export const isAddress = (value: string) => address.test(value.trim());

/** El cuerpo con saltos de línea de correo (CRLF), que es lo que esperan las aplicaciones de correo. */
const crlf = (body: string) => body.replace(/\r?\n/g, "\r\n");

/** `mailto:` con destinatario (si es válido), asunto y cuerpo. */
export function mailtoHref(to: string, subject: string, body: string): string {
  const recipient = isAddress(to) ? encodeURIComponent(to.trim()).replace(/%40/g, "@") : "";
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlf(body))}`;
}

/** Redacción nueva en Gmail (web) con destinatario, asunto y cuerpo ya puestos. */
export function gmailHref(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", su: subject, body });
  if (isAddress(to)) params.set("to", to.trim());
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Asunto y cuerpo juntos, para pegar el correo entero. */
export const wholeEmail = (subject: string, body: string) => `${subject}\n\n${body}`;
