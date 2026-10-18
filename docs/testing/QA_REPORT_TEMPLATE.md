# Informe de QA — <MÓDULO o FASE>

| | |
|---|---|
| Agente QA (sesión distinta a Dev y a Build) | <id> |
| Rama y **SHA probado** | <rama> @ <sha> |
| Plan ejecutado | `docs/testing/plans/<M>-TEST-PLAN.md` (versión/SHA) |
| Fecha y entorno | <fecha> · <comandos/versión> |

## 1. Veredicto
**APROBADO / APROBADO CON RESERVAS / RECHAZADO** — una frase con el motivo.

## 2. Resumen
| Casos | Ejecutados | Pasan | Fallan | Bloqueados | No ejecutados (motivo) |
|---|---|---|---|---|---|

Defectos: Críticos <n> · Altos <n> · Medios <n> · Bajos <n>

## 3. Cobertura de criterios de aceptación
| Criterio | Resultado | Evidencia |
|---|---|---|

## 4. Defectos
Lista con ID, severidad, resumen y enlace a su ficha (plantilla `DEFECT_TEMPLATE.md`).

## 5. Seguridad, permisos y aislamiento de datos
Resultados de las pruebas de autorización vertical (rol sin permiso) y horizontal (datos de otro usuario).

## 6. Errores y logs
Resultado de la lista de `ERROR_HANDLING_AND_LOGGING.md` §7: formato de error, `traceId`, ausencia de datos sensibles.

## 7. Accesibilidad y usabilidad
Resultados y capturas (móvil/escritorio, claro/oscuro).

## 8. Pruebas automatizadas añadidas
Rutas, qué cubren y resultado de ejecución en CI/local.

## 9. Lo que NO se probó y por qué

## 10. Recomendación para el propietario
Qué revisar manualmente antes de integrar y riesgos residuales.
