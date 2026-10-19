# Estrategia de pruebas — desarrollo y pruebas van por separado

## 1. Regla de oro
**Quien desarrolla no certifica su propio trabajo.** Todo módulo y toda fase se desarrolla con un agente (Dev) y se prueba con **otra sesión de agente distinta** (QA). Nunca el mismo agente hace ambos papeles sobre lo mismo. El agente que corrige código de producto para que compile o pase pruebas (Build) tampoco certifica ese SHA: la certificación la hace QA, en otra sesión. El propietario autoriza la integración a `dev` con el informe de QA a la vista.

## 2. Tipos de agente

| Tipo | Hace | No hace | Zona de escritura |
|---|---|---|---|
| **Dev** | Implementa el **código de la aplicación** (backend y frontend) y los hooks de testabilidad (sembrador `Testing`, etiquetas accesibles, `MODULE.md`). **No necesita compilar ni ejecutar**; declara lo que no compiló | Escribir pruebas o planes; dar por aprobado su trabajo; afirmar que algo compila o pasa sin haberlo comprobado | Su módulo (`src/Modules/<M>/**`, `web/src/modules/<m>/**`) |
| **Build** (con entorno de compilación) | Restaura y compila; **corrige errores de compilación y de pruebas en el código de producto** sin cambiar el diseño ni el comportamiento especificado; genera migraciones; escribe y ejecuta las **pruebas unitarias** (y las de caracterización en la Fase 0); informa con comandos reales | Certificar; cambiar el comportamiento especificado o la arquitectura (eso es un CCR); debilitar pruebas de QA para que pasen | Correcciones mínimas en código de producto (`fix(build): …`), `Pastel.Modules.<M>.Tests`, `*.test.tsx`, `tests/Pastel.IntegrationTests/Foundation/`, `tests/Pastel.ArchitectureTests/`, `docs/testing/reports/<M>-BUILD-<fecha>.md` |
| **QA** | **Escribe el plan de pruebas** desde la ficha de producto; ejecuta pruebas (funcionales, permisos, aislamiento de datos, validación, errores y logs, accesibilidad, responsive, seguridad básica); **automatiza** regresión de integración y E2E; reporta defectos con reproducción; verifica correcciones | **Modificar código de producto**. Si encuentra un defecto, lo reporta; no lo arregla | `tests/Pastel.IntegrationTests/QA/<M>/**`, `tests/e2e/<m>/**`, `docs/testing/plans/**`, `docs/testing/reports/**` |
| **Investigación** | Produce documentos (inventarios) | Tocar código | `docs/migration/**` |
| **Mantenimiento** | Aplica CCR aprobados en zonas protegidas | Funcionalidad de módulos | La zona del CCR |

## 3. Flujo por módulo (o fase)

```
Dev ──► código de la aplicación + hooks de testabilidad ──► rama feat/<m>   (puede no compilar)
        │
Build (sesión con entorno de compilación)
  1. Restaura y compila; corrige errores de compilación y de pruebas en el código de producto
  2. Genera migraciones; escribe y ejecuta las pruebas unitarias (y las de caracterización en la Fase 0)
  3. Informe de build con comandos reales ──► docs/testing/reports/<M>-BUILD-<fecha>.md
        │
QA (otra sesión, distinta de Build)
  0. Plan de pruebas desde la ficha (puede escribirse antes, en paralelo al desarrollo)
  1. Pasada de caja negra siguiendo el plan (sin leer la implementación)
  2. Pasada de caja gris: autorización, validación, errores, logs (lee el código)
  3. Automatiza regresión (integración y E2E) en su zona
  4. Informe QA con defectos ──► docs/testing/reports/<M>-QA-<fecha>.md
        │
Build corrige los defectos de código ──► QA reverifica el SHA final
        │
Propietario: lee informe QA + valida visualmente ──► autoriza integración a dev
```

**Puerta de integración:** el informe QA del **SHA final** dice APROBADO con: 0 defectos Críticos o Altos abiertos; Medios aceptados por escrito por el propietario; todos los casos "Obligatorios" del plan ejecutados; y el informe de Build del mismo SHA muestra compilación y pruebas unitarias en verde.

## 4. Qué entrega cada rol para que el siguiente pueda trabajar
1. **Dev:** código completo y coherente; `MODULE.md` actualizado (rutas, permisos, códigos de error); `PROGRESS.md` con lo implementado, lo pendiente y **qué no se compiló ni se ejecutó**.
2. **Dev — datos y cuentas de prueba:** un sembrador `Testing` (solo cuando `ASPNETCORE_ENVIRONMENT` es `Development` o `Testing`; **debe negarse a ejecutarse en `Production`**; Build escribe la prueba que lo verifica) que crea un usuario por rol con inicio de sesión local, más datos de ejemplo. Las pruebas automatizadas usan el inicio de sesión local, no Google. Los nombres y claves **de prueba** quedan en `PROGRESS.md`.
3. **Dev — hooks de testabilidad:** roles y etiquetas accesibles estables (preferir `getByRole`/`getByLabelText`; `data-testid` solo cuando no haya alternativa).
4. **Build:** informe de build con comandos exactos y resultados reales; pruebas unitarias; migraciones generadas.
5. **QA:** **plan de pruebas** `docs/testing/plans/<MODULO>-TEST-PLAN.md` (plantilla en `docs/testing/TEST_PLAN_TEMPLATE.md`), escrito a partir de la **ficha de producto**, no de la implementación: matriz de trazabilidad (criterio de aceptación → casos), roles, casos negativos y de abuso, errores y logs, accesibilidad, datos de prueba y **cómo ejecutar** (comandos exactos, variables, cuentas de prueba por rol tomadas de `PROGRESS.md`).

## 5. Independencia de QA
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
