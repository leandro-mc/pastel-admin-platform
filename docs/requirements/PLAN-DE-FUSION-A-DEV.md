# Plan de fusión a `dev` (preparado, **no ejecutado**)

> **Estado:** nada de esto se ha hecho. `AGENTS.md` exige **autorización expresa** para integrar en `dev` o `main` y para tocar zonas protegidas (`AGENTS.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`). Este documento deja el camino listo y señala **dónde hay conflictos reales**, comprobados con **fusiones de ensayo en ramas temporales** (ninguna rama real se tocó). Fecha de los ensayos: 2026-11-09, `dev` = `7ba6f1c`.

## 1. Estado de las ramas relevantes (respecto de `dev`)

| Rama | Detrás / delante | Qué contiene | Se fusiona tal cual |
|---|---|---|---|
| `research/requirements-and-prototypes` | 0 / 110 | Línea de `refactor/modular-foundation` + la investigación de Ágora, Huella y Cosecha | Sí (avance rápido: `dev` es su ancestro) |
| **`research/brisa-balance-prototypes`** (esta) | 0 / 117 | Lo anterior + Brisa y Balance migrados al formato de `docs/requirements/` | Sí (avance rápido sobre `research`) |
| `refactor/modular-foundation` | 0 / 106 | Base modular; **tiene 1 commit más reciente que `research`** (`3c0054e`, 2026-11-07: «limitar check-design a las reglas duras») | Entra **limpio** en esta rama (ensayo sin conflictos) |
| `docs/module-rules-precedence` (CCR-1) | 0 / 2 | Regla «las reglas de diseño del frontend de cada módulo prevalecen» + reglas propias de Brisa | **No mecánicamente** (4 conflictos, ver §3) |
| `docs/brisa-inventory` | 3 / 6 | Inventario original de Brisa en `docs/migration/` | **No: ya migrado** (entra limpio pero duplicaría) |
| `docs/balance-inventory` | 3 / 7 | Inventario original de Balance + cambios a `docs/modules/BALANCE.md` | **No: ya migrado**; sus cambios a la ficha hay que aplicarlos a mano (§4) |
| `backup/refactor-modular-foundation-2026-10-25` | 0 / 449 | Copia de respaldo | No tocar |

`dev` está **26 commits por delante de `main`**; este plan no incluye `main`.

## 2. Qué se comprobó en los ensayos

| Ensayo (sobre `dev` + esta rama) | Resultado |
|---|---|
| Esta rama → `dev` | Sin conflictos |
| + `refactor/modular-foundation` (su commit nuevo) | Sin conflictos |
| + `docs/brisa-inventory` | Sin conflictos (pero duplicaría los archivos; se descarta) |
| + `docs/balance-inventory` | **1 conflicto:** `docs/modules/BALANCE.md` |
| + `docs/module-rules-precedence` (CCR-1) | **4 conflictos:** `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/modules/BRISA.md` |

**Por qué chocan.** `refactor/modular-foundation` reescribió esas mismas zonas protegidas (frente a `dev`: `AGENTS.md` ±107 líneas, `DESIGN_SYSTEM.md` ±217, `ARCHITECTURE.md` ±42). El CCR-1 se redactó sobre las versiones **antiguas**. Resolver a ciegas con «ours/theirs» **perdería** una de las dos decisiones.

## 3. CCR-1: hay que **reaplicarlo**, no fusionarlo

El CCR-1 está **«aprobado por el propietario y aplicado»** (2026-10-18) pero solo en su rama. Brisa lo necesita (tuteo y paleta propia). Sus cuatro cambios, para reaplicarlos sobre los documentos nuevos:

1. `AGENTS.md`: sección **«Jerarquía de reglas»** (las del módulo prevalecen **solo en diseño del frontend**; lo demás se rige siempre por las generales) y la regla de tono «sin voseo **ni tuteo** salvo que la ficha lo permita».
2. `docs/DESIGN_SYSTEM.md`: párrafo de jerarquía; **«Paleta propia de un módulo»**; el tuteo entra en la excepción de tono; los hexadecimales se permiten solo en `tokens.css` y `module-themes.css`. *(La fila de Brisa en claro con su paleta propia puede quedar obsoleta si `refactor` ya quitó esa tabla.)*
3. `docs/ARCHITECTURE.md` §13: el módulo puede definir paleta, neutros y tono propios en su ficha.
4. `docs/modules/BRISA.md`: sección 7 con las reglas propias de Brisa y el ajuste de la prueba 5 (sin hora del día).

**Importante:** el commit `3c0054e` ya cambió `check-design` a «solo reglas duras» y tocó `DESIGN_SYSTEM.md`/`ARCHITECTURE.md`. Parte de la intención del CCR-1 (hexadecimales en `module-themes.css`) puede **ya estar cubierta**. Conviene que quien reaplique **lea ambos** antes de escribir.

## 4. Fichas de módulo: qué hay que alinear

**`docs/modules/BALANCE.md`** — `docs/balance-inventory` lo actualizó para reflejar D1–D9; `research` también lo tocó (identidad visual «por definir», «ADR» → `docs/DECISIONS.md`, criterios de aceptación esenciales). Resolver **conservando ambas**:
- tomar los cambios de contenido de D1–D9 (`git diff 60cfc31f origin/docs/balance-inventory -- docs/modules/BALANCE.md`);
- conservar los cambios de `research` (líneas de identidad y de política de pruebas);
- reemplazar la ruta `docs/migration/balance-inventory.md` por **`docs/requirements/balance/INVENTARIO-BALANCE.md`**;
- apuntar a los nuevos requerimientos, roles y prototipo.

**`docs/modules/BRISA.md`** — reemplazar la mención de `docs/migration/brisa-inventory.md` («está en la rama `docs/brisa-inventory`, aún sin integrar») por **`docs/requirements/brisa/INVENTARIO-BRISA.md`**; añadir la sección 7 del CCR-1.

Ambas fichas **no se tocaron en esta rama** a propósito: así esta rama es de **solo adiciones** y no genera conflictos nuevos.

## 5. Orden recomendado (cuando usted autorice)

1. **Traer `refactor/modular-foundation` a esta rama** (1 commit, limpio) y volver a correr `npm test` en `docs/requirements/prototype-tests`.
2. **Reaplicar el CCR-1** (§3) en una rama corta desde esa base, con la solicitud de cambio de las zonas protegidas aprobada.
3. **Alinear las fichas** `BALANCE.md` y `BRISA.md` (§4) en la misma rama.
4. **Revisión visual del propietario** de Brisa y Balance (capturas): es la verificación que las pruebas no hacen.
5. **PR a `dev`** de una sola vez o por partes (recomendado por partes: 1) base + investigación; 2) CCR-1 y fichas), cada una con su descripción.
6. Con autorización expresa: **retirar** `docs/brisa-inventory` y `docs/balance-inventory` (quedan obsoletas; **no se borraron**).

## 6. Qué decidir antes

1. ¿Esta rama se integra primero en `research/requirements-and-prototypes` (avance rápido) o va directa a `dev`?
2. ¿`refactor/modular-foundation` ya está aprobada para `dev`? (Fusionar `research` la arrastra: son sus 106 commits.)
3. ¿Se reaplica el CCR-1 en esta misma fusión o en una aparte?
4. ¿Se retiran las ramas `docs/*-inventory` al terminar?

## 7. Lo que NO se hizo (a propósito)

No se fusionó nada en `dev`, `main` ni `research`; no se borró ninguna rama; no se modificaron `AGENTS.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md` ni las fichas de módulo; no se abrió ningún PR.
