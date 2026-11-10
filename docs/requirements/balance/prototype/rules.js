/* Balance · reglas de acceso y ciclo de vida (prototipo). Implementa D3 (roles y pertenencia), D7 (cerrar, reabrir, borrar) y las
   invariantes del inventario §12.3. La matriz completa y el motivo de cada negación están en ROLES-Y-PERMISOS.md.
   En producción TODO esto vive en el servidor (deny by default); aquí solo sirve para demostrar y probar el comportamiento. */
(function (root) {
  "use strict";

  // Códigos de estado HTTP que devolvería la API: 401 sin sesión · 403 sin permiso · 404 no es miembro (el grupo «no existe») · 409 estado/invariante · 429 demasiados intentos.
  const deny = (status, code, reason, who) => ({ allowed: false, status, code, reason, who: who || "" });
  const ok = () => ({ allowed: true });

  const ADMIN_ONLY = new Set(["see_join", "regenerate_join", "manage_admins", "remove_participant", "edit_settings", "change_currency", "close_group", "reopen_group", "delete_group", "change_payer"]);
  const WRITES = new Set(["add_expense", "edit_expense", "delete_expense", "change_payer", "edit_settings", "change_currency", "remove_participant", "manage_admins", "regenerate_join", "leave_group", "delete_group", "close_group"]);

  const WHY = {
    see_join: "El enlace y el código de ingreso los ve solo quien administra el grupo, para que no circulen sin control.",
    regenerate_join: "Regenerar el enlace invalida los anteriores; lo decide quien administra el grupo.",
    manage_admins: "Nombrar o quitar administradores es una decisión de quienes ya administran el grupo.",
    remove_participant: "Quitar participantes cambia el reparto de todos; lo hace quien administra el grupo.",
    edit_settings: "El nombre, la moneda y la zona horaria afectan a todos; los cambia quien administra el grupo.",
    change_currency: "Cambiar la moneda reexpresa todos los gastos; lo hace quien administra el grupo.",
    close_group: "Cerrar o reabrir el grupo lo decide quien lo administra.",
    reopen_group: "Cerrar o reabrir el grupo lo decide quien lo administra.",
    delete_group: "Borrar el grupo lo decide quien lo administra.",
    change_payer: "Solo quien administra puede registrar o cambiar un gasto a nombre de otra persona.",
  };

  const memberOf = (group, id) => group.members.find((m) => m.id === id);
  const adminCount = (group) => group.members.filter((m) => m.role === "admin").length;
  const expensesOf = (group, id) => group.expenses.filter((e) => e.payerId === id);

  /** can(action, ctx): ctx = { session:boolean, hasAccess:boolean, group, actorId, expense?, targetId? } → { allowed } | { allowed:false, status, code, reason, who } */
  function can(action, ctx) {
    if (!ctx.session) return deny(401, "auth.unauthenticated", "Necesita iniciar sesión.", "Inicie sesión con su cuenta de Pastel.");
    if (!ctx.hasAccess) return deny(403, "auth.forbidden", "Su cuenta todavía no tiene acceso a Balance.", "Pídalo a quien administra su cuenta de Pastel.");
    if (action === "create_group" || action === "list_groups") return ok();
    const g = ctx.group, me = g && memberOf(g, ctx.actorId);
    if (!g || !me) return deny(404, "balance.group.not_found", "No encontramos ese grupo.", "Si lo esperaba, pida a quien lo administra el enlace y el código de ingreso.");
    const admin = me.role === "admin";
    if (ADMIN_ONLY.has(action) && !admin) return deny(403, "balance.forbidden", WHY[action], "Pídalo a alguien que administre el grupo.");
    if (action === "view" || action === "view_expenses" || action === "view_balances" || action === "view_settlement") return ok();
    if (g.closed && WRITES.has(action) && action !== "close_group") return deny(409, "balance.group.closed", "El grupo está cerrado: solo se puede leer.", admin ? "Reábralo para volver a registrar cambios." : "Pida a quien lo administra que lo reabra.");
    if (g.closed && action === "close_group") return deny(409, "balance.group.already_closed", "El grupo ya está cerrado.", "");
    if (!g.closed && action === "reopen_group") return deny(409, "balance.group.not_closed", "El grupo ya está abierto.", "");
    switch (action) {
      case "add_expense": {
        if (!admin && ctx.payerId && ctx.payerId !== ctx.actorId) return deny(403, "balance.forbidden", "Usted solo puede registrar gastos pagados por usted.", "Pida a quien administra que lo registre a nombre de otra persona.");
        return ok();
      }
      case "edit_expense": case "delete_expense": {
        if (!admin && ctx.expense && ctx.expense.payerId !== ctx.actorId) return deny(403, "balance.forbidden", "Solo puede modificar o eliminar los gastos que usted pagó.", "Pídaselo a quien lo registró o a quien administra el grupo.");
        return ok();
      }
      case "close_group": case "reopen_group": case "regenerate_join": case "see_join": case "edit_settings": case "change_currency": case "change_payer": return ok();
      case "manage_admins": {
        const t = memberOf(g, ctx.targetId);
        if (!t) return deny(404, "balance.participant.not_found", "No encontramos a esa persona en el grupo.", "");
        if (t.role === "admin" && adminCount(g) <= 1) return deny(409, "balance.group.last_admin", "El grupo debe tener al menos una persona administradora.", "Nombre primero a otra persona administradora.");
        return ok();
      }
      case "remove_participant": {
        const t = memberOf(g, ctx.targetId);
        if (!t) return deny(404, "balance.participant.not_found", "No encontramos a esa persona en el grupo.", "");
        if (expensesOf(g, t.id).length) return deny(409, "balance.participant.has_expenses", "No se puede quitar a una persona que pagó gastos.", "Elimine o reasigne primero sus gastos.");
        if (t.role === "admin" && adminCount(g) <= 1) return deny(409, "balance.group.last_admin", "El grupo debe tener al menos una persona administradora.", "Nombre primero a otra persona administradora.");
        return ok();
      }
      case "leave_group": {
        if (expensesOf(g, me.id).length) return deny(409, "balance.participant.has_expenses", "No puede salir mientras tenga gastos registrados.", "Pida que eliminen o reasignen sus gastos y luego salga.");
        if (admin && adminCount(g) <= 1) return deny(409, "balance.group.last_admin", "Usted es la única persona administradora.", "Nombre primero a otra persona administradora.");
        return ok();
      }
      case "delete_group": {
        if (g.expenses.length) return deny(409, "balance.group.has_expenses", "No se puede borrar un grupo con gastos.", "Elimine primero todos los gastos.");
        return ok();
      }
      default: return deny(403, "balance.forbidden", "Acción no reconocida: se deniega por defecto.", "");
    }
  }

  /** Ingreso por enlace y código (§12.3.5): 5 fallos por cuenta y grupo → bloqueo de 15 min (429 con Retry-After); un ingreso correcto reinicia el contador;
      token inválido, código incorrecto o enlace regenerado dan el MISMO error genérico (no revela si el grupo existe). */
  function createJoinGuard(clock) {
    const now = clock || (() => Date.now()); const state = new Map(); const LIMIT = 5, LOCK_MS = 15 * 60 * 1000;
    return {
      LIMIT, LOCK_MS,
      attempt({ accountId, groups, token, code }) {
        const key = accountId + "|" + (token || ""); const s = state.get(key) || { fails: 0, until: 0 };
        if (s.until > now()) return { ok: false, status: 429, code: "balance.join.rate_limited", retryAfterSec: Math.ceil((s.until - now()) / 1000), message: "Demasiados intentos. Intente de nuevo en unos minutos." };
        const g = groups.find((x) => x.join && x.join.token === token && x.join.code === String(code));
        if (!g) { s.fails += 1; if (s.fails >= LIMIT) { s.until = now() + LOCK_MS; s.fails = 0; } state.set(key, s); return { ok: false, status: 400, code: "balance.join.invalid", message: "El enlace o el código no son válidos. Pida a quien administra el grupo uno nuevo." }; }
        state.delete(key); return { ok: true, group: g };
      },
    };
  }
  /* SOLO DEMOSTRACIÓN: en producción el token sale de un generador criptográfico (≥ 128 bits) y nunca se registra en logs. */
  const randomCode = (rnd) => String(Math.floor((rnd || Math.random)() * 10000)).padStart(4, "0");
  const randomToken = (rnd) => { const r = rnd || Math.random; let s = ""; for (let i = 0; i < 27; i++) s += "abcdefghjkmnpqrstvwxyz23456789"[Math.floor(r() * 30)]; return s; };

  const api = { can, createJoinGuard, randomCode, randomToken, adminCount, ADMIN_ONLY, WRITES };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BalanceRules = api;
})(typeof window !== "undefined" ? window : globalThis);
