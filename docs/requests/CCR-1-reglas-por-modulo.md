# CCR-1 — Las reglas de cada módulo prevalecen sobre las generales

| Dato | Valor |
|---|---|
| Estado | **Aprobado por el propietario y aplicado** (autorización expresa en el chat, 2026-10-18) |
| Origen | Investigación del módulo Brisa (`docs/migration/brisa-inventory.md`, §13) |
| Zonas protegidas tocadas | `AGENTS.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md` |
| Otros archivos | `docs/modules/BRISA.md` (ficha del módulo, §7 y plan de pruebas) |

## Motivo
Brisa es una app personal con reglas propias (tuteo y tono de la app original, tema claro propio). Las reglas generales de Pastel no deben bloquear esas excepciones. El propietario decidió que **cada módulo (subproyecto) tiene sus propias reglas y están por encima de las generales; las generales solo aplican si el módulo no define las suyas.**

## Cambios
1. `AGENTS.md`: nueva sección «Jerarquía de reglas» (precedencia del módulo y lo que no se relaja); la regla de tono dice «sin voseo ni tuteo salvo que la ficha… lo permitan».
2. `docs/DESIGN_SYSTEM.md`: párrafo de jerarquía; fila de Brisa en claro con su paleta propia; párrafo «Paleta propia de un módulo»; el tuteo entra en la excepción de tono (§8); los hexadecimales se permiten solo en `tokens.css` y `module-themes.css` (§2.4 y §11).
3. `docs/ARCHITECTURE.md` §13: el módulo puede definir paleta, neutros y tono propios en su ficha.
4. `docs/modules/BRISA.md`: sección 7 con las reglas propias de Brisa y ajustes del plan de pruebas (la prueba 5 ya no supone hora del día).

## Lo que no cambia (no negociable)
Seguridad, fronteras entre módulos, errores y logs sin datos personales, WCAG 2.2 AA, prohibición de morado y de símbolos de IA. Ningún módulo puede relajarlos sin una decisión expresa del propietario.

## Para quien implemente la Fase 0
- `scripts/check-design.mjs` debe excluir `core/design/tokens.css` y `core/design/module-themes.css` de la regla de hexadecimales (siguen vigilados morado y símbolos de IA, y la prueba de contraste F0-W08 cubre los tokens de Brisa).
- No hay código ni CI modificados por este CCR.
