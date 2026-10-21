# Estrategia de pruebas — responsabilidades de desarrollo, build y QA

## 1. Regla de oro
La validación debe ser real, trazable y proporcional al riesgo. Hay tres responsabilidades: Dev (implementación), Build (compilación y pruebas unitarias) y QA (pruebas funcionales, integración y E2E). **En esta etapa se permite combinar Build y QA en la misma sesión/agente** para ahorrar sesiones; cuando se combinen, debe completar ambas responsabilidades, registrar los comandos/resultados y repetir las validaciones afectadas después de corregir código. La revisión independiente sigue siendo preferible para cambios críticos, seguridad o cuando haya capacidad, pero no es obligatoria para cada módulo. La integración a `dev` requiere autorización explícita del propietario.

## 1.1 Cadencia y controles proporcionales al riesgo

La suite debe reducir riesgos de comportamiento, seguridad e integración, no convertir cada edición en una auditoría completa. Conserva los controles, pero ejecuta cada nivel en el momento adecuado:

1. **Bucle de desarrollo:** pruebas unitarias/componentes y lint del área modificada; compilación del proyecto afectado cuando sea viable. Úsalo al depurar, antes de ejecutar validaciones más caras.
2. **Cierre de una unidad lógica:** formato, lint, build y pruebas enfocadas; agrega integración con base real cuando el cambio toca persistencia, autorización, migraciones, contratos HTTP o concurrencia. Revisa el diff completo y repite las pruebas afectadas tras corregir.
3. **Hito de integración o cierre de fase:** suite completa del repositorio, integración desde una base vacía, E2E de los recorridos críticos, revisión visual de las áreas afectadas y reporte con el SHA exacto. La Fase 0 conserva todos sus casos obligatorios **O**; esta cadencia no los elimina.

### Qué bloquea y qué es una métrica

- **Bloquea:** compilación fallida; prueba relevante fallida; defectos críticos/altos; fallos de autorización, aislamiento, integridad de datos, seguridad, migraciones o contratos; una frontera modular infringida; exposición de secretos; incumplir una prohibición explícita de diseño; o falta de evidencia de un caso obligatorio al cerrar la Fase 0.
- **Se revisa cuando aplica:** accesibilidad/axe, responsive, capturas claro/oscuro y flujos de navegador para cambios de UI. Una modificación exclusiva de backend no necesita repetir una inspección visual de todas las pantallas.
- **Se informa como métrica, no como bloqueo aislado:** líneas por archivo CSS, porcentaje global de utilidades Tailwind, clases semánticas usadas una sola vez, número total de líneas de `@apply` dentro de `base.css`, avisos de tamaño de bundle sin un presupuesto acordado y porcentaje general de cobertura. Ninguna de estas cifras demuestra por sí misma funcionalidad, seguridad o calidad visual. Las prohibiciones reales —por ejemplo `@apply` fuera de `base.css`, colores sueltos, morado o iconografía vetada— sí siguen siendo bloqueos.

### Las pruebas acompañan al comportamiento

En el desarrollo normal de cada subapp, incluye o actualiza pruebas enfocadas en la misma unidad de trabajo: camino válido, denegación/entrada inválida y los casos límite con riesgo real. No escribas pruebas que solo repitan detalles internos ni fuerces una prueba por cada regla CSS. Para defectos críticos/altos, añade una prueba de regresión automatizada cuando sea posible. Si la responsabilidad o una zona protegida impide al agente actual escribir la prueba, deja explícito quién la debe completar y no presentes el caso como validado. No hay un porcentaje universal de cobertura; la ficha del módulo define los comportamientos de negocio que deben protegerse.

## 2. Tipos de agente

| Tipo | Hace | No hace | Zona de escritura |
|---|---|---|---|
| **Dev** | Implementa el código de aplicación y hooks de testabilidad. Si su entorno lo permite, ejecuta build/pruebas locales pertinentes; si no, puede entregar sin compilar y debe declararlo en `PROGRESS.md` e informe. No escribe el plan de pruebas ni certifica resultados no ejecutados | Inventar resultados, ocultar limitaciones, o afirmar que compila sin comprobarlo | Su módulo y documentación de progreso |
| **Build** (entorno de compilación obligatorio) | Restaura y compila; corrige errores de build/pruebas en el código de producto sin cambiar comportamiento acordado; genera migraciones; escribe/ejecuta pruebas unitarias y de caracterización; informa comandos reales | Cambiar diseño/comportamiento especificado sin CCR; debilitar pruebas para que pasen | Correcciones mínimas, pruebas unitarias/caracterización e informe BUILD |
| **QA** (entorno de compilación y ejecución obligatorio) | Escribe el plan desde la ficha; ejecuta pruebas funcionales, permisos, aislamiento, errores/logs, accesibilidad, responsive y seguridad básica; automatiza regresión de integración/E2E; reporta defectos reproducibles | Cambiar código de producto como parte de la verificación; si se combina con Build, debe registrar ambas funciones y volver a validar tras corregir | Pruebas QA, planes e informes |
| **Investigación** | Produce documentos (inventarios) | Tocar código | `docs/migration/**` |
| **Mantenimiento** | Aplica CCR aprobados en zonas protegidas | Funcionalidad de módulos | La zona del CCR |

## 3. Flujo por módulo (o fase)

 ```
Dev ──► código de aplicación y progreso ──► rama de tarea (puede quedar sin compilar si el entorno no lo permite)
        │
Build (o agente combinado Build+QA; entorno obligatorio)
  1. Restaura y compila; corrige errores de build y del código de producto
  2. Genera migraciones y escribe/ejecuta pruebas unitarias y de caracterización
        │
QA (puede ser la misma sesión que Build en esta etapa)
  1. Escribe/actualiza el plan desde la ficha
  2. Ejecuta caja negra y caja gris, automatiza integración/E2E y reporta defectos
  3. Si corrige código como parte del rol Build combinado, vuelve a ejecutar las validaciones afectadas
        │
Propietario: revisa los resultados y autoriza explícitamente abrir PR y/o integrar a dev
```

**Puerta de integración:** build y pruebas obligatorias en verde sobre el SHA propuesto, sin defectos Críticos o Altos abiertos; defectos Medios aceptados por escrito por el propietario. Si Build+QA se combinaron, el informe debe indicarlo y demostrar que las comprobaciones se ejecutaron sobre el SHA final.

## 4. Qué entrega cada rol para que el siguiente pueda trabajar
1. **Dev:** código completo y coherente; `MODULE.md` actualizado (rutas, permisos, códigos de error); `PROGRESS.md` con lo implementado, lo pendiente y **qué no se compiló ni se ejecutó**.
2. **Dev — datos y cuentas de prueba:** un sembrador `Testing` (solo cuando `ASPNETCORE_ENVIRONMENT` es `Development` o `Testing`; **debe negarse a ejecutarse en `Production`**; Build escribe la prueba que lo verifica) que crea un usuario por rol con inicio de sesión local, más datos de ejemplo. Las pruebas automatizadas usan el inicio de sesión local, no Google. Los nombres y claves **de prueba** quedan en `PROGRESS.md`.
3. **Dev — hooks de testabilidad:** roles y etiquetas accesibles estables (preferir `getByRole`/`getByLabelText`; `data-testid` solo cuando no haya alternativa).
4. **Build:** informe de build con comandos exactos y resultados reales; pruebas unitarias; migraciones generadas.
5. **QA:** **plan de pruebas** `docs/testing/plans/<MODULO>-TEST-PLAN.md` (plantilla en `docs/testing/TEST_PLAN_TEMPLATE.md`), escrito a partir de la **ficha de producto**, no de la implementación: matriz de trazabilidad (criterio de aceptación → casos), roles, casos negativos y de abuso, errores y logs, accesibilidad, datos de prueba y **cómo ejecutar** (comandos exactos, variables, cuentas de prueba por rol tomadas de `PROGRESS.md`).

## 5. Objetividad y ejecución de QA
- El plan lo escribe QA a partir de la ficha, sin esperar a Dev, y lo amplía durante la ejecución. Los casos obligatorios mínimos de cada módulo están en su ficha (`docs/modules/<M>.md`, sección "Plan de pruebas — mínimos").
- Primera pasada **solo con la ficha y el plan**; la lectura del código llega después. Esto evita sesgo de confirmación.
- QA no reutiliza datos o ayudantes de las pruebas unitarias de Build como oráculo: calcula los resultados esperados desde la ficha (p. ej., montos y repartos de Cosecha, saldos de Balance).
- Si QA necesita un cambio de testabilidad en el código, lo pide como defecto de tipo "Testabilidad".

## 6. Niveles y responsables

| Nivel | Qué cubre | Dónde vive | Responsable |
|---|---|---|---|
| Unitarias (dominio, funciones puras, componentes) | Reglas y cálculos | `Pastel.Modules.<M>.Tests`, `web/src/modules/<m>/**/*.test.tsx` | Build |
| Integración API + PostgreSQL real | Endpoints, permisos, aislamiento, errores, auditoría, logs sin datos sensibles | `tests/Pastel.IntegrationTests/QA/<M>/` | QA. (Solo en la Fase 0, Build escribe además las pruebas de caracterización en `tests/Pastel.IntegrationTests/Foundation/` sobre el SHA base, para comparar antes y después del refactor; QA las revisa y escribe las suyas aparte) |
| E2E (Playwright) | Flujos de usuario por rol, responsive, accesibilidad (axe), sesión | `tests/e2e/<m>/` | QA |
| Arquitectura y diseño | Fronteras, paleta, símbolos de IA, Tailwind | `tests/Pastel.ArchitectureTests`, `scripts/` | Build (Fase 0); el código de las herramientas de verificación lo escribe Dev |
| Exploratoria y de usabilidad | Lenguaje, claridad, errores humanos, texto grande | Informe QA | QA |
| Pruebas de seguridad básicas | Autorización vertical y horizontal, CSRF, límites, inyección en entradas, redirecciones | Integración + informe | QA |

## 7. Entornos de prueba
`docker compose up --build` con `ASPNETCORE_ENVIRONMENT=Testing`, `Auth:Local:Enabled=true`, Google desactivado salvo la prueba manual real. Base de datos efímera por ejecución (volumen nuevo o Testcontainers). Zona horaria `America/Costa_Rica`.

## 7.1 Reglas de las pruebas automatizadas
Deterministas, independientes entre sí, sin esperas fijas (`sleep`), sin depender del orden, con datos propios, limpiando lo que crean. Una prueba que falla de forma intermitente se corrige o se retira con un defecto abierto; no se ignora.

## 8. Severidad de defectos

| Severidad | Definición | Ejemplo |
|---|---|---|
| **Crítica** | Pérdida o filtración de datos, brecha de seguridad, aplicación inutilizable | Un usuario ve datos de otro |
| **Alta** | Función principal rota sin alternativa, cálculo monetario incorrecto, permiso mal aplicado | Reparto de Cosecha no suma el total |
| **Media** | Función secundaria rota o con rodeo; problema de accesibilidad AA; error mal manejado | Error sin mensaje claro |
| **Baja** | Cosmético, texto, mejora | Alineación en móvil |

## 9. Regresión
Cada defecto Crítico o Alto corregido deja una prueba automatizada de regresión (la escribe QA). El conjunto de integración y E2E corre en CI.

## 10. Plantillas
`docs/testing/TEST_PLAN_TEMPLATE.md`, `docs/testing/QA_REPORT_TEMPLATE.md`, `docs/testing/DEFECT_TEMPLATE.md`. Planes en `docs/testing/plans/`, informes en `docs/testing/reports/`.
