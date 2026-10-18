# Plan de pruebas — <MÓDULO o FASE>

| | |
|---|---|
| Autor (QA) | <agente / sesión> |
| Rama y SHA | <rama> @ <sha> |
| Ficha de producto | `docs/modules/<M>.md` |
| Fecha | <fecha> |

## 1. Alcance
Qué se prueba y qué **no** (con motivo).

## 2. Cómo ejecutar
Comandos exactos, variables de entorno, cómo sembrar datos (`Testing`), URL, cuentas de prueba por rol (usuario y contraseña **solo de prueba**, nunca reales).

## 3. Roles y matriz de permisos
| Rol | Permisos | Puede ver | No debe poder |
|---|---|---|---|

## 4. Trazabilidad (criterio de aceptación → casos)
| Criterio de la ficha | Casos |
|---|---|

## 5. Casos de prueba
Prioridad: **O** = obligatorio, **I** = importante, **D** = deseable. Tipo: F funcional, P permisos, A aislamiento de datos, V validación, E errores, L logs, X accesibilidad, R responsive, S seguridad, C cálculo, U usabilidad, N rendimiento básico.

| ID | Tipo | Prio | Precondiciones | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| <M>-001 | F | O | | | |

## 6. Casos negativos y de abuso
Entradas inválidas, límites, concurrencia (dos pestañas), repetición de envíos, manipulación de IDs de otros usuarios, rutas protegidas sin sesión, `returnUrl` malicioso, cargas excesivas.

## 7. Errores y logs
Por cada error previsto: estado HTTP, `code`, mensaje en pantalla, `traceId` presente. Verificar que los logs no contienen datos sensibles (ver `docs/ERROR_HANDLING_AND_LOGGING.md` §7).

## 8. Accesibilidad y usabilidad
Teclado completo, foco visible, 320 px, 200 % de zoom, texto "Muy grande", claro/oscuro, lector de pantalla en un flujo clave, contraste, mensajes comprensibles.

## 9. Cartas exploratorias
3 a 5 misiones de 20–30 min ("Explorar X con el rol Y buscando Z").

## 10. Criterios de salida
Todos los "O" ejecutados y en verde; 0 Críticos/Altos abiertos; Medios aceptados por el propietario.

## 11. Limitaciones y riesgos conocidos
