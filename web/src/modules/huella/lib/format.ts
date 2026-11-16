const dateTime = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
});
const date = new Intl.DateTimeFormat("es-CR", { dateStyle: "long" });

/** «15 nov 2026, 3:42 p. m.»: día y hora, para distinguir elementos creados el mismo día. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const formatDate = (iso: string) => date.format(new Date(iso));
