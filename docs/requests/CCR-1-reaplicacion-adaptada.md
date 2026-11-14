# CCR-1 — Reaplicación adaptada a las reglas actuales

| Dato | Valor |
|---|---|
| Estado | **Preparada el 2026-11-13. No aplicada.** Es el análisis y el texto listo para aplicar; no se modificó ningún documento protegido. |
| Decisión del propietario | Reaplicar CCR-1 **durante el proceso de integración**, adaptado a las reglas actuales, leyendo ambas versiones de los documentos protegidos; sin fusión ciega y sin recuperar reglas obsoletas. La integración a `dev` **no está autorizada** todavía. |
| Solicitud original | `docs/requests/CCR-1-reglas-por-modulo.md` en la rama `docs/module-rules-precedence` (commit `a1a0a96`, sobre `dev` `7ba6f1c`). Allí figura «aprobado y aplicado», pero solo en esa rama. |
| Zonas protegidas que tocaría | `AGENTS.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md` (requieren autorización expresa del propietario) y la ficha `docs/modules/BRISA.md` (no protegida) |
| Relación con otras solicitudes | **No es CCR-2** (motor documental, Typst y fuentes): [`CCR-2-motor-documental-typst.md`](CCR-2-motor-documental-typst.md). |

## Qué decía CCR-1
Cada módulo tiene sus propias reglas de **diseño del frontend**, que prevalecen sobre las generales; las generales aplican solo si el módulo no regula ese punto. Vale únicamente para el diseño del frontend: arquitectura, backend, seguridad, errores y logs, flujo de trabajo y pruebas siguen las reglas generales.

## Qué cambió desde entonces
Se compararon `dev` (`7ba6f1c`), la rama de CCR-1 (`a1a0a96`) y el estado actual de esta rama (que ya incluye `refactor/modular-foundation`, `a28da7b`):

- **Restricción de hexadecimales retirada:** `scripts/check-design.mjs` ya no la verifica; `DESIGN_SYSTEM.md` §1 solo vigila morado e iconos o emojis de IA, y dice que no hay restricción sobre colores literales.
- **Accesibilidad:** pasó a objetivo de calidad (no bloquea); lo único que bloquea es `DESIGN_SYSTEM.md` §1 (y el §9 para quien toque el shell).
- **Tono:** `AGENTS.md` y `DESIGN_SYSTEM.md` ya permiten voseo, tuteo u otra voz cuando la ficha o el propietario lo pidan, para toda la plataforma o un módulo.
- **Paletas por módulo:** `DESIGN_SYSTEM.md` §1 dice «no inventar ni fijar paletas por módulo mientras la investigación no las defina»; los tokens de `module-themes.css` son provisionales.
- **Decisiones del propietario del 2026-11-13:** Brisa aprobó «Deshacer» y bajó la mezcla oscura de las tarjetas al 28 % sin token nuevo.

## Resolución punto por punto

| # | Contenido de CCR-1 | Estado actual | Resolución |
|---|---|---|---|
| 1 | `AGENTS.md`: regla de tono «sin voseo ni tuteo salvo que la ficha… lo permitan» | Ya dice «trato de usted por defecto; el voseo y el tuteo se permiten cuando la ficha o el propietario lo pidan» | **Descartar** (cubierto) |
| 2 | `AGENTS.md`: sección «Jerarquía de reglas» | No existe | **Adaptar y aplicar** (texto abajo) |
| 3 | `DESIGN_SYSTEM.md`: párrafo de jerarquía | No existe | **Adaptar y aplicar** (texto abajo) |
| 4 | `DESIGN_SYSTEM.md`: fila de Brisa en claro, «Paleta propia de un módulo» y «Contrastes verificados» | Contradice §1 (no fijar paletas por módulo) y los números eran de tokens ya cambiados | **Diferir:** no se agrega ninguna paleta hasta definir la identidad visual (revisión visual pendiente). Cuando se defina, se recalcula el contraste |
| 5 | `DESIGN_SYSTEM.md`: hexadecimales solo en `tokens.css` y `module-themes.css`; `check-design.mjs` debe excluirlos | Regla retirada | **Descartar** (reintroduciría una regla obsoleta) |
| 6 | `DESIGN_SYSTEM.md` §8: tuteo como excepción de tono | Ya cubierto (voz a pedido del propietario, plataforma o módulo) | **Descartar** |
| 7 | `DESIGN_SYSTEM.md`: «los colores salen de tokens… nunca hexadecimales» | Ahora es recomendación sin comprobación automática | **Descartar** |
| 8 | `ARCHITECTURE.md` §13, punto 4: el módulo define paleta, neutros y tono propios en su ficha | Dice «tokens del módulo en `module-themes.css` cuando su identidad visual esté definida (hoy provisionales)» | **Adaptar y aplicar** (texto abajo; sin «CCR si es nuevo») |
| 9 | `BRISA.md`: §7 «Reglas propias de diseño» | No existe | **Adaptar** (texto abajo) |
| 10 | `BRISA.md`: «Deshacer» y recordatorios aplazados | «Deshacer» aprobado el 2026-11-13 (BR-19) | **Descartar lo de «Deshacer»**; los recordatorios siguen aplazados |
| 11 | `BRISA.md`: tema oscuro con mezcla al 36 % | Decidido 28 % (D-105) | **Corregir** al 28 % |
| 12 | `BRISA.md`: corrección de la prueba 5 (sin hora del día) y rutas del inventario | La prueba 5 actual aún supone hora del día; las rutas ya apuntan a `docs/requirements/brisa/` | **Aplicar solo la corrección de la prueba 5** |
| 13 | `BRISA.md`: pruebas nuevas 9 a 12 como criterios de aceptación | La política de pruebas por etapas no amplía las esenciales sin decisión del propietario | **No agregar a la Etapa 1:** pasan a «Diferido a QA — Etapa 2» (o se consulta al propietario) |

## Texto adaptado listo para aplicar

**`AGENTS.md`, nueva sección «Jerarquía de reglas»**
> Cada módulo (subproyecto) puede tener sus propias reglas de **diseño del frontend** (tono y textos, paleta y tokens, patrones de interfaz) en su ficha `docs/modules/<M>.md` o su `MODULE.md`, y **prevalecen sobre las guías generales de diseño** de este archivo y de `DESIGN_SYSTEM.md`, que solo aplican en lo que el módulo no regula. **Esto vale únicamente para el diseño del frontend:** arquitectura, backend, seguridad, errores y logs, flujo de trabajo y pruebas se rigen siempre por las reglas generales. Tampoco se relajan las **reglas duras** de `DESIGN_SYSTEM.md` §1 (morado y símbolos de IA) ni, en el shell compartido, el §9. Las excepciones de un módulo se escriben en su ficha.

**`docs/DESIGN_SYSTEM.md`, párrafo tras «Qué obliga y qué orienta»**
> **Jerarquía de reglas:** las reglas de **diseño del frontend** de cada módulo (su ficha en `docs/modules/` y su `MODULE.md`) prevalecen sobre las guías de este documento; las de aquí aplican en lo que el módulo no regula. Solo el diseño del frontend: lo demás se rige por las reglas generales. No se relaja la sección 1 (ver `AGENTS.md`, «Jerarquía de reglas»).

**`docs/ARCHITECTURE.md`, punto 4 de la lista de módulo nuevo**
> 4. Tokens del módulo en `web/src/core/design/module-themes.css` cuando su identidad visual esté definida (hoy provisionales). El módulo puede definir paleta, neutros y tono propios en su ficha: prevalecen sobre las guías generales de diseño del frontend (`AGENTS.md`, «Jerarquía de reglas»); lo demás sigue las reglas generales.

**`docs/modules/BRISA.md`, sección 7 «Reglas propias de diseño del frontend de Brisa»**
> 1. **Tono y textos:** tuteo, cálido, calmado y sin culpa, igual que la app original; se conservan los textos originales (inventario §13.8) y los nuevos usan el mismo tono. Sin voseo.
> 2. **Tema claro propio**, tomado de la app Android, con los dos valores ajustados a contraste (texto secundario y error). **Los valores definitivos del acento quedan pendientes de la revisión visual:** el inventario §13.7 cita `#315B4A`, mientras el prototipo y los tokens provisionales usan `#48775b`/`#416b52`.
> 3. **Tema oscuro:** el de la plataforma, sin el fondo verdoso de Android. Las tarjetas de tarea mezclan su color pastel al **28 %** con `--surface`, con los tokens existentes y sin token nuevo; la fecha límite usa el texto general (`--text`) en esa tarjeta.
> 4. **Patrón de interfaz:** «Deshacer» tras marcar/reabrir o eliminar, con reversión segura (BR-19 en `docs/requirements/brisa/REQUERIMIENTOS-BRISA.md`). Los recordatorios siguen aplazados.

**`docs/modules/BRISA.md`, prueba 5 (corrección)**
> 5. Fechas: con «hoy» en la zona configurada de la persona (por defecto `America/Costa_Rica`, UTC-6, sin horario de verano), un pendiente del día 18 sigue en «Hoy» a las 23:30 hora local aunque en UTC ya sea el 19, y deja de serlo solo a las 00:00 local. Brisa no maneja hora del día ni repetición de tareas (inventario §13.1–§13.3).

## Cómo y cuándo se aplica
1. Con la integración a `dev` autorizada y `refactor/modular-foundation` terminada: **releer** `AGENTS.md`, `DESIGN_SYSTEM.md` y `ARCHITECTURE.md` en su estado de ese momento (pueden haber cambiado otra vez) y confirmar que esta tabla sigue valiendo.
2. Aplicar solo las filas marcadas «aplicar» o «adaptar», en una rama corta, con autorización expresa para las zonas protegidas.
3. Repetir las verificaciones (`check-design`, `check-module-boundaries`, pruebas del frontend).

## Pendiente
- Autorización expresa del propietario para tocar las zonas protegidas.
- Que termine `refactor/modular-foundation` y se repitan los ensayos de integración.
- Decidir el acento claro de Brisa tras la revisión visual.
