# Plan de fusión a `dev` (preparado, **no ejecutado**)

> **Estado:** nada de esto se ha hecho; **se espera a que el agente termine en `refactor/modular-foundation`**. `AGENTS.md` exige **autorización expresa** para integrar en `dev` o `main` y para tocar zonas protegidas (`AGENTS.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`). Este documento deja el camino listo y señala **dónde hay conflictos reales**, comprobados con **fusiones de ensayo en ramas temporales** (ninguna rama real se tocó). Ensayos del 2026-11-10 con `dev` = `7ba6f1c`. **Repetirlos cuando `refactor/modular-foundation` avance:** los resultados de abajo cambiarán.

## 1. Una sola rama de investigación

Todo lo hablado vive en **`research/requirements-and-prototypes`**: los cinco prototipos con su investigación (Ágora, Huella, Cosecha, **Brisa** y **Balance**), la política de pruebas por etapas y las reglas relajadas. La rama intermedia `research/brisa-balance-prototypes` (con Brisa y Balance) **ya se reunió aquí**; queda sustituida y puede retirarse con autorización.

| Rama | Detrás / delante de `dev` | Estado |
|---|---|---|
| **`research/requirements-and-prototypes`** | 0 / 123 | **La única rama a fusionar.** Línea de `refactor/modular-foundation` + investigación + Brisa y Balance + política por etapas |
| `refactor/modular-foundation` | 0 / 106 | Un agente sigue trabajando. Tiene **1 commit que `research` no contiene** (`3c0054e`, «limitar check-design a las reglas duras»); su **contenido ya está** en `research` (ver §2) |
| `research/brisa-balance-prototypes` | — | **Sustituida** (reunida en `research`). Se puede borrar con autorización |
| `docs/module-rules-precedence` (CCR-1) | 0 / 2 | Aprobado por el propietario pero **sin reaplicar** sobre los documentos nuevos (§3) |
| `docs/brisa-inventory`, `docs/balance-inventory` | 3 / 6 y 3 / 7 | **Sustituidas:** su contenido ya está migrado en `docs/requirements/<app>/INVENTARIO-*.md`. Queda solo el cambio a `docs/modules/BALANCE.md` por alinear (§4) |
| `backup/refactor-modular-foundation-2026-10-25` | 0 / 449 | No tocar |

`dev` está **26 commits por delante de `main`**; este plan no incluye `main`.

## 2. Qué se comprobó en los ensayos (sobre `research` consolidada)

| Ensayo | Resultado |
|---|---|
| `research` → `dev` | Sin conflictos (`dev` es su ancestro: avance rápido) |
| + `refactor/modular-foundation` (su commit `3c0054e`) | **3 conflictos de texto** en `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md` y `docs/TESTING.md`. **Son triviales:** `research` ya contiene ese mismo cambio (se aplicó como parche) más la política por etapas. Verificado por programa: de las líneas que añade `3c0054e` en esos 3 documentos, solo una difiere, a propósito (la verificación de diseño pasó a ser «Etapa 1 / Etapa 2»). Se resuelve **quedándose con la versión de `research`** |
| + `docs/module-rules-precedence` (CCR-1) | **4 conflictos:** `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/modules/BRISA.md` |
| + `docs/balance-inventory` | **1 conflicto:** `docs/modules/BALANCE.md` |
| + `docs/brisa-inventory` | Sin conflictos (pero duplicaría archivos; se descarta) |

**Por qué chocan.** `refactor/modular-foundation` reescribió las zonas protegidas (frente a `dev`: `AGENTS.md` ±107 líneas, `DESIGN_SYSTEM.md` ±217, `ARCHITECTURE.md` ±42) y la política de pruebas por etapas las ajustó otra vez. El CCR-1 se redactó sobre las versiones **antiguas**. Resolver a ciegas con «ours/theirs» **perdería** una de las dos decisiones.

## 3. CCR-1: hay que **reaplicarlo**, no fusionarlo

El CCR-1 está **«aprobado por el propietario y aplicado»** (2026-10-18) pero solo en su rama. Brisa lo necesita (tuteo y paleta propia). Sus cuatro cambios, para reaplicarlos sobre los documentos nuevos:

1. `AGENTS.md`: sección **«Jerarquía de reglas»** (las del módulo prevalecen **solo en diseño del frontend**; lo demás se rige siempre por las generales) y la regla de tono «sin voseo **ni tuteo** salvo que la ficha lo permita». *(En `research`, `AGENTS.md` §7 ya permite voseo y tuteo cuando la ficha o el propietario lo pidan: parte de la intención puede estar cubierta.)*
2. `docs/DESIGN_SYSTEM.md`: párrafo de jerarquía; **«Paleta propia de un módulo»**; el tuteo en la excepción de tono. *(Con las reglas duras como única restricción de color, la parte de hexadecimales ya no aplica.)*
3. `docs/ARCHITECTURE.md` §13: el módulo puede definir paleta, neutros y tono propios en su ficha.
4. `docs/modules/BRISA.md`: sección 7 con las reglas propias de Brisa y el ajuste de la prueba 5 (sin hora del día).

Quien reaplique debe **leer ambas versiones** antes de escribir: varias exigencias del CCR-1 quedaron obsoletas por la relajación de reglas.

## 4. Fichas de módulo: qué falta alinear

Ya hecho en `research`: las rutas de `docs/modules/BRISA.md` y `BALANCE.md` apuntan a `docs/requirements/<app>/INVENTARIO-*.md`, y sus criterios de aceptación están reorganizados en «Etapa 1» y «Diferido a QA (Etapa 2)».

**Pendiente en `docs/modules/BALANCE.md`:** `docs/balance-inventory` lo actualizó para reflejar D1–D9. Aplicar esos cambios de contenido (`git diff 60cfc31f origin/docs/balance-inventory -- docs/modules/BALANCE.md`) sobre la ficha actual, **conservando** la reorganización por etapas y las líneas de identidad visual y de ADR (`docs/DECISIONS.md`) de `research`. Ojo: la ficha todavía describe la **importación desde SaldApp**, mientras el inventario aprobó **empezar desde cero (D5)**; conviene corregirlo en la misma pasada.

**Pendiente en `docs/modules/BRISA.md`:** la sección 7 del CCR-1 (ver §3).

## 5. Orden recomendado (cuando usted autorice y el agente termine)

1. **Esperar** a que `refactor/modular-foundation` termine y **repetir los ensayos** (puede traer más cambios en las zonas protegidas).
2. **Traer su avance a `research`** resolviendo los 3 conflictos triviales (§2) y volver a correr las pruebas esenciales (`docs/TESTING.md`, Etapa 1).
3. **Reaplicar el CCR-1** (§3) y **alinear las fichas** (§4) en una rama corta, con la solicitud de cambio de zonas protegidas aprobada.
4. **Revisión visual del propietario** de Brisa y Balance (capturas): es la verificación que las pruebas no hacen.
5. **PR a `dev`**, de preferencia por partes: 1) base + investigación + política; 2) CCR-1 y fichas.
6. Con autorización expresa: **retirar** `research/brisa-balance-prototypes`, `docs/brisa-inventory` y `docs/balance-inventory` (**no se borraron**).

## 6. Qué decidir antes

1. ¿Cuándo se considera terminado el trabajo de `refactor/modular-foundation`?
2. ¿Se reaplica el CCR-1 en esta misma fusión o en una aparte?
3. ¿Se retiran las ramas sustituidas al terminar?
4. ¿La Etapa 2 (QA profundo) empieza cuando las cinco apps estén funcionales, o hay un hito intermedio?

## 7. Lo que NO se hizo (a propósito)

No se fusionó nada en `dev` ni `main`; no se borró ninguna rama; no se reaplicó el CCR-1 ni se modificaron `AGENTS.md`, `DESIGN_SYSTEM.md` o `ARCHITECTURE.md` por ese motivo; no se abrió ningún PR.
