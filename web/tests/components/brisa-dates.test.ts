import { describe, expect, it } from "vitest";
import {
  formatLong,
  formatMonthYear,
  formatShort,
  monthGrid,
  shiftMonth,
  weekDates,
} from "@/modules/brisa/domain/calendar";
import {
  DAY_AFTER_DEADLINE_MESSAGE,
  addDays,
  deadlineTasks,
  effectiveDate,
  isOverdue,
  overdueTasks,
  plural,
  searchTasks,
  todayInZone,
  validateTask,
  type DatedTask,
  type RankedTask,
} from "@/modules/brisa/domain/dates";

/**
 * Pruebas esenciales de Etapa 1 de Brisa (ficha §6, pruebas 1 y 5). Los esperados salen del inventario
 * (INVENTARIO-BRISA.md §13.1–§13.4 y §13.11), no del código. «Hoy» = 2026-10-18 salvo indicación.
 */
const CR = "America/Costa_Rica";
const TODAY = "2026-10-18";
const d = (day: number) => `2026-10-${String(day).padStart(2, "0")}`;

const open = (scheduled: number, due?: number): DatedTask => ({
  scheduledDate: d(scheduled),
  dueDate: due === undefined ? null : d(due),
  completed: false,
  completedAt: null,
});
const done = (scheduled: number, due: number | undefined, completedAt: string | null): DatedTask => ({
  scheduledDate: d(scheduled),
  dueDate: due === undefined ? null : d(due),
  completed: true,
  completedAt,
});
const effective = (task: DatedTask, today: number) => effectiveDate(task, d(today), CR);

describe("día efectivo (§13.1)", () => {
  it.each([
    ["V1", open(15), 15, true],
    ["V2", open(15, 20), 18, false],
    ["V3", open(15, 18), 18, false],
    ["V4", open(15, 17), 17, true],
    ["V5", open(20, 25), 20, false],
    ["V6 (dato inconsistente: se devuelve sin error)", open(20, 17), 20, true],
    ["V7", done(15, 20, "2026-10-18T15:00:00Z"), 18, false],
    ["V8", done(15, 20, "2026-10-16T15:00:00Z"), 16, false],
    ["V9", done(15, 20, null), 15, false],
    ["V10", done(15, undefined, "2026-10-18T15:00:00Z"), 15, false],
  ])("%s", (_name, task, day, overdue) => {
    expect(effectiveDate(task, TODAY, CR)).toBe(d(day));
    expect(isOverdue(task, TODAY, CR)).toBe(overdue);
  });

  it("AC1/AC2: una abierta avanza cada día hasta su fecha límite", () => {
    const task = open(15, 20);
    expect([15, 16, 17, 18, 19, 20].map((today) => effective(task, today))).toEqual(
      [15, 16, 17, 18, 19, 20].map(d),
    );
  });

  it("AC3: pasada la fecha límite deja de moverse y está vencida", () => {
    const task = open(15, 20);
    expect(effective(task, 21)).toBe(d(20));
    expect(effective(task, 25)).toBe(d(20));
    expect(isOverdue(task, d(21), CR)).toBe(true);
  });

  it("AC4: sin fecha límite nunca se mueve", () => {
    expect([15, 18, 25].map((today) => effective(open(15), today))).toEqual([d(15), d(15), d(15)]);
  });

  it("AC5: barrido, nunca se pierde en un día pasado mientras su fecha límite sea hoy o posterior", () => {
    for (let scheduled = 1; scheduled <= 15; scheduled++)
      for (let due = scheduled; due <= 30; due++)
        for (let today = 1; today <= 30; today++)
          if (due >= today)
            expect(effective(open(scheduled, due), today) >= d(today) || scheduled >= today).toBe(true);
  });

  it("AC6/AC7: tras días fuera muestra hoy; una hecha se queda en el día que se completó", () => {
    expect(effective(open(15, 20), 19)).toBe(d(19));
    const finished = done(15, 20, "2026-10-18T20:00:00Z");
    expect([18, 19, 21].map((today) => effective(finished, today))).toEqual([d(18), d(18), d(18)]);
  });

  it("C03/C04/C07/C10: vencidas y reapertura", () => {
    expect(isOverdue(open(17), TODAY, CR)).toBe(true);
    expect(effective(open(17), 18)).toBe(d(17));
    expect(isOverdue(open(18), TODAY, CR)).toBe(false);
    expect(isOverdue(open(18, 18), TODAY, CR)).toBe(false);
    expect(effective(open(16, 18), 19)).toBe(d(18));
    expect(isOverdue(open(16, 18), d(19), CR)).toBe(true);
    expect(effective(open(14, 25), 18)).toBe(d(18));
  });

  it("N07: cambiar el día al futuro lo sostiene hasta ese día y luego vuelve a moverse", () => {
    const task = open(22, 25);
    expect([21, 22, 23].map((today) => effective(task, today))).toEqual([d(22), d(22), d(23)]);
  });

  it("es determinista y no reescribe el día asignado", () => {
    const task = open(15, 20);
    expect(effective(task, 18)).toBe(effective(task, 18));
    expect(task.scheduledDate).toBe(d(15));
  });
});

describe("zona horaria de la persona (§13.3)", () => {
  it("C26/N19: «hoy» sigue la zona, no la del navegador", () => {
    const at2330 = new Date("2026-10-19T05:30:00Z");
    expect(todayInZone(CR, at2330)).toBe("2026-10-18");
    expect(todayInZone("America/New_York", at2330)).toBe("2026-10-19");
    expect(todayInZone("UTC", at2330)).toBe("2026-10-19");
  });

  it("una tarea del 18 sale de «hoy» exactamente a medianoche local", () => {
    const task = open(18);
    const lastMinute = todayInZone(CR, new Date("2026-10-19T05:59:00Z"));
    const midnight = todayInZone(CR, new Date("2026-10-19T06:00:00Z"));
    expect(isOverdue(task, lastMinute, CR)).toBe(false);
    expect(isOverdue(task, midnight, CR)).toBe(true);
  });

  it("una zona con horario de verano conserva su medianoche al cambiar la hora", () => {
    // El 1 de noviembre de 2026 termina el horario de verano de Nueva York: la medianoche local pasa a 05:00 UTC.
    expect(todayInZone("America/New_York", new Date("2026-11-02T04:59:00Z"))).toBe("2026-11-01");
    expect(todayInZone("America/New_York", new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
  });

  it("una hecha usa el día local de su cierre en la zona de la persona", () => {
    const task = done(15, 25, "2026-10-19T04:00:00Z"); // 22:00 del 18 en Costa Rica
    expect(effectiveDate(task, "2026-10-20", CR)).toBe(d(18));
  });
});

describe("órdenes de Vencidas y Fechas límite (§5.3)", () => {
  const make = (id: string, scheduled: number, due: number | undefined, priority: RankedTask["priority"], completed = false): RankedTask & { id: string } => ({
    id,
    ...(completed ? done(scheduled, due, "2026-10-17T12:00:00Z") : open(scheduled, due)),
    priority,
  });

  it("C21: Vencidas por (fecha límite o día efectivo) ascendente y prioridad descendente", () => {
    const tasks = [
      make("sin-limite-baja", 16, undefined, "LOW"),
      make("limite-17-alta", 10, 17, "HIGH"),
      make("sin-limite-alta", 16, undefined, "HIGH"),
      make("limite-15-media", 10, 15, "MEDIUM"),
      make("vigente", 10, 25, "HIGH"),
    ];
    expect(overdueTasks(tasks, TODAY, CR).map((t) => t.id)).toEqual([
      "limite-15-media",
      "sin-limite-alta",
      "sin-limite-baja",
      "limite-17-alta",
    ]);
  });

  it("C22: Fechas límite — abiertas antes que hechas, vencimiento ascendente, y una hecha ya vencida no aparece", () => {
    const tasks = [
      make("hecha-vigente", 10, 25, "HIGH", true),
      make("abierta-25", 10, 25, "LOW"),
      make("abierta-20", 10, 20, "LOW"),
      make("hecha-vencida", 10, 16, "HIGH", true),
      make("sin-limite", 10, undefined, "HIGH"),
    ];
    expect(deadlineTasks(tasks, TODAY).map((t) => t.id)).toEqual(["abierta-20", "abierta-25", "hecha-vigente"]);
  });
});

describe("validación (§13.2, §13.4)", () => {
  const base = { title: "Tarea", notes: "", scheduledDate: TODAY, dueDate: null as string | null };

  it.each([
    ["N08/N26", "2026-10-18", "2026-10-17"],
    ["N28", "2026-10-18", "2026-10-16"],
    ["N27 (día 26 con límite 25)", "2026-10-26", "2026-10-25"],
  ])("%s: el día posterior a la fecha límite se rechaza con el mensaje de Brisa", (_name, day, due) => {
    expect(validateTask({ ...base, scheduledDate: day, dueDate: due })).toEqual({
      ok: false,
      code: "brisa.task.day_after_deadline",
      field: "dueDate",
      message: DAY_AFTER_DEADLINE_MESSAGE,
    });
  });

  it("N27: mover la fecha límite antes del día efectivo es válido si el día guardado no la pasa", () => {
    expect(validateTask({ ...base, scheduledDate: "2026-10-15", dueDate: "2026-10-17" }).ok).toBe(true);
  });

  it("título vacío se rechaza y el alta mínima (solo título) es válida", () => {
    expect(validateTask({ ...base, title: "   " })).toMatchObject({ ok: false, code: "brisa.task.title_required" });
    expect(validateTask({ ...base, title: "Comprar pan" }).ok).toBe(true);
  });

  it("N18: límites de 150 y 2000 caracteres tras recortar, sin truncar", () => {
    expect(validateTask({ ...base, title: "a".repeat(150) }).ok).toBe(true);
    expect(validateTask({ ...base, title: "a".repeat(151) })).toMatchObject({ code: "brisa.task.title_too_long" });
    expect(validateTask({ ...base, notes: "b".repeat(2000) }).ok).toBe(true);
    expect(validateTask({ ...base, notes: "b".repeat(2001) })).toMatchObject({ code: "brisa.task.notes_too_long" });
  });

  it("fechas y color con formato inválido se rechazan", () => {
    expect(validateTask({ ...base, scheduledDate: "2026-02-30" })).toMatchObject({ code: "brisa.task.date_invalid" });
    expect(validateTask({ ...base, dueDate: "18/10/2026" })).toMatchObject({ code: "brisa.task.due_invalid" });
    expect(validateTask({ ...base, colorHex: "rojo" })).toMatchObject({ code: "brisa.task.color_invalid" });
  });
});

describe("búsqueda y plurales", () => {
  const items = [
    { id: "1", title: "Preparar la presentación", notes: "", deletedAt: null },
    { id: "2", title: "Comprar pan", notes: "Añadir CAFÉ", deletedAt: null },
    { id: "3", title: "Pan eliminado", notes: "", deletedAt: "2026-10-10T00:00:00Z" },
  ];

  it("N17: sin distinguir tildes ni mayúsculas, en título y notas, sin eliminadas", () => {
    expect(searchTasks(items, "presentacion").map((t) => t.id)).toEqual(["1"]);
    expect(searchTasks(items, "PAN").map((t) => t.id)).toEqual(["2"]);
    expect(searchTasks(items, "cafe").map((t) => t.id)).toEqual(["2"]);
    expect(searchTasks(items, "   ")).toEqual([]);
  });

  it("N24: singular correcto", () => {
    expect(plural(1, "hecha", "hechas")).toBe("1 hecha");
    expect(plural(0, "pendiente", "pendientes")).toBe("0 pendientes");
    expect(plural(2, "hecha", "hechas")).toBe("2 hechas");
  });
});

describe("calendario y formato", () => {
  it("formatos de fecha en español (§13.8)", () => {
    expect(formatLong("2026-10-17")).toBe("Sábado 17 de octubre");
    expect(formatShort("2026-10-17")).toBe("17 oct");
    expect(formatMonthYear("2026-10-18")).toBe("Octubre 2026");
  });

  it("la semana va de lunes a domingo y el domingo cae en su propia semana", () => {
    expect(weekDates("2026-10-18")).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
  });

  it("la cuadrícula de octubre de 2026 tiene 5 semanas de lunes a domingo", () => {
    const grid = monthGrid("2026-10-18");
    expect(grid).toHaveLength(5);
    expect(grid[0]?.[0]?.date).toBe("2026-09-28");
    expect(grid[4]?.[6]?.date).toBe("2026-11-01");
  });

  it("cambia de mes cruzando el año", () => {
    expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-15", -1)).toBe("2025-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
