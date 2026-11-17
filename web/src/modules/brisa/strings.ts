import { plural, type Priority } from "./domain/dates";

/**
 * Todos los textos de Brisa. Es una app personal: **tuteo**, tono cálido y sin culpa (inventario §13.8; excepción del
 * propietario a la regla general de usted, `docs/modules/BRISA.md` §7). Los textos originales de Android se conservan; los
 * nuevos de la web (búsqueda, validaciones, errores, confirmación al cerrar) usan el mismo tono.
 */
export const priorityNames: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export const strings = {
  name: "Brisa",
  tagline: "Pendientes del día a día",
  subtitle: "Tus días, con calma.",
  pending: (n: number) => plural(n, "pendiente", "pendientes"),

  nav: {
    week: "Semana",
    month: "Mes",
    overdue: "Vencidas",
    deadlines: "Fechas límite",
    import: "Importar tareas",
    settings: "Configuración",
  },
  newTask: "Nueva tarea",

  week: {
    title: "Tu semana",
    counts: (open: number, done: number, total: number) =>
      `${open} por hacer · ${plural(done, "hecha", "hechas")} · ${total} en total`,
    goToday: "Ir a hoy",
    dayBack: "Un día atrás",
    dayForward: "Un día adelante",
    weekBack: "Semana anterior",
    weekForward: "Semana siguiente",
    hint: "Usa las flechas o el teclado para explorar cada día.",
    today: "HOY",
    tasks: (n: number) => plural(n, "tarea", "tareas"),
    none: "Sin tareas",
    done: "HECHAS",
    createFor: (date: string) => `Crear tarea para el ${date}`,
  },

  month: {
    title: "Tu calendario",
    hint: "Elige un día para ver sus pendientes.",
    previous: "Mes anterior",
    next: "Mes siguiente",
    tasks: (n: number) => plural(n, "tarea", "tareas"),
    today: "HOY",
    openDay: (date: string, count: string) => `${date}: ${count}. Ver en Semana`,
  },

  overdue: {
    title: "Pendientes atrasados",
    description:
      "Puedes mover cualquier tarea a otro día sin perder sus detalles.",
    count: (n: number) => (n === 0 ? "Todo al día" : plural(n, "tarea", "tareas")),
    emptyTitle: "Vas al día",
    emptyDescription: "No tienes tareas pendientes de días anteriores.",
    scheduledFor: "PROGRAMADA PARA",
  },

  deadlines: {
    title: "Fechas límite",
    description: "Las fechas más próximas aparecen primero.",
    emptyTitle: "Sin fechas límite",
    emptyDescription:
      "Cuando una tarea tenga fecha límite, aparecerá aquí en orden de vencimiento.",
    label: "FECHA LÍMITE",
    overdueLabel: "VENCIDA",
  },

  task: {
    done: "Hecha",
    open: "Por hacer",
    overdue: "Vencida",
    deadline: (date: string) => `Límite ${date}`,
    priority: (p: Priority) => `Prioridad ${priorityNames[p].toLowerCase()}`,
    markDone: (title: string) => `Marcar «${title}» como hecha`,
    markOpen: (title: string) => `Marcar «${title}» como pendiente`,
    edit: (title: string) => `Abrir «${title}»`,
  },

  editor: {
    titleNew: "Una nueva tarea",
    titleEdit: "Tu tarea",
    subtitleNew: "Dale un lugar en tu día.",
    subtitleEdit: "Ajusta los detalles a tu ritmo.",
    titleLabel: "¿Qué necesitas hacer?",
    titlePlaceholder: "Ej. Preparar la presentación",
    notesLabel: "Notas (opcional)",
    notesPlaceholder: "Añade un poco más de contexto…",
    counter: (used: number, max: number) => `${used} de ${max}`,
    dayLabel: "Día asignado",
    dayHint: "Día de la tarea",
    priorityLabel: "Prioridad",
    colorLabel: "Color de la tarjeta",
    colorHint: "Tonos suaves que puedes cambiar cuando quieras.",
    dueLabel: "Fecha límite",
    dueAdd: "Añadir fecha límite",
    dueHint: "Opcional, para no perderla de vista.",
    dueNone: "Sin fecha límite",
    dueRemove: "Quitar fecha límite",
    markDone: "Marcar como hecha",
    markOpen: "Marcar como pendiente",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando…",
    delete: "Eliminar tarea",
    discardTitle: "¿Descartar lo que escribiste?",
    discardDescription: "Si cierras ahora, no se guardará lo que escribiste.",
    discardConfirm: "Descartar",
    discardKeep: "Seguir editando",
    deleteTitle: "¿Eliminar esta tarea?",
    deleteDescription: "No podrás recuperarla después de eliminarla.",
    deleteConfirm: "Eliminar",
    deleteKeep: "Conservar",
  },

  search: {
    open: "Buscar",
    close: "Cerrar búsqueda",
    label: "Buscar en tus tareas",
    placeholder: "Busca por título o notas",
    hint: "Escribe para buscar entre tus tareas abiertas y hechas.",
    none: "No encontramos tareas con ese texto.",
    results: (n: number) => plural(n, "resultado", "resultados"),
  },

  undo: {
    action: "Deshacer",
    completed: "Marcaste la tarea como hecha.",
    reopened: "Volviste a abrir la tarea.",
    deleted: "Eliminaste la tarea.",
    undone: "Listo, lo deshicimos.",
    dismiss: "Cerrar aviso",
  },

  states: {
    loading: "Cargando tus tareas…",
    errorTitle: "No pudimos cargar tus tareas",
    errorDescription: "Revisa tu conexión e inténtalo de nuevo.",
    retry: "Reintentar",
    firstTitle: "Tu primer día en Brisa",
    firstDescription:
      "Escribe una tarea y ponla donde quieras en tu semana. Con el título basta.",
    firstAction: "Crear mi primera tarea",
  },

  settings: {
    title: "Configuración",
    description: "Ajusta Brisa a tu manera.",
    timeZoneTitle: "Zona horaria",
    timeZoneDescription:
      "Define cuándo empieza tu día. Cambiarla solo cambia qué día es «hoy»: tus tareas no se mueven.",
    timeZoneLabel: "Tu zona horaria",
    timeZoneNow: (date: string) => `Para ti hoy es ${date}.`,
    save: "Guardar zona",
    saving: "Guardando…",
    saved: "Listo, guardamos tu zona horaria.",
    themeTitle: "Tema",
    themeDescription: "Elige cómo quieres ver Brisa.",
    themeLight: "Claro",
    themeDark: "Oscuro",
    textSizeTitle: "Tamaño del texto",
    textSizeDescription: "Hazlo más cómodo para tus ojos.",
    textSizes: {
      small: "Pequeño",
      normal: "Normal",
      large: "Grande",
      xlarge: "Muy grande",
    },
  },

  errors: {
    generic: "Algo no salió como esperábamos. Inténtalo de nuevo.",
    network:
      "No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.",
  },
} as const;

/** Nombres de los 10 colores de tarjeta, en el orden de la paleta (`Domain/TaskPalette.cs`). */
export const taskPalette = [
  { name: "Salvia", hex: "#DDE8D5" },
  { name: "Cielo", hex: "#DCEAF4" },
  { name: "Mantequilla", hex: "#F5E9B9" },
  { name: "Durazno", hex: "#F6DDCE" },
  { name: "Menta", hex: "#D4E9E1" },
  { name: "Arena", hex: "#E9E2D2" },
  { name: "Agua", hex: "#D1E7E5" },
  { name: "Coral suave", hex: "#F3D5C8" },
  { name: "Pistacho", hex: "#E5EDC8" },
  { name: "Azul bruma", hex: "#D7E4F0" },
] as const;

/** Punto y fondo del chip de cada prioridad (inventario §13.7). Nunca van solos: siempre con el texto. */
export const priorityStyle: Record<Priority, { dot: string; chip: string }> = {
  HIGH: { dot: "#C8755A", chip: "#F6DDCE" },
  MEDIUM: { dot: "#B79A40", chip: "#F5E9B9" },
  LOW: { dot: "#7D9A6D", chip: "#E5EDC8" },
};
