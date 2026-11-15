# Plan de fusión a `dev` (**ejecutado el 2026-11-15**)

> **Estado (2026-11-15): ejecutado.** El propietario autorizó la integración («Todo validado, integra a rama dev»). Se repitieron los ensayos (`refactor/modular-foundation` en `a28da7b` y `dev` en `7ba6f1c`, sin cambios ni conflictos), se reaplicó CCR-1 adaptado y `research/requirements-and-prototypes` entró en `dev` con un merge normal. Las ramas sustituidas se retiraron después, conservando con etiquetas de archivo los commits que no llegaban a `dev` (D-121). CCR-2 sigue aprobado y sin aplicar. Lo que sigue es el registro del camino recorrido.

## 1. Una sola rama de investigación

Todo lo hablado vive en **`research/requirements-and-prototypes`**: los cinco prototipos con su investigación (Ágora, Huella, Cosecha, **Brisa** y **Balance**), la política de pruebas por etapas y las reglas relajadas. La rama intermedia `research/brisa-balance-prototypes` (con Brisa y Balance) **ya se reunió aquí**; queda sustituida; su retiro está aprobado **solo después de una integración exitosa y verificada** (junto con `docs/brisa-inventory` y `docs/balance-inventory`; **nunca** `backup/refactor-modular-foundation-2026-10-25`).

| Rama | Detrás / delante de `dev` | Estado |
|---|---|---|
| **`research/requirements-and-prototypes`** | 0 detrás de `dev` | **La única rama a fusionar.** Contiene `refactor/modular-foundation` (merge `a619019`) + investigación + Brisa y Balance + política por etapas + decisiones del 2026-11-13 |
| `refactor/modular-foundation` | 0 detrás de `research` | **Ya integrada** en `research` hasta `a28da7b`. Si el agente sigue añadiendo commits, hay que volver a traerlos antes de integrar a `dev` |
| `research/brisa-balance-prototypes` | — | **Sustituida** (reunida en `research`). Se puede borrar con autorización |
| `docs/module-rules-precedence` (CCR-1) | 0 / 2 | Aprobado por el propietario; **se reaplica adaptado** durante la integración (§3). No se fusiona esta rama |
| `docs/brisa-inventory`, `docs/balance-inventory` | 3 / 6 y 3 / 7 | **Sustituidas:** su contenido ya está migrado en `docs/requirements/<app>/INVENTARIO-*.md` y la ficha de Balance ya se alineó (§4) |
| `backup/refactor-modular-foundation-2026-10-25` | 0 / 449 | No tocar |

`dev` está **26 commits por delante de `main`**; este plan no incluye `main`.

## 2. Qué se comprobó

**Hecho real (2026-11-13):** `refactor/modular-foundation` → `research` con un merge normal (`a619019`, sin rebase). Hubo **6 conflictos de documentación** (`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DESIGN_SYSTEM.md`, `docs/PROGRESS.md`, `docs/TESTING.md`) resueltos conservando lo de ambas ramas; el código fusionó sin conflictos. Se validaron las pruebas del frontend y las de investigación.

**Ensayos del 2026-11-10 (históricos; por repetir cuando `refactor` termine):**

| Ensayo | Resultado entonces |
|---|---|
| `research` → `dev` | Sin conflictos (`dev` es su ancestro: avance rápido) |
| + `docs/module-rules-precedence` (CCR-1) | 4 conflictos: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/modules/BRISA.md` |
| + `docs/balance-inventory` | 1 conflicto: `docs/modules/BALANCE.md` (ya resuelto al alinear la ficha) |
| + `docs/brisa-inventory` | Sin conflictos (pero duplicaría archivos; se descarta) |

**Por qué chocan.** `refactor/modular-foundation` reescribió las zonas protegidas y la política de pruebas por etapas las ajustó otra vez; el CCR-1 se redactó sobre las versiones **antiguas**. Resolver a ciegas con «ours/theirs» **perdería** una de las dos decisiones.

## 3. CCR-1: se reaplica adaptado, no se fusiona

El propietario decidió (2026-11-13) reaplicarlo **durante el proceso de integración**, adaptado a las reglas actuales y leyendo ambas versiones de los documentos protegidos. El análisis ya está hecho, punto por punto (qué se conserva, qué se adapta y qué se descarta por obsoleto), con el texto listo para aplicar: [`../requests/CCR-1-reaplicacion-adaptada.md`](../requests/CCR-1-reaplicacion-adaptada.md). **No se aplicó** a `AGENTS.md`, `DESIGN_SYSTEM.md` ni `ARCHITECTURE.md`. Resumen: solo sobreviven la «Jerarquía de reglas» y el cambio de `ARCHITECTURE.md`; la regla de hexadecimales, el tono y las paletas de DESIGN_SYSTEM quedan descartados o diferidos.

La solicitud del motor documental (Typst, fuentes, `Pastel.Documents`) es **otra**: [`../requests/CCR-2-motor-documental-typst.md`](../requests/CCR-2-motor-documental-typst.md); es independiente de CCR-1.

## 4. Fichas de módulo

Ya hecho en `research`: las rutas de `docs/modules/BRISA.md` y `BALANCE.md` apuntan a `docs/requirements/<app>/INVENTARIO-*.md`, y sus criterios están reorganizados en «Etapa 1» y «Diferido a QA (Etapa 2)». **`docs/modules/BALANCE.md` quedó alineada el 2026-11-13** con D1–D9 (inicio desde cero, sin importación, cuenta obligatoria) y con las decisiones de ese día.

**Pendiente en `docs/modules/BRISA.md`:** la sección 7 y la corrección de la prueba 5, que viajan con CCR-1 (§3).

## 5. Orden recomendado (cuando usted autorice y el agente termine)

1. **Esperar** a que `refactor/modular-foundation` termine, **revisar sus cambios** y **repetir los ensayos**.
2. **Volver a traer** a `research` lo nuevo de `refactor` (el merge del 2026-11-13 ya cubrió hasta `a28da7b`) y correr las pruebas esenciales (`docs/TESTING.md`, Etapa 1).
3. **Reaplicar CCR-1** adaptado (§3) en una rama corta, con autorización expresa para las zonas protegidas.
4. **Autorizar y aplicar CCR-2** (independiente de CCR-1), una vez verificadas la versión de Typst y las licencias.
5. **Revisión visual del propietario** de los prototipos (capturas): es la verificación que las pruebas no hacen.
6. **PR a `dev`**, de preferencia por partes: 1) base + investigación + política; 2) CCR-1 y fichas.
7. Solo tras una integración **exitosa y verificada**: retirar `research/brisa-balance-prototypes`, `docs/brisa-inventory` y `docs/balance-inventory` (**no se borraron**). **No tocar** `backup/refactor-modular-foundation-2026-10-25`.

## 6. Decisiones ya tomadas y lo que sigue abierto

**Decidido el 2026-11-13:** CCR-1 se reaplica durante el proceso de integración (adaptado); las ramas sustituidas se retiran tras una integración exitosa y verificada; la Etapa 2 de QA empieza cuando las cinco apps estén funcionales; la fusión a `dev` no está autorizada.

**Sigue abierto:** ¿cuándo se considera terminado el trabajo de `refactor/modular-foundation`? (lo anuncia el propietario).

## 7. Lo que NO se hizo (a propósito)

Hasta el 2026-11-13 no se fusionó nada ni se borró ninguna rama. El 2026-11-15, con autorización: integración a `dev` y retiro de las ramas sustituidas (con etiquetas de archivo). **No** se tocó `main`, `refactor/modular-foundation`, `docs/module-rules-precedence` ni `backup/refactor-modular-foundation-2026-10-25`; no se aplicó CCR-2; no se abrió PR.
