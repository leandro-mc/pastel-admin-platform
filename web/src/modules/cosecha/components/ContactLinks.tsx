import { MessageCircle, Phone } from "lucide-react";
import { formatPhone, whatsAppChat } from "../format";
import { strings } from "../strings";

const link = "inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-accent-strong underline-offset-2 hover:underline";

/** Llamar (`tel:`) y WhatsApp de un contacto: cada teléfono ofrece las dos acciones. */
export function ContactLinks({ name, phone }: { name: string; phone: string }) {
  const t = strings.people.contact;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4">
      <a href={`tel:+506${phone}`} aria-label={t.call(name)} className={link}>
        <Phone aria-hidden="true" className="size-4" />
        {formatPhone(phone)}
      </a>
      <a
        href={whatsAppChat(phone)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.whatsappLabel(name)}
        className={link}
      >
        <MessageCircle aria-hidden="true" className="size-4" />
        {t.whatsapp}
      </a>
    </span>
  );
}
