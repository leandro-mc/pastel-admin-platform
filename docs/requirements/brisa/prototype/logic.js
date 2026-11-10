/* Brisa · lógica de fechas (prototipo). Es la regla obligatoria del inventario (INVENTARIO-BRISA.md §13.1–§13.3): reprogramación diaria
   DERIVADA (el día asignado no se reescribe; se calcula el «día efectivo»), dos criterios de «Vencida», validación día ≤ fecha límite.
   «Hoy» siempre sale de la zona de la persona, nunca de la del navegador ni la del servidor. Funciona en navegador (window.BrisaLogic) y en Node. */
(function (root) {
  "use strict";
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  const RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

  /** Fecha de calendario (aaaa-mm-dd) del instante `now` en la zona IANA indicada. Si la zona no es válida, lanza (la interfaz valida antes de guardar). */
  function todayInZone(zone, now) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now || new Date());
    const o = Object.fromEntries(parts.map((p) => [p.type, p.value])); return o.year + "-" + o.month + "-" + o.day;
  }
  function addDays(date, n) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }
  function isoDateValid(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false; const d = new Date(s + "T12:00:00Z"); return !Number.isNaN(d.getTime()) && fmt(d) === s; }
  /** Día (en la zona de la persona) de un instante UTC, p. ej. CompletedAt. */
  function dateFromInstant(value, zone) { if (!value) return null; try { return todayInZone(zone, new Date(value)); } catch (e) { return null; } }

  /** §13.1: día efectivo. Abierta → referencia = hoy; hecha → día local de CompletedAt (si no existe, queda en su día asignado). Sin fecha límite nunca se mueve. */
  function effectiveDate(task, today, zone) {
    const base = task.scheduledDate;
    if (task.completed && !task.completedAt) return base;
    const ref = task.completed ? dateFromInstant(task.completedAt, zone) : today;
    if (!task.dueDate) return base;
    if (base >= ref) return base;
    if (task.dueDate >= ref) return ref;
    return base > task.dueDate ? base : task.dueDate;
  }
  /** §13.2 / §5.3: «Vencida» = abierta y (con fecha límite: ya pasó; sin ella: su día efectivo ya pasó). Orden: (límite ?? día efectivo) ↑, prioridad ↓. */
  function isOverdue(task, today, zone) { if (task.completed || task.deletedAt) return false; return task.dueDate ? task.dueDate < today : effectiveDate(task, today, zone) < today; }
  function overdue(tasks, today, zone) {
    return tasks.filter((t) => isOverdue(t, today, zone)).sort((a, b) => (a.dueDate || effectiveDate(a, today, zone)).localeCompare(b.dueDate || effectiveDate(b, today, zone)) || (RANK[b.priority] || 0) - (RANK[a.priority] || 0));
  }
  /** §5.3: Fechas límite = con fecha límite y no (hecha y ya vencida). Abiertas antes que hechas; límite ↑; prioridad ↓. */
  function deadlines(tasks, today) {
    return tasks.filter((t) => !t.deletedAt && t.dueDate && !(t.completed && t.dueDate < today)).sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueDate.localeCompare(b.dueDate) || (RANK[b.priority] || 0) - (RANK[a.priority] || 0));
  }
  /** §13.2 y §13.4: validación bloqueante al crear, modificar o importar. Se compara el día ELEGIDO (o el guardado), no el efectivo que muestra el editor. */
  const MSG_ORDER = "El día de la tarea no puede ser después de su fecha límite. Cambia la fecha límite si necesitas más tiempo.";
  function validateTask(t) {
    const title = String(t.title || "").trim(), details = String(t.details || "").trim();
    if (!title) return { ok: false, code: "brisa.task.title_required", message: "Escribe un título para guardar la tarea." };
    if (title.length > 150) return { ok: false, code: "brisa.task.title_too_long", message: "El título admite hasta 150 caracteres." };
    if (details.length > 2000) return { ok: false, code: "brisa.task.notes_too_long", message: "Las notas admiten hasta 2000 caracteres." };
    if (!isoDateValid(t.scheduledDate)) return { ok: false, code: "brisa.task.date_invalid", message: "Elige un día válido." };
    if (t.dueDate && !isoDateValid(t.dueDate)) return { ok: false, code: "brisa.task.due_invalid", message: "Elige una fecha límite válida." };
    if (t.dueDate && t.scheduledDate > t.dueDate) return { ok: false, code: "brisa.task.day_after_deadline", message: MSG_ORDER };
    if (t.colorHex && !/^#[0-9a-fA-F]{6}$/.test(t.colorHex)) return { ok: false, code: "brisa.task.color_invalid", message: "El color debe tener formato #RRGGBB." };
    return { ok: true };
  }
  /** Búsqueda (§13.6): título y notas, sin distinguir mayúsculas ni tildes, solo tareas propias no eliminadas (abiertas y hechas). */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function search(tasks, q) { const n = norm(q); return n ? tasks.filter((t) => !t.deletedAt && norm(t.title + " " + (t.details || "")).includes(n)) : []; }
  /** Singular correcto (U11, Q23). */
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

  const api = { todayInZone, addDays, isoDateValid, dateFromInstant, effectiveDate, isOverdue, overdue, deadlines, validateTask, search, plural, MSG_ORDER };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BrisaLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
