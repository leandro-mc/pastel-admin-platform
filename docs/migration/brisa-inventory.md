# Brisa — inventario funcional y técnico (aplicación Android actual)

Fuente funcional de la migración descrita en `docs/modules/BRISA.md`. Elaborado por un agente de investigación; **no se modificó el código original ni se escribió código de migración**.

> **Prototipo visual interactivo:** [brisa-prototipo-carrusel.html](./brisa-prototipo-carrusel.html). Es una referencia navegable con datos de demostración; no está conectada al backend.

| Dato | Valor |
|---|---|
| Repositorio analizado | `leandro-mc/brisa-android` (rama `main`, 3 commits, 2026-10-15). **Confirmado por el propietario** como el proyecto «Brisa», sin otra versión en otra rama o repositorio (Q1). El nombre del repositorio difiere, pero `rootProject.name = "Brisa"` y `applicationId = com.brisa.todo`. |
| Commit analizado | `c090107` («fix: polish dark theme surfaces and contrast») |
| Alcance leído | Todo el código fuente (≈1 900 líneas: 15 archivos Kotlin, manifiesto, recursos, Gradle, README y la única clase de pruebas). La app no se compiló ni se ejecutó: todo lo descrito sale de leer el código. |
| Convención de citas | `ruta › símbolo`. Las rutas son relativas a `app/src/main/java/com/brisa/todo/` salvo que empiecen por `app/` u otra raíz. «L123» = línea en el commit analizado. **Suposición** = no confirmado en el código. |
| Revisión | **Revisión 4 (2026-10-18):** segunda ronda de decisiones del propietario incorporada (colores AA, validación de fechas, precedencia de las reglas de diseño del frontend por módulo). Los cambios y decisiones están en **§13**, que prevalece donde difiera de los apartados 1–11 (descripción de la app actual). |
| Fecha de referencia en los casos | «hoy» = **domingo 2026-10-18** (zona `America/Costa_Rica`, UTC-6, sin horario de verano). |

Hallazgo que condiciona la migración: **Brisa trabaja solo con fechas (día), nunca con hora del día; no tiene repetición de tareas, recordatorios ni notificaciones.** Los apartados 5, 6 y 11 lo detallan. Las decisiones posteriores del propietario (§13) prevalecen sobre este inventario donde difieran de la app actual.

---

## 1. Resumen

**Qué hace.** Organiza pendientes por día. Cada tarea tiene un día asignado, título, notas, prioridad (Baja/Media/Alta), color pastel y, opcionalmente, una fecha límite. Ofrece cuatro vistas (Semana, Mes, Vencidas, Fechas límite), un editor modal y una regla automática: una tarea pendiente con fecha límite vigente cuyo día asignado ya pasó se reprograma sola para hoy.

**Para quién.** Una sola persona en un solo dispositivo; el README la define como «app personal pequeña». No hay cuentas, compartir, grupos ni roles (`README.md`, «Arquitectura»; el manifiesto no declara permiso de red).

**Tecnologías** (`app/build.gradle.kts`, `gradle/libs.versions.toml`):
- Kotlin 2.4.20, Jetpack Compose (BOM 2025.12.00), Material 3, `ViewModel` + `StateFlow`, corrutinas 1.10.2.
- Persistencia: `SharedPreferences` con una cadena JSON (`org.json`). **No hay SQLite, Room, red ni dependencias de terceros.**
- Una sola `Activity` (`MainActivity`), sin biblioteca de navegación. Toda la interfaz está escrita en Kotlin con textos fijos en español (no existe `strings.xml`).
- Identificadores: `applicationId = com.brisa.todo`, `versionCode 1`, `versionName 1.0.0`.

**Versión mínima de Android:** `minSdk = 26` (Android 8.0); `targetSdk = compileSdk = 36`; Java 17.

**Calidad existente:** 5 pruebas unitarias de lógica pura (`app/src/test/.../TaskQueriesTest.kt`); ninguna del repositorio, del receptor ni de la interfaz.

**Discrepancias entre README y código** (el código manda):
- README: «AGP 8.13.2 / Gradle 8.13». Código: AGP `9.3.3` (`libs.versions.toml`) y Gradle `9.5.0` (`gradle-wrapper.properties`).
- El wrapper de Gradle es **no estándar** (`gradle/wrapper/GradleWrapperMain.java` propio, JAR de 4,8 KB). Irrelevante para la web; se anota como higiene.
- El resto del README (ventana de 7 días, reprogramación, receptor, persistencia) coincide con el código.

---

## 2. Pantallas y navegación

**Estructura.** `MainActivity` monta `BrisaTheme` + `BrisaApp` (`ui/BrisaApp.kt`). `BrisaApp` es un `Scaffold` con barra inferior de 4 pestañas (`enum AppTab`: `WEEK`, `MONTH`, `OVERDUE`, `DEADLINES`), cabecera de marca, botón flotante y el editor como diálogo. Todo el estado de navegación vive en `remember` (no `rememberSaveable`): **se pierde al recrearse la actividad** (p. ej. rotación; el manifiesto no declara `configChanges`).

**Elementos globales** (visibles en las 4 pestañas):
- `BrandHeader`: icono `Spa`, «Brisa», «Tus días, con calma.», chip «N pendientes» (**todas** las tareas no hechas, sin importar el día) y botón claro/oscuro.
- `ExtendedFloatingActionButton` «Nueva tarea» → abre el editor con día asignado = `focusedDate` (el día enfocado en Semana/Mes), aunque la pestaña visible sea Vencidas o Fechas límite.
- Barra inferior: Semana, Mes, Vencidas, Fechas límite.

### 2.1 Semana (`WeekScreen`, `DayColumn`, `MiniTaskCard`)
- **Muestra:** título «Tu semana», rango «d MMM – d MMM», resumen «N por hacer · M hechas» (solo tareas de la ventana visible) y **7 columnas** de 145 dp: de `focusedDate − 2` a `focusedDate + 4`; el día enfocado queda en la tercera columna (`WEEK_CENTER_INDEX = 2`).
- **Cada columna:** abreviatura del día (LUN…), número del día, «HOY» si es hoy (si no, «N tarea(s)», que cuenta abiertas + hechas), botón «+» y la lista del día: abiertas primero (prioridad alta→baja), luego un separador «HECHAS» con las completadas. Sin tareas: «Sin tareas». Borde verde = enfocado; borde dorado = hoy.
- **Tarjeta (`MiniTaskCard`):** punto y etiqueta de prioridad, título (3 líneas máx., tachado si está hecha), «Límite d MMM» si tiene fecha límite, check si está hecha. Color de fondo = color pastel de la tarea.
- **Acciones:** flechas «Un día atrás / adelante» (mueven `focusedDate` ±1), «Ir a hoy», tocar el encabezado de una columna (la enfoca), «+» de una columna (abre el editor en ese día **y** lo enfoca), tocar una tarjeta (abre el editor).
- El texto «Desliza para explorar cada día» solo desplaza dentro de las 7 columnas; avanzar la ventana exige las flechas.

### 2.2 Mes (`MonthScreen`, `CalendarDayCell`)
- «Tu calendario», nombre del mes («Octubre 2026») y chip «N tarea(s)» del mes (**incluye hechas**). Cuadrícula de 7 columnas con semana que **empieza el lunes** (cabeceras `L M X J V S D`); celdas vacías antes y después del mes; número de tareas por día (insignia rellena si >9, «99+» si >99; «HOY» si es hoy y no tiene tareas).
- **Acciones:** flechas de mes (cambian solo el mes visible, no el día enfocado); tocar un día → lo enfoca y **cambia a la pestaña Semana**.

### 2.3 Vencidas (`TaskCollectionScreen` con `CollectionKind.OVERDUE`)
- «Pendientes atrasados» + subtítulo + contador («Todo al día» / «1 tarea» / «N tareas»). Lista de `tasks.overdueOn(today)`. Vacía: «Vas al día».
- Tarjeta (`CollectionTaskCard`): rótulo «PROGRAMADA PARA», **día asignado** completo («Sábado 17 de octubre»), título (2 líneas), notas (2 líneas), prioridad y, si existe, «· Límite d MMM». Tocar abre el editor. No hay acciones rápidas.

### 2.4 Fechas límite (`TaskCollectionScreen` con `CollectionKind.DEADLINE`)
- Lista de `tasks.withDeadlines(today)`. Tarjeta con rótulo «FECHA LÍMITE» (o «VENCIDA» en rojo si está pendiente y su fecha límite ya pasó), la **fecha límite** completa, título, notas, prioridad, insignia «Hecha» o «Vencida». Vacía: «Sin fechas límite».

### 2.5 Editor de tarea (`ui/components/TaskEditorDialog.kt › TaskEditorDialog`)
Diálogo casi a pantalla completa, con desplazamiento y `imePadding`. Se usa para crear («Una nueva tarea») y editar («Tu tarea»).
- **Campos:** título (una línea, obligatorio), notas (2–4 líneas, opcional), día asignado (selector de calendario), prioridad (3 chips), color (10 muestras + nombre), casilla «Añadir fecha límite» + fila para elegir/cambiar la fecha.
- **Casilla de fecha límite:** al marcarla abre de inmediato el selector (si se cancela, queda sin fecha); al desmarcarla borra la fecha.
- **Botones:** «Marcar como hecha» / «Marcar como pendiente» (solo al editar; **guarda también los demás cambios** y cierra), «Guardar» (deshabilitado si el título está en blanco), «Cancelar», icono de papelera (solo al editar) → confirmación «¿Eliminar esta tarea?» con «Conservar» / «Eliminar».
- Valores iniciales al crear: día = `focusedDate`, prioridad Media, color **aleatorio** de la paleta, sin fecha límite.
- Cerrar por fuera, por el icono de la esquina o con «Cancelar» **descarta** sin confirmar.

### 2.6 Tema
Interruptor claro/oscuro en la cabecera. El estado es una variable `remember` en `MainActivity`: **no se guarda** ni sigue el tema del sistema; vuelve a claro al reiniciar o rotar.

### 2.7 Flujo
```
Abrir app ─► Semana (hoy enfocado) ──┬─ «+» de una columna / FAB ─► Editor ─► Guardar ─► vuelve a la vista
   │ (ON_RESUME: recalcula «hoy» y reprograma)   ├─ tocar tarjeta ─────────► Editor ─► Hecha / Guardar / Eliminar
   │                                              └─ tocar día de Mes ◄──── Mes (cambia a Semana)
   ├─ Mes ──► tocar día ─► Semana enfocada en ese día
   ├─ Vencidas ──► tocar tarjeta ─► Editor (mover de día = editar «día asignado»)
   └─ Fechas límite ──► tocar tarjeta ─► Editor
```

---

## 3. Funcionalidades

«Conservar» es **propuesta del investigador**; el propietario respondió en §12 y las capacidades nuevas aprobadas (un toque para marcar, búsqueda, deshacer, `CompletedAt`) están en §13.6.

| Funcionalidad | Descripción | Dónde está en el código | Conservar |
|---|---|---|---|
| Crear tarea | Solo el título es obligatorio; el resto tiene valores por defecto | `TaskEditorDialog › buildTask`; `BrisaApp › openNewTask` | **Esencial** |
| Alta en un día concreto («+» por columna) | Crea la tarea ya asignada a esa fecha | `BrisaApp › DayColumn` (`onCreateTask`) | **Esencial** |
| Editar tarea | Todos los campos | `TaskEditorDialog` | **Esencial** |
| Marcar hecha / reabrir | Alterna `completed`; guarda también los cambios pendientes del editor | `TaskEditorDialog` (botón fijo) | **Esencial** |
| Eliminar con confirmación | Borrado definitivo (sin papelera ni deshacer) | `TaskEditorDialog › AlertDialog`; `LocalTaskRepository.delete` | **Esencial** (en la web: borrado lógico, §7) |
| Prioridad Baja/Media/Alta | Ordena el día; se muestra como punto + texto | `domain/TaskItem.kt › TaskPriority`; `TaskQueries.kt` | **Esencial** |
| Notas | Texto libre sin límite | `TaskItem.details` | **Esencial** |
| Lista del día ordenada | Abiertas por prioridad↓ y antigüedad↑; hechas aparte | `TaskQueries.kt › pendingForDay / completedForDay` | **Esencial** |
| Vista Semana (7 días, −2…+4) | Columnas por día, foco central, «Ir a hoy», flechas ±1 día | `BrisaApp › WeekScreen / DayColumn` | **Esencial** |
| Vencidas | Pendientes atrasadas (regla en §5.3) | `TaskQueries.kt › overdueOn`; pestaña `OVERDUE` | **Esencial** |
| Fechas límite | Lista ordenada por vencimiento | `TaskQueries.kt › withDeadlines`; pestaña `DEADLINES` | **Esencial** |
| Fecha límite opcional | Casilla + selector de calendario | `TaskEditorDialog` | **Esencial** |
| Reprogramación automática a hoy | Pendiente con fecha límite vigente y día asignado pasado → día asignado = hoy | `TaskQueries.kt › rollForwardDeadlineTasks`; `LocalTaskRepository.reconcileDailyTasks` | **Esencial** (regla); el mecanismo en la web es derivado, sin escrituras (§13.1) |
| Vista Mes con contadores | Cuadrícula lunes–domingo; tocar día → Semana | `BrisaApp › MonthScreen / CalendarDayCell` | **Importante** |
| Color pastel (10) y color aleatorio al crear | Paleta fija; se puede cambiar | `domain/TaskItem.kt › TaskPalette`; editor | **Importante** |
| Indicador «HOY» y día enfocado | Resalta hoy y el día seleccionado | `DayColumn`, `CalendarDayCell` | **Importante** |
| Contadores | «N pendientes» (cabecera), «N por hacer · M hechas» (semana), «N tareas» (día/mes) | `BrandHeader`, `WeekScreen`, `MonthScreen` | **Importante** |
| Sección «HECHAS» separada | Completadas visibles pero apartadas | `DayColumn` | **Importante** |
| Estados vacíos amistosos | «Sin tareas», «Vas al día», «Sin fechas límite» | `DayColumn`, `EmptyState` | **Importante** |
| Modo claro/oscuro | Dos esquemas de color | `ui/theme/BrisaTheme.kt`; `MainActivity` | **Importante** (en Pastel lo da el sistema de diseño; no se guarda hoy) |
| Persistencia sin cuenta ni conexión | Todo local en el dispositivo | `data/TaskRepository.kt` | **Esencial** como requisito (datos durables); sustituida por backend |
| Receptor de cambio de fecha/hora/zona/arranque | Reconcilia en segundo plano | `data/DailyTaskRolloverReceiver.kt`; manifiesto | **Prescindible** como mecanismo Android; la regla de §5.5 sigue siendo esencial |
| Lectura tolerante de datos | Descarta registros inválidos y completa campos faltantes | `LocalTaskRepository.readTasks` | **Prescindible** (la importación debe validar y rechazar, §9) |
| Insignia «99+» | Tope visual en el contador del mes | `CalendarDayCell` | **Prescindible** |

---

## 4. Modelo de datos

**Una sola entidad: `TaskItem`** (`domain/TaskItem.kt`). No hay usuarios, listas, etiquetas, subtareas, adjuntos ni relaciones entre entidades.

| Campo | Tipo Kotlin | Clave JSON (tipo) | Regla / valor por defecto |
|---|---|---|---|
| `id` | `String` | `id` (string) | `UUID.randomUUID()` (v4) generado en el cliente al crear (`TaskEditorDialog › buildTask`). Sin restricción de unicidad en BD: `save` reemplaza por `id`. Vacío → registro descartado al leer. |
| `title` | `String` | `title` (string) | Se recorta (`trim`). Obligatorio: el botón Guardar se deshabilita si está en blanco; al leer, un título vacío descarta el registro. **Sin longitud máxima.** |
| `details` | `String` | `details` (string) | `""` por defecto; se recorta al guardar. Sin longitud máxima. En la interfaz se llama «Notas». |
| `scheduledDate` | `LocalDate` | `scheduledDate` (string ISO `yyyy-MM-dd`) | **Obligatoria.** Día asignado, **sin hora ni zona**. Ausente o ilegible → registro descartado. |
| `priority` | `TaskPriority` | `priority` (string `LOW`/`MEDIUM`/`HIGH`) | Por defecto `MEDIUM`; cualquier valor desconocido se lee como `MEDIUM`. Rango interno: LOW=0, MEDIUM=1, HIGH=2 (`rank`). |
| `colorHex` | `String` | `colorHex` (string `#RRGGBB`) | Aleatorio de la paleta al crear. Si falta al leer: `#DDE8D5`. **No se valida** contra la paleta ni el formato (ver riesgo R5). |
| `dueDate` | `LocalDate?` | `dueDate` (string ISO, o `""` si no hay) | Opcional. **Se guarda como cadena vacía cuando es nula.** Valor ilegible → `null` en silencio. No se valida que sea ≥ `scheduledDate`. |
| `completed` | `Boolean` | `completed` (boolean) | `false` por defecto. |
| `createdAt` | `Long` | `createdAt` (número, milisegundos Unix UTC) | `System.currentTimeMillis()` al crear; se conserva al editar. Solo sirve de desempate de orden. Si falta al leer: se usa «ahora». |

**No existen** (confirmado por búsqueda en el código): hora del día, duración, recurrencia, recordatorios, categoría/lista, orden manual, `updatedAt`, `completedAt`, `deletedAt`, identificador de usuario, versión de esquema.

**Paleta** (`TaskPalette.colors`, nombre → hex): Salvia `#DDE8D5`, Cielo `#DCEAF4`, Mantequilla `#F5E9B9`, Durazno `#F6DDCE`, Menta `#D4E9E1`, Arena `#E9E2D2`, Agua `#D1E7E5`, Coral suave `#F3D5C8`, Pistacho `#E5EDC8`, Azul bruma `#D7E4F0`. Ninguno cae en el tono prohibido por Pastel (235°–345°): matiz entre 18° y 209°. `byHex` devuelve Salvia si el hex no está en la paleta (solo afecta al nombre mostrado). En modo oscuro la tarjeta mezcla el color con la superficie al 36 % (`BrisaColors.TaskCard`).

**Almacenamiento.** `LocalTaskRepository` (`data/TaskRepository.kt`):
- Archivo de preferencias `brisa_local_store`, clave `tasks_json`, valor = **un arreglo JSON con todas las tareas**. En Android estándar es `shared_prefs/brisa_local_store.xml` dentro del almacenamiento privado de la app (**Suposición**: ruta típica; no verificada en dispositivo).
- Cada `save`/`delete`/`reconcile` **reescribe el arreglo completo** (`writeTasks`, `apply()` asíncrono). La lista en memoria es un `MutableStateFlow`; `save` quita la tarea con ese `id` y la agrega al final (el orden de la lista no se usa: todas las vistas ordenan).
- **Migraciones locales: no existen.** No hay número de versión; la compatibilidad se logra solo con valores por defecto al leer (`readTasks`).
- Sin ajustes persistentes (ni siquiera el tema).

**Comportamientos de pérdida de datos observados:**
1. Si el JSON completo no se puede analizar, `readTasks` devuelve lista vacía (`getOrElse { emptyList() }`) y **la siguiente escritura sobrescribe todo** con solo la tarea nueva.
2. Registros sin `id`, con título en blanco o `scheduledDate` inválida se descartan al leer y **desaparecen en la siguiente escritura**.
3. Eliminar es definitivo; no hay papelera.

Ejemplo sintético de un registro persistido (fecha límite nula):
```json
{"id":"0b6f2c1e-3d4a-4f7e-9a10-5c2d8e7a1b01","title":"Llamar al banco","details":"","scheduledDate":"2026-10-18","priority":"HIGH","colorHex":"#F6DDCE","dueDate":"","completed":false,"createdAt":1760770000000}
```

---

## 5. Reglas de negocio

Definiciones: **«hoy»** = `LocalDate.now()` con la zona horaria **del dispositivo** (`BrisaApp`, receptor y `withDeadlines`). **Abierta** = `completed = false`. Evidencia principal: `domain/TaskQueries.kt` (cubierta por `TaskQueriesTest`).

### 5.1 Fechas y zonas horarias
- `scheduledDate` y `dueDate` son **fechas calendario sin zona** (ISO). No existe «hora de la tarea»: la frontera del día es solo el cambio de «hoy» según la zona del dispositivo.
- «Hoy» se recalcula únicamente en `ON_RESUME` y al iniciar (`BrisaApp › DisposableEffect`). **Si la app permanece abierta pasada la medianoche, «hoy» no cambia hasta volver a primer plano** (no hay temporizador).
- Si el día enfocado era «hoy» y «hoy» cambia, el foco pasa al nuevo «hoy» (`refreshDateAndTasks`).
- Los selectores de fecha convierten con UTC en ambos sentidos (`toUtcMillis`, `ZoneOffset.UTC`) para evitar corrimientos de un día: la fecha elegida es la mostrada.
- `createdAt` es un instante UTC; no interviene en reglas de día.
- Costa Rica (UTC-6, sin horario de verano): no hay saltos de 23/25 horas; las reglas por fecha no se ven afectadas.
- Cambiar la zona del dispositivo cambia «hoy» y dispara la reconciliación (§6).

### 5.2 Estados
Solo dos: abierta / hecha (`completed`). «Marcar como hecha» no modifica ninguna fecha ni guarda `completedAt`. Reabrir no modifica fechas: la regla 5.5 actúa después (ver caso C10/C11).

### 5.3 Listas y filtros (todas calculadas al vuelo, sin persistir)

| Vista | Filtro | Orden |
|---|---|---|
| Día (abiertas) `pendingForDay(d)` | `scheduledDate == d` y abierta | prioridad ↓, luego `createdAt` ↑ |
| Día (hechas) `completedForDay(d)` | `scheduledDate == d` y hecha | prioridad ↓, luego `createdAt` ↓ |
| Vencidas `overdueOn(hoy)` | abierta **y** (`dueDate != null` ? `dueDate < hoy` : `scheduledDate < hoy`) | `(dueDate ?: scheduledDate)` ↑, luego prioridad ↓ (sin más desempate) |
| Fechas límite `withDeadlines(hoy)` | `dueDate != null` y **no** (hecha y `dueDate < hoy`) | abiertas antes que hechas; `dueDate` ↑; prioridad ↓ |
| Ventana de Semana | `scheduledDate ∈ [foco−2, foco+4]` | (por columna, como «Día») |
| Mes | agrupa por `scheduledDate`; el total del mes cuenta abiertas + hechas | — |

Consecuencias: una tarea con `dueDate` vencida está en Vencidas **aunque su día asignado sea futuro**; una tarea con `dueDate` vigente nunca está en Vencidas aunque su día asignado haya pasado (antes de reprogramarse). Una tarea abierta con fecha límite vencida aparece a la vez en Vencidas y en Fechas límite (rotulada «VENCIDA»).

### 5.4 Prioridad
Baja/Media/Alta; solo afecta el orden y el color del punto (Baja `#7D9A6D`, Media `#B79A40`, Alta `#C8755A`). Desempate: `createdAt`.

### 5.5 Reprogramación automática (`rollForwardDeadlineTasks(hoy)`)
Una tarea se mueve (`scheduledDate = hoy`) si y solo si: **abierta**, **`dueDate != null`**, **`dueDate >= hoy`** y **`scheduledDate < hoy`**. No toca tareas hechas, sin fecha límite ni con fecha límite vencida. Es **idempotente**; el día asignado original **se pierde** (no hay historial).
Cuándo se ejecuta: (a) al iniciar y en cada `ON_RESUME` (`reconcileDailyTasks`); (b) en segundo plano por el receptor (§6). **No** se ejecuta al guardar o editar: una tarea editada o reabierta puede quedar un rato con día pasado hasta el siguiente `ON_RESUME`.

### 5.6 Repetición de tareas
**No existe.** La única «repetición» es la reprogramación de 5.5. No hay reglas de calendario recurrente que migrar.

### 5.7 Recordatorios
**No existen** (README: «la fecha límite organiza y filtra tareas, pero no envía notificaciones»).

### 5.8 Casos límite confirmados en el código
- `dueDate < scheduledDate` se permite sin aviso (queda en Vencidas si ya pasó).
- Un día asignado pasado con `dueDate` vigente es **revertido a hoy** en el siguiente `ON_RESUME`: la persona no puede «dejar» esa tarea en un día pasado.
- Tarea hecha con `dueDate` vencida: sale de Fechas límite y de Vencidas, pero sigue en su día («HECHAS») y en los contadores del mes.
- Título de solo espacios: no se puede guardar.
- Mes: `YearMonth` resuelve febrero/bisiestos; la cuadrícula añade celdas hasta completar semanas completas.
- Contadores sin singular: «1 pendientes», «1 hechas» (`BrandHeader`, `WeekScreen`); «tarea/tareas» sí pluraliza.
- Dos tareas con igual prioridad y `createdAt`: el orden depende del orden de la lista interna (estable, no garantizado entre dispositivos).

---

## 6. Notificaciones y segundo plano

**No hay notificaciones.** No se declara `POST_NOTIFICATIONS`, no hay canales, `AlarmManager`, `WorkManager` ni servicios (`AndroidManifest.xml`, `app/build.gradle.kts`).

Lo único que corre en segundo plano es `DailyTaskRolloverReceiver` (`data/DailyTaskRolloverReceiver.kt`), declarado en el manifiesto (`exported="true"`) para: `DATE_CHANGED`, `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED`, `MY_PACKAGE_REPLACED`.
- **Qué hace:** crea **su propia instancia** de `LocalTaskRepository` y llama `reconcileDailyTasks(LocalDate.now())` (regla 5.5), escribiendo en las mismas preferencias.
- **Cuándo:** a medianoche del dispositivo (`DATE_CHANGED`), al cambiar hora o zona, al arrancar el teléfono y tras actualizar la app.
- **Permisos:** solo `RECEIVE_BOOT_COMPLETED` (permiso normal, sin diálogo al usuario).
- **Limitación observada:** la instancia del receptor y la del `ViewModel` no comparten memoria; si la app está viva, su lista en memoria no se entera del cambio hasta el siguiente `reconcileDailyTasks` en `ON_RESUME`. Como la regla es idempotente, el efecto práctico es leve. **Suposición:** que Android entregue estos difusores con la app cerrada depende de la versión y de restricciones del fabricante (no verificado en dispositivo).

**Para la web:** no hay nada que programar para el usuario. Lo necesario es que la regla 5.5 se aplique de forma equivalente al cambiar el día en la zona de la persona (§7.3, decisión D-1).

---

## 7. Sin conexión y sincronización

### 7.1 Cómo se guardan los datos hoy
Una sola copia local por dispositivo, sin red ni cuenta, y lista completa reescrita en cada cambio (§4). La app funciona sin conexión por construcción. `android:allowBackup="true"` sin reglas propias: **Suposición**, el respaldo automático de Android podría incluir el archivo; no hay exportación propia (§9).

### 7.2 Qué pasaría con varios dispositivos
Nada se comparte: cada instalación es una isla; reinstalar o cambiar de teléfono pierde los datos salvo respaldo del sistema. No hay detección de conflictos ni identidad de persona. Dos instalaciones generarían UUID v4 distintos, sin choques de `id`, pero también sin forma de reconciliarse.

### 7.3 Modelo de sincronización propuesto (solo diseño, no implementar)
Alineado con `docs/modules/BRISA.md` §3.2.

**Identificadores.** Reutilizar el `id` existente como `Guid` (los UUID v4 de la app son `Guid` válidos; **se conservan en la importación**). Tareas nuevas: `Guid` v7 generado por el cliente. Creación idempotente: mismo `Id` + mismo dueño → no duplica (devuelve el recurso existente); mismo `Id` de otro dueño → 404.

**Campos de control por tarea (nuevos):** `OwnerId` (del token, nunca del cliente), `CreatedAt` (de `createdAt`), `UpdatedAt` (**reloj del servidor**, monótono por fila), `DeletedAt` (borrado lógico), `RowVersion` (token de concurrencia), `CompletedAt` (nuevo, nulo en datos importados; opcional, requiere aprobación).

**Marca de cambio y lectura incremental.** `GET …?updatedSince=<cursor>` con cursor compuesto `(UpdatedAt, Id)` para evitar empates; devuelve altas, cambios **y lápidas** (`DeletedAt != null`). Las lápidas se purgan tras un periodo a definir (propuesta: 90 días; el cliente que lleve más tiempo sin sincronizar debe hacer una carga completa).

**Escritura.** Por entidad con `If-Match`/`RowVersion`: si no coincide → 409 con la versión actual. Más adelante, un endpoint por lotes `POST …/sync` que devuelve aceptados, conflictos y nuevo cursor.

**Conflictos.** Propuesta v1: **último cambio gana por entidad** (según orden de llegada al servidor; el cliente nunca decide con su reloj). Mejora posible por campo: `completed` y fechas de forma independiente de `title/details/color/priority`. Un ADR debe fijarlo.

**Fechas y zona.** `ScheduledDate`/`DueDate` como `date` (sin hora). «Hoy» se calcula con una **zona de la persona** (valor inicial `America/Costa_Rica`), nunca con la del servidor (que suele ser UTC).

**Decisión D-1: reprogramación persistida vs. derivada.** La app *persiste* el cambio de `scheduledDate`. Con varios dispositivos eso crea un conflicto de sistema contra persona (un dispositivo reprograma sin conexión mientras otro edita). Alternativas:
- **A. Derivada (decidida por el propietario, Q3 → §13.1):** no persistir; la «fecha efectiva» se calcula al leer (fórmula en §13.1). Equivale a la app en el uso normal, sin escrituras ni conflictos, y conserva el día asignado original. Debe cumplir los criterios AC1–AC7 y los vectores de §13.1; difiere de la app solo en los casos de §13.10.
- **B. Persistida (descartada; paridad estricta):** un proceso idempotente en el servidor, al cambiar el día en la zona de la persona o en la primera lectura del día, actualiza `scheduledDate` y `UpdatedAt`; el cambio de sistema solo se aplica si la fila no cambió desde la versión leída (compare-and-set).
**Resuelta: opción A.** Debe pasar los casos C06–C12 con los resultados de §13.10.

**Reloj del cliente.** Un `createdAt` del dispositivo se acepta como dato de orden, pero no decide `UpdatedAt` ni conflictos.

---

## 8. Servicios externos y permisos Android

**Servicios externos: ninguno.** Sin red, sin cuentas, sin analítica, sin Firebase ni SDK de terceros (`app/build.gradle.kts`: solo AndroidX, Compose, Material 3, corrutinas, JUnit). Sin claves ni secretos en el repositorio.

| Elemento | Valor | Evidencia |
|---|---|---|
| Permisos | Solo `android.permission.RECEIVE_BOOT_COMPLETED`. **Sin** `INTERNET`, notificaciones, alarmas exactas, almacenamiento ni ubicación. | `AndroidManifest.xml` |
| Componentes | `MainActivity` (lanzador, `adjustResize`), `DailyTaskRolloverReceiver` (`exported="true"`). Sin servicios ni proveedores de contenido. | `AndroidManifest.xml` |
| Copia de seguridad | `allowBackup="true"` sin reglas personalizadas (**Suposición**: aplica el respaldo automático por defecto del sistema). | `AndroidManifest.xml` |
| Compilación | Release sin minificación (`isMinifyEnabled = false`); sin configuración de firma en el repositorio. | `app/build.gradle.kts` |
| Interfaz de sistema | Barras de estado y navegación coloreadas con API obsoletas (`statusBarColor`, `systemUiVisibility`). | `MainActivity` |

Implicación para Pastel: el módulo web **introduce** por primera vez identidad (Identity), red y permisos (`brisa.access`, `brisa.items.manage`); nada de eso existe en la app.

---

## 9. Importación de datos

### 9.1 Qué hay disponible hoy
**La app no tiene exportar, importar, compartir ni respaldo propio** (búsqueda de `export/import/share` sin resultados). Lo más cercano a un «formato» es lo que ya se guarda:

- **Fuente física:** archivo de preferencias `brisa_local_store` con una cadena `tasks_json` (§4). Forma habitual del XML (**Suposición**: formato estándar de Android, no verificado):
  ```xml
  <map><string name="tasks_json">[{&quot;id&quot;:&quot;…&quot;,&quot;title&quot;:&quot;…&quot;, …}]</string></map>
  ```
  El JSON va escapado dentro del XML; hay que desescapar antes de analizarlo.
- **Cómo sacarlo (opciones, ninguna implementada):** (a) añadir a la app una acción «Exportar respaldo» que escriba el arreglo —cambio mínimo, requiere autorización del propietario porque toca el código original—; (b) acceso al archivo con una compilación de depuración (**Suposición**: una instalación normal no es depurable); (c) respaldo automático del sistema (**Suposición**, no accesible para Pastel). Se recomendaba (a). **Resuelto (Q2): no hay datos reales que exportar; no se modifica la app Android (§13.9).**

### 9.2 Formato de importación propuesto
El importador debe aceptar **dos entradas equivalentes**: el arreglo JSON crudo de `tasks_json`, o este sobre (nombres propuestos):
```json
{"format":"brisa-export","version":1,"exportedAt":"2026-10-18T21:00:00Z","timeZone":"America/Costa_Rica","tasks":[ /* registros con las 9 claves de §4 */ ]}
```

### 9.3 Mapeo al esquema nuevo (nombres lógicos; el diseño final es de Dev)

| Origen (`TaskItem`) | Destino (`brisa`, tarea) | Transformación y validación |
|---|---|---|
| `id` | `Id` (`uuid`) | Debe ser UUID válido; se **conserva** (hace idempotente la reimportación). Duplicado dentro del archivo → error. |
| — | `OwnerId` | Persona que importa (del token). |
| `title` | `Title` | `trim`; no vacío. Máximo 150 caracteres (§13.4). |
| `details` | `Notes` | Texto; `null`/ausente → `""`. Máximo 2000 caracteres (§13.4). |
| `scheduledDate` | `ScheduledDate` (`date`) | ISO `yyyy-MM-dd` estricta. Sin conversión de zona. |
| `priority` | `Priority` (smallint) | `LOW→0`, `MEDIUM→1`, `HIGH→2`. Ausente → `MEDIUM`; valor distinto de los tres → `MEDIUM` **con advertencia en el informe, sin abortar el lote** (como la app; Q9, §13.9). |
| `colorHex` | `ColorHex` (`#RRGGBB`) | Formato obligatorio. Fuera de la paleta de 10: se acepta como dato (§13.9). Ausente → `#DDE8D5`. |
| `dueDate` | `DueDate` (`date` nula; si existe, ≥ `ScheduledDate`) | `""` o ausente → `NULL`; si no, ISO estricta. |
| `completed` | `IsCompleted` | Booleano. Ausente → `false`. |
| `createdAt` (ms UTC) | `CreatedAt` (`timestamptz`) | `epoch ms → UTC`. Ausente → instante de importación (con aviso). |
| — | `CompletedAt` | `NULL` (no se conoce; no inventarlo). Campo aprobado (Q12, §13.5). |
| — | `UpdatedAt` / `RowVersion` | Los asigna el servidor al importar. |
| — | `DeletedAt` | `NULL`. |
| — | `ImportBatchId` | Identifica el lote para revertirlo (§9.4). |

### 9.4 Reglas de la importación (de `BRISA.md` §3.3 y plan de pruebas 6)
1. **Todo o nada:** una transacción; **cualquier** registro inválido aborta el lote y se informa fila, campo y motivo. (Difiere a propósito de la app, que descarta en silencio. Única tolerancia: prioridad desconocida → Media con advertencia, Q9.)
2. **Sin duplicar:** por `OwnerId + Id`. Reimportar el mismo archivo no cambia nada; si el `Id` existe con contenido distinto, **se omite y se informa** como «ya existía con diferencias»; nunca se sobrescribe (Q11, §13.9).
3. **Vista previa (dry-run)** con totales: registros, abiertas, hechas, con fecha límite, rango de fechas.
4. **Respaldo previo** de las tareas actuales de la persona y **reversión** del lote (borrado lógico de lo creado con `ImportBatchId`).
5. **Integridad:** comparar totales origen/destino (cantidad, abiertas/hechas, con/sin fecha límite) y los 9 campos por registro.
6. **No** ejecutar la reprogramación 5.5 durante la importación: los datos entran tal cual; la regla actúa después como en la app.
7. **Invariante:** en cada registro, `dueDate` vacía o ≥ `scheduledDate`; si no, error de ese registro (§13.2).

### 9.5 Archivo de ejemplo (sintético, sin datos personales)
Con «hoy» = 2026-10-18:
```json
[
 {"id":"7d1f3a52-9c40-4e6b-8a17-2b5c0e9d4f01","title":"Llamar al banco","details":"","scheduledDate":"2026-10-18","priority":"HIGH","colorHex":"#F6DDCE","dueDate":"","completed":false,"createdAt":1792278000000},
 {"id":"a3c8e2b9-51d7-4f06-9b3e-6e1a7c2d8f02","title":"Enviar informe mensual","details":"","scheduledDate":"2026-10-15","priority":"MEDIUM","colorHex":"#DCEAF4","dueDate":"2026-10-20","completed":false,"createdAt":1792022400000},
 {"id":"5e9b0c47-2a8d-4d13-a6f5-3c7b1e0a9d03","title":"Ordenar el escritorio","details":"","scheduledDate":"2026-10-16","priority":"LOW","colorHex":"#E5EDC8","dueDate":"","completed":false,"createdAt":1792108800000},
 {"id":"c2406d8e-7b1f-4a95-8e2c-9d5f3a1b6e04","title":"Pagar el recibo de agua","details":"","scheduledDate":"2026-10-14","priority":"HIGH","colorHex":"#F5E9B9","dueDate":"2026-10-16","completed":true,"createdAt":1791936000000},
 {"id":"e81a5f30-6c9d-4b27-b4a8-1f2e7d0c5a05","title":"Revisar presupuesto","details":"Incluye ajustes de septiembre","scheduledDate":"2026-10-14","priority":"MEDIUM","colorHex":"#D4E9E1","dueDate":"2026-10-17","completed":false,"createdAt":1792300000000}
]
```
**Totales esperados tras importar:** 5 registros; 4 abiertas y 1 hecha; 3 con fecha límite (una hecha); 9 campos íntegros por registro.
**Resultado esperado en pantalla (regla de la app):**
- Vencidas: «Ordenar el escritorio» (16 oct, sin límite) y luego «Revisar presupuesto» (límite 17 oct; su día efectivo es el 17). «Enviar informe mensual» **no** (límite vigente).
- Fechas límite: «Revisar presupuesto» (VENCIDA, 17 oct) y «Enviar informe mensual» (20 oct). «Pagar el recibo de agua» no aparece (hecha con límite pasado).
- Día efectivo (§13.1): «Enviar informe mensual» se muestra el 2026-10-18 sin reescribir su `scheduledDate` (2026-10-15).
- Archivo corrupto de prueba: la misma lista con la coma entre dos registros eliminada → error claro y **cero** registros importados.
- Archivo inválido de prueba: la misma lista con `scheduledDate` 2026-10-20 en «Revisar presupuesto» (queda posterior a su `dueDate`) → se rechaza ese registro y el lote (§13.2).

---

## 10. Experiencia de usuario

### 10.1 Patrones que funcionan y deben conservarse
1. **Alta con un solo dato obligatorio.** Solo el título; día = día enfocado, prioridad Media y color aleatorio por defecto (`TaskEditorDialog`). El commit más reciente la llama «week quick add».
2. **«+» en cada columna de día:** crea directamente en esa fecha y evita elegirla (`DayColumn`).
3. **Semana de 7 días con el foco al centro,** «Ir a hoy» y flechas de ±1 día: contexto inmediato (2 días atrás, 4 adelante).
4. **Botón fijo «Marcar como hecha / pendiente»** siempre visible en el editor, sin desplazarse.
5. **Hechas apartadas** en «HECHAS» y abiertas por prioridad: la lista del día muestra primero lo importante.
6. **Reprogramación automática de tareas con fecha límite vigente:** evita que se acumulen como «fallidas» (tono sin culpa); las que ya vencieron quedan visibles en Vencidas.
7. **Vistas dedicadas** (Vencidas, Fechas límite) con estados vacíos amables («Vas al día», «Sin fechas límite»).
8. **Confirmación al eliminar.**
9. **Prioridad con texto además de color** (punto + «ALTA/MEDIA/BAJA»).
10. **Paleta pastel sin morado,** claro/oscuro (cumple la regla de Pastel; matiz 18°–209°, §4).

### 10.2 Problemas evidentes de usabilidad
| # | Problema | Evidencia |
|---|---|---|
| U1 | No se puede marcar hecha desde la lista: hay que abrir el editor y pulsar el botón (2 toques, y el diálogo se cierra). Contradice el patrón «marcar como hecho» que pide `BRISA.md` §3.4. | `MiniTaskCard`/`CollectionTaskCard` solo tienen `onClick` → `openTask` |
| U2 | El botón flotante crea con el día enfocado aunque se esté en Vencidas o Fechas límite; la persona no sabe a qué día irá y quizá no vea la tarea creada. | `BrisaApp › openNewTask(null)` |
| U3 | Tocar fuera, «Cancelar» o la esquina descarta lo escrito sin confirmar; el icono «Cerrar» es un calendario (`Icons.Outlined.Event`). | `TaskEditorDialog` (`onDismissRequest`, icono de L146–148) |
| U4 | El título no recibe foco al abrir y «Enter» no guarda (`ImeAction.Next`, sin `FocusRequester`): el «alta rápida» necesita varios toques. | `TaskEditorDialog` (campo de título) |
| U5 | Estado perdido al rotar/recrear: diálogo y texto escrito, pestaña, día enfocado, tema. | `remember` sin `rememberSaveable`; manifiesto sin `configChanges` |
| U6 | El tema oscuro no se guarda ni sigue el del sistema. | `MainActivity` |
| U7 | El subtítulo de Vencidas dice «Puedes mover cualquier tarea a otro día», pero para una tarea con fecha límite vencida cambiar el día **no la saca** de Vencidas, y no hay acción «mover» en la lista. | `overdueOn`; `BrisaApp` (subtítulo) |
| U8 | Reprogramación silenciosa: la tarea cambia de día sin aviso y se pierde el día original. | `rollForwardDeadlineTasks` |
| U9 | Se permite fecha límite anterior al día asignado y mover a un día pasado una tarea con límite vigente (se revierte sola, §5.8) sin explicación. | `TaskEditorDialog` (sin validación) |
| U10 | Accesibilidad: textos de 8–11 sp; botón «+» de 22 dp (por debajo de 48 dp); descripción «Crear tarea para 2026-10-18» con fecha ISO; iconos de la barra inferior sin descripción propia. | `MiniTaskCard`, `DayColumn`, `BrisaApp` |
| U11 | «N pendientes» de la cabecera cuenta todas las abiertas (vencidas y futuras incluidas) y se lee como «de hoy». Singular incorrecto: «1 pendientes», «1 hechas». | `BrandHeader`, `WeekScreen` |
| U12 | «Desliza para explorar cada día» no avanza más allá de las 7 columnas; hay que usar las flechas. | `WeekScreen` (`LazyRow` con lista fija) |
| U13 | Ausencias: sin búsqueda, sin deshacer (hacer/eliminar), sin hora ni recordatorios aunque exista «fecha límite». | búsqueda en el código |

Decisiones del propietario sobre U1–U13: §13.2 (U7 y U9: la regla es la original; se agrega una validación), §13.6 (U1–U6, U10, U13) y §13.8 (U11, textos).

### 10.3 Textos y tono
Todo el texto está fijo en Kotlin, en español, con tono **cálido, calmado y sin culpa** y con **tuteo** («Tus días, con calma.», «Dale un lugar en tu día.», «Ajusta los detalles a tu ritmo.», «Puedes mover cualquier tarea…», «Vas al día»). **Decisión del propietario (Q14, revisión 3):** Brisa es una app personal con sus propias reglas de tuteo; **se conservan todos los textos originales tal cual**, sin reescribirlos a usted ni a forma impersonal. Es una excepción a la regla general de Pastel (`AGENTS.md`, `DESIGN_SYSTEM.md` §8) que debe quedar registrada (CCR-1). La lista completa y exacta de textos, con sus pocas excepciones, está en **§13.8**.

---

## 11. Casos de paridad

«Hoy» = 2026-10-18 (domingo) salvo indicación. `P` = día asignado, `L` = fecha límite. Estado: **P** = replicar tal cual; **D** = comportamiento actual discutible; **A** = cambio aprobado por el propietario: el resultado esperado en la web está en §13.10 (o en §13.1 y §13.2) y sustituye al de esta columna. Los resultados salen del código, no de la ficha de migración.

| ID | Entrada | Comportamiento esperado | Estado |
|---|---|---|---|
| C01 | Día 10-18 con 4 abiertas: A Baja (creada 1.º), B Alta (3.º), C Alta (2.º), D Media (4.º) | Orden: C, B, D, A (prioridad ↓, antigüedad ↑) | P |
| C02 | Día 10-18 con abierta A y hechas X Media (5.º), Y Alta (6.º), Z Alta (7.º) | Abiertas: A. Sección «HECHAS»: Z, Y, X (prioridad ↓, creación ↓). | P |
| C03 | Abierta, `P=10-17`, `L=null` | Aparece en Vencidas («PROGRAMADA PARA Sábado 17 de octubre»); sigue en la columna del 17; no se reprograma | P |
| C04 | Abierta, `P=10-18`, `L=null` | No está en Vencidas; aparece en el día «HOY» | P |
| C05 | Abierta, `P=10-20`, `L=10-17` | Vencidas (muestra «Martes 20 de octubre» y «Límite 17 oct»); Fechas límite como «VENCIDA» («Sábado 17 de octubre») | A (§13.2) |
| C06 | Abierta, `P=10-15`, `L=10-20`; se abre la app | `P` pasa a 10-18; no está en Vencidas; aparece en HOY y en Fechas límite (20 oct) | A (§13.1) |
| C07 | Abierta, `P=10-16`, `L=10-18`. Luego pasa un día (hoy = 10-19) sin completarla | Hoy 10-18: `P` pasa a 10-18, sin vencida. Hoy 10-19: `P` queda en 10-18 (`L < hoy`), aparece en Vencidas y como «VENCIDA» en Fechas límite | A (§13.1) |
| C08 | Hecha, `P=10-15`, `L=10-20` | No se reprograma (queda en HECHAS del 15); no está en Vencidas; en Fechas límite al final con «Hecha» | P |
| C09 | Hecha, `P=10-14`, `L=10-16` | No aparece en Fechas límite ni en Vencidas; sí en HECHAS del 14 y en el contador del mes | P |
| C10 | Hecha, `P=10-14`, `L=10-25`; «Marcar como pendiente» | Queda abierta; **sigue en el 14** hasta el siguiente `ON_RESUME`/receptor, luego pasa a 10-18 | A (§13.1) |
| C11 | Hecha, `P=10-14`, `L=null`; «Marcar como pendiente» | Abierta y de inmediato en Vencidas | P |
| C12 | Abierta, `P=10-18`, `L=10-25`; se edita `P` a 10-10 y se guarda | Se guarda 10-10; en el siguiente `ON_RESUME` vuelve a 10-18 sin aviso | A (§13.1) |
| C13 | Crear `P=10-18`, `L=10-10` | Se guarda sin error; aparece de inmediato en Vencidas y también en HOY | A (§13.2: se rechaza) |
| C14 | Foco 10-18; título «  Comprar pan  », nada más; Guardar | Tarea: título «Comprar pan», notas vacías, `P=10-18`, prioridad Media, sin límite, abierta, color de la paleta (aleatorio), id nuevo, `createdAt` = ahora | A (§13.6: botón flotante = hoy) |
| C15 | Título «   » (solo espacios) | «Guardar» (y «Marcar como hecha») deshabilitados; no se crea nada | P |
| C16 | «+» de la columna 10-21 | Editor con día 10-21; el foco pasa a 10-21 (columnas 19…25 oct) | P |
| C17 | Foco 10-18 → «Siguiente» | Columnas 16…22 oct; tras «Siguiente»: foco 10-19, columnas 17…23 oct; «Ir a hoy» vuelve a 10-18. El resumen «N por hacer · M hechas» cuenta solo tareas con `P` dentro de la ventana | P |
| C18 | 3 abiertas (una vencida, otra con `P=10-30`) y 2 hechas | Cabecera: «3 pendientes» (todas las abiertas) | P |
| C19 | Mes octubre 2026 (el 1 es jueves) | 3 celdas vacías antes del 1, 31 días, 35 celdas (1 vacía al final); día con 12 tareas → insignia rellena «12»; con 100 → «99+»; tocar el 20 → foco 10-20 y pestaña Semana con columnas 18…24 oct | P |
| C20 | Mes febrero 2028 | 1 celda vacía antes del 1 (martes), 29 días, 35 celdas | P |
| C21 | Abiertas: V1 `P=10-15` Baja sin `L`; V2 `P=10-20`, `L=10-14` Media; V3 `P=10-15` Alta sin `L`; V4 `P=10-12`, `L=10-15` Media | Orden en Vencidas por `(L ?? P)` ↑ y prioridad ↓: V2, V3, V4, V1 | P |
| C22 | Abiertas: F1 `L=10-17` Baja; F2 `L=10-20` Alta; F3 `L=10-20` Baja; F4 `L=10-19` Media. Hecha: F5 `L=10-19` | Orden en Fechas límite: F1, F4, F2, F3, F5 (abiertas antes que hechas) | P |
| C23 | Abierta, `P=10-18`, `L=10-18` | Sin cambios; en Fechas límite con «FECHA LÍMITE» (no vencida); no está en Vencidas | P |
| C24 | Eliminar una tarea: papelera → «Conservar» y luego «Eliminar» | «Conservar» la deja intacta; «Eliminar» la quita de todas las vistas y contadores, sin deshacer (en la web, borrado lógico con el mismo resultado visible) | P |
| C25 | Dispositivo en Costa Rica; pasa de 2026-10-18 23:59 a 00:00 del 19. T1 `P=10-18`, `L=10-21`; T2 `P=10-18`, `L=null`; ambas abiertas | El receptor deja T1 en `P=10-19`; T2 no cambia. Al abrir la app (hoy 10-19), T2 está en Vencidas («PROGRAMADA PARA Domingo 18 de octubre») | A (§13.1) |
| C26 | **Frontera de zona:** son las 23:30 del 18 en Costa Rica (= 05:30 UTC del 19). Tarea abierta `P=10-18`; otra `P=10-19` | «Hoy» = 10-18: la primera está en HOY y **no** en Vencidas; la segunda es «mañana». A las 00:00 CR del 19 (06:00 UTC) «hoy» pasa a 10-19. Un servidor en UTC debe dar el mismo resultado usando la zona de la persona | P |
| C27 | Dispositivo cambia de UTC-6 a UTC+1 a las 22:00 CR del 18 (allí ya es 05:00 del 19) | `TIMEZONE_CHANGED` → hoy = 10-19 → se reconcilia como en C25 (solo Android; en la web «hoy» sigue la zona configurada de la persona, Q4) | A (§13.3) |
| C28 | Cerrar y reabrir la app | Las tareas se conservan; vuelve a la pestaña Semana con foco = hoy; el tema vuelve a claro | A (§13.6) |
| C29 | Datos locales con: registro sin título; otro con `scheduledDate` «2026-13-40»; otro con prioridad «URGENT»; otro sin `colorHex`; otro con `dueDate` «xx» | La app descarta los dos primeros; los siguientes se leen como prioridad Media, color `#DDE8D5` y `dueDate = null`. **La importación web no hereda esto**, salvo la prioridad desconocida (Media con advertencia, Q9); el resto rechaza el lote (§9.4) | A (§13.9) |
| C30 | Ejecutar la reprogramación dos veces el mismo día | Segunda ejecución sin cambios (idempotente) | A (§13.1) |
| C31 | Editar una tarea existente y guardar | Sigue habiendo una sola con ese `id`; `createdAt` no cambia; conserva `completed` (salvo que se use el botón de estado) | P |
| C32 | Exactamente 1 tarea abierta | Texto actual «1 pendientes» (cabecera) y «1 hechas»; «tarea/tareas» sí pluraliza | A (§13.6) |

---

## 12. Riesgos, preguntas y respuestas del propietario

### Riesgos
| # | Riesgo | Evidencia / estado |
|---|---|---|
| R1 | Receptor y `ViewModel` usan instancias distintas del repositorio; el estado en memoria puede quedar desactualizado y sobrescribir cambios (efecto leve por idempotencia). | `DailyTaskRolloverReceiver`, `TasksViewModel`. No aplica a la web. |
| R2 | JSON corrupto → lista vacía → la siguiente escritura borra todo; registros inválidos se pierden en silencio. | `LocalTaskRepository.readTasks`. No aplica a la web. |
| R3 | «Hoy» no se actualiza con la app abierta pasada la medianoche. | `BrisaApp › DisposableEffect`. En la web debe actualizarse sin recargar y en la zona de la persona (§13.1, AC1). |
| R4 | No existe exportación de datos. | **Resuelto (Q2):** no hay datos reales que migrar. Nuevo riesgo: construir el importador sin datos reales con qué validarlo → usar el archivo de §9.5 y casos de borde. |
| R5 | `colorHex` no se valida; un valor inválido haría fallar `Color.parseColor` (**Suposición**). | En la web se valida `#RRGGBB` siempre (§13.7). |
| R6 | La ficha `BRISA.md` (prueba 5) supone tareas «para las 23:30»; Brisa **no tiene hora**. | **Resuelto (Q5):** texto de reemplazo en §13.12. |
| R7 | La reprogramación diaria sobrescribe el día asignado y se pierde el original. | **Mitigado:** con el cálculo derivado (§13.1) `ScheduledDate` no se sobrescribe. |
| R8 | Formatos de fecha `es-CR` de Java pueden diferir de `Intl` en el navegador (**Suposición**). | `formatCompactDate`, `formatFullDate`. Fijar formato con pruebas. |
| R9 | README desactualizado, wrapper no estándar y cobertura de pruebas mínima: la paridad depende de este inventario. | §1 |
| R10 | Receptor `exported="true"` y `allowBackup="true"` sin reglas (**Suposición**). | No aplica a la web. |
| R11 | **Riesgo principal del módulo:** si la reprogramación diaria falla en algún caso, una tarea queda «atrás y perdida» y se pierde el propósito de la app. | Se controla con los criterios AC1–AC7 y los vectores de §13.1; cualquier mecanismo que incumpla uno se rechaza. |
| R12 | El gris de texto secundario y el rojo de error del tema claro original no cumplían contraste AA. | **Resuelto (P1):** se usan `#57605A` y `#904B3C` (§13.7). |
| R13 | Valores de color propios del módulo y tuteo podían chocar con reglas generales de Pastel y con sus controles automáticos. | **Resuelto:** el propietario estableció que las reglas de **diseño del frontend** de cada módulo prevalecen sobre las generales (solo eso; lo demás sigue las generales); se aplicó en `CCR-1` (rama `docs/module-rules-precedence`). |
| R14 | La zona por persona exige un lugar donde guardarla; si es el perfil de Identity (zona protegida) hace falta un CCR. | §13.3 |
| R15 | Alcance ampliado (un toque, búsqueda, `CompletedAt`, validaciones): probar aparte de la paridad. | §13.11 |

### Preguntas y respuestas (propietario)
| # | Pregunta (resumen) | Respuesta | Resultado vigente |
|---|---|---|---|
| Q1 | ¿`brisa-android` (`main`) es el proyecto y no hay otra versión? | Sí. | Confirmado. |
| Q2 | ¿Datos reales? ¿Autoriza «Exportar respaldo»? | No hay nada que exportar. | No se toca la app Android; importador mínimo (§13.9). |
| Q3 | Reprogramación diaria: ¿derivada (A) o persistida (B)? | Primero «dejemos la recomendada»; **corregido (rev. 3):** a medianoche la tarea con fecha límite sin terminar **sigue avanzando al día siguiente** y no debe quedarse atrás; si el cálculo derivado lo cumple, se acepta. | Función obligatoria con criterios de aceptación y vectores (§13.1). |
| Q4 | ¿Zona fija o configurable? | Configurable por persona. | §13.3 |
| Q5 | ¿Se agrega hora? | No. | §13.12 |
| Q6 | ¿Qué defectos se corrigen? | Marcar hecha con un toque (fuera y dentro); mejora sutil de búsqueda; recordatorios para después; U7 «de la mejor manera»; **corregido:** no se entiende «hacer/deshacer». | Un toque y búsqueda aprobados; deshacer **no aprobado** (§13.6). |
| Q7 | ¿Sigue en Vencidas si se mueve su día? | **Corregido (rev. 3): sí sigue.** Hay dos criterios de vencida y para rescatarla se cambia la **fecha límite**. | Regla original, sin cambios (§13.2). |
| Q8 | Límites | Sin límite de cantidad; longitud coherente con el campo. | 150 y 2000 caracteres (§13.4). |
| Q9 | ¿Prioridad desconocida? | Se tolera como Media, como la app. | §13.9 |
| Q10 | ¿Hex o clave? ¿Colores fuera de paleta? | Primera respuesta ambigua; **corregido (rev. 3):** tema claro idéntico a Android; oscuro con lo definido en Pastel (sin fondo verdoso). | §13.7 |
| Q11 | Reimportar un `Id` con contenido distinto | Acepta la sugerencia. | Omitir e informar (§13.9). |
| Q12 | ¿`CompletedAt`? | Sí. | §13.5 (además interviene en la fecha efectiva de las hechas). |
| Q13 | ¿Paleta de 10 y color aleatorio? | Sí. | Se conservan. |
| Q14 | ¿Textos en usted/impersonal? | **Corregido (rev. 3): no.** Brisa es una app personal con sus propias reglas de tuteo; se mantienen los textos originales. | §13.8 |
| Q15 | Botón flotante (antes P1 / U2) | Fecha por defecto = **día actual**, modificable; el «+» del encabezado de cada día crea en esa fecha. | §13.6 |
| Q16 | Cierre del editor (U3) | Pide confirmación **solo si hay texto escrito**. | §13.6 |
| Q17 | Editor (U4) | Al abrir, el cursor queda en el título y «Enter» guarda. | §13.6 |
| Q18 | Estado de pantalla (U5) | La vista y el día enfocado sobreviven a una recarga. | §13.6 |
| Q19 | Contraste del tema claro (P1) | Elige los valores que respetan AA y se ven casi igual. | `#57605A` (texto secundario) y `#904B3C` (error); el resto del tema claro es exacto (§13.7). |
| Q20 | Excepciones de Pastel (P2) | Autoriza los cambios para que no se bloqueen; **cada módulo tiene sus propias reglas y están por encima de las generales**, que solo aplican si el módulo no define las suyas, y **únicamente en el diseño del frontend** (arquitectura, backend, seguridad, errores y logs, flujo y pruebas siguen las generales). | `CCR-1` aplicado en la rama `docs/module-rules-precedence` (reglas, ficha de Brisa). |
| Q21 | Validación día ≤ fecha límite (P3) | Sí: al crear se eligen dos fechas (desde cuándo aparece la tarjeta y la fecha límite opcional) y **siempre** se cumple día ≤ fecha límite, también al modificar. | §13.2 (rige al crear, modificar e importar). |
| Q22 | Subtítulo de Vencidas (P4) | Exacto: se conserva. | Sin cambios (§13.8). |
| Q23 | Singular (P5) | Perfecto. | «1 pendiente», «1 hecha». |
| Q24 | Tarjetas y prioridad en oscuro | Sí: conservan la regla de Android. | §13.7 |

### Pendientes
- **P6 (importador).** Sin datos reales, `BRISA.md` §4.4 y su criterio de aceptación 6 siguen exigiendo importación probada con datos de ejemplo; se mantiene un importador mínimo. Omitirlo exige cambiar la ficha. Sin respuesta aún.
- **P7 (deshacer).** Fuera de alcance hasta que el propietario lo pida (§13.6).

---

## 13. Decisiones del propietario y comportamiento objetivo de la web

**Revisión 3 (2026-10-18).** Este apartado **prevalece sobre los apartados 5, 7, 9, 10 y 11 donde difieran**: los apartados 1–11 describen la app actual (base de paridad) y aquí se registran los cambios exigidos por `BRISA.md` §3.1. Brisa es una app personal para llevar los pendientes del día a día de forma sencilla: **alta rápida** (por eso los valores por defecto: prioridad Media, color aleatorio), **carrusel de días** y **reprogramación diaria**. Ninguna decisión técnica puede degradar eso.

### 13.0 Registro de cambios respecto a la app Android
**Se conserva sin cambios (por decisión del propietario):** la reprogramación diaria (§13.1), los dos criterios de «Vencida» (§13.2), todos los textos y el tono (§13.8), el tema claro (§13.7), la paleta de 10 colores y el color aleatorio, los valores por defecto de alta rápida.

**Cambia o se agrega:**
1. Validación: el día asignado nunca puede ser posterior a la fecha límite, al crear, modificar o importar — §13.2.
2. Zona horaria por persona — §13.3.
3. Límites de 150 (título) y 2000 (notas) caracteres — §13.4.
4. `CompletedAt` — §13.5.
5. Marcar hecha con un toque; búsqueda; botón flotante con el día actual; foco en el título y «Enter» guarda; confirmación al cerrar solo con texto escrito; vista y día enfocado se conservan al recargar; tema persistente — §13.6.
6. Tema oscuro con el sistema de Pastel — §13.7.
7. Singular correcto en los contadores — §13.8.
8. Importación — §13.9.

**No aprobado / aplazado:** deshacer, recordatorios y notificaciones.

### 13.1 Reprogramación diaria (requisito obligatorio)
**Qué hace la app hoy y debe seguir haciendo.** Las tareas se muestran en un carrusel de días.
- **Sin fecha límite:** la tarea no se mueve. Cuando su día pasa, queda **vencida** en ese día.
- **Con fecha límite:** mientras no esté hecha y su fecha límite no haya pasado, la tarea **se mueve sola al día siguiente cada medianoche**, hasta que se marque hecha o llegue su fecha límite. Pasada la fecha límite deja de moverse y queda vencida, en el día de su fecha límite.

**Criterios de aceptación** (si un mecanismo incumple uno, no se acepta). «Hoy» y «medianoche» son los de la zona de la persona (§13.3):
- **AC1.** A las 00:00, toda tarea abierta con fecha límite ≥ hoy y día anterior a hoy aparece en el día nuevo (carrusel, lista del día, contadores del mes, búsqueda y API), sin abrir la app ni hacer nada. Con la pantalla abierta pasada la medianoche, se actualiza sin recargar.
- **AC2.** Se repite cada día hasta marcar hecha o hasta el día de su fecha límite, que la muestra en ese día.
- **AC3.** La noche siguiente a su fecha límite deja de moverse: queda en el día de su fecha límite, como vencida.
- **AC4.** Sin fecha límite, nunca se mueve.
- **AC5.** **Nunca** se ve «atrás y perdida» en un día pasado mientras su fecha límite sea ≥ hoy, en ninguna vista.
- **AC6.** Si la persona no abre la app durante varios días, al volver la tarea aparece en hoy (no en los días que faltó).
- **AC7.** Una tarea marcada hecha **no se mueve más**: queda en el día en que se marcó (o en el último día al que había llegado).

**Mecanismo elegido (Q3): derivado.** `ScheduledDate` (lo que la persona eligió) **no se reescribe**; todas las vistas usan `FechaEfectiva`, calculada en servidor y devuelta como campo `EffectiveDate` junto a `ScheduledDate`; cualquier otro cliente (incluido un futuro cliente Android sin conexión) usa **la misma función**. Así no hay escrituras del sistema que choquen con ediciones de la persona al sincronizar. Si Dev prefiere persistir el cambio con un proceso del servidor (opción B de §7.3), debe cumplir AC1–AC7 y que ese cambio nunca pise una edición posterior de la persona.

```
ref = hoy                                    si la tarea está abierta
ref = fecha local de CompletedAt             si está hecha y CompletedAt existe
si hecha y CompletedAt es nulo               → ScheduledDate
si DueDate es nula                           → ScheduledDate
si ScheduledDate >= ref                      → ScheduledDate
si DueDate >= ref                            → ref
en otro caso (fecha límite ya pasó)          → max(ScheduledDate, DueDate)
```

**Línea de tiempo (tarea abierta, `P=15 oct`, `L=20 oct`):** se muestra el 15, 16, 17, 18, 19 y 20 (cada día en «su» día); el 21 se queda en el 20 como vencida.

**Vectores de prueba** (hoy = 2026-10-18):
| # | Tarea | Día efectivo | Vencida |
|---|---|---|---|
| V1 | abierta, `P=10-15`, sin `L` | 10-15 | Sí |
| V2 | abierta, `P=10-15`, `L=10-20` | 10-18 | No |
| V3 | abierta, `P=10-15`, `L=10-18` | 10-18 | No |
| V4 | abierta, `P=10-15`, `L=10-17` | 10-17 | Sí |
| V5 | abierta, `P=10-20`, `L=10-25` | 10-20 | No |
| V6 | abierta, `P=10-20`, `L=10-17` (dato inconsistente: no puede crearse, modificarse ni importarse; la función debe devolverlo sin error) | 10-20 | Sí (por `L`) |
| V7 | hecha, `P=10-15`, `L=10-20`, `CompletedAt` local = 10-18 | 10-18 | No |
| V8 | hecha, `P=10-15`, `L=10-20`, `CompletedAt` local = 10-16 | 10-16 | No |
| V9 | hecha, `P=10-15`, `L=10-20`, `CompletedAt` nulo | 10-15 | No |
| V10 | hecha, `P=10-15`, sin `L`, `CompletedAt` local = 10-18 | 10-15 | No |

**Edición.** El editor muestra en «Día asignado» el día efectivo; `ScheduledDate` solo se escribe si la persona lo cambia. Las listas, columnas, contadores y «PROGRAMADA PARA» usan el día efectivo; los órdenes de §5.3 se mantienen sustituyendo `scheduledDate` por él.

### 13.2 Tareas vencidas y fechas (Q7, U7)
**Dos criterios de «Vencida»** (iguales a la app, `overdueOn`): la tarea está abierta y
- **(a)** no tiene fecha límite y su día ya pasó, o
- **(b)** tiene fecha límite y esa fecha ya pasó (aunque su día asignado sea posterior).

**Cómo sacarla de Vencidas o darle más tiempo:**
1. Sin fecha límite (criterio a): cambiar el día a hoy o a uno posterior.
2. Con fecha límite vencida (criterio b): **cambiar la fecha límite** a hoy o posterior. Desde ahí vuelve a moverse cada medianoche (§13.1) hasta marcarla hecha o hasta la nueva fecha límite. **Cambiar solo el día no la saca de Vencidas.**
3. Si no se quiere ver una tarea con fecha límite vigente hoy sino más adelante: cambiar su día a un día posterior a hoy y **no posterior a la fecha límite**.

**Validación nueva (bloqueante, siempre):** al crear una tarea se eligen dos fechas: el **día** desde el que aparece su tarjeta y la **fecha límite** opcional. **Siempre** debe cumplirse `día ≤ fecha límite`: al crear, al modificar (cualquiera de las dos fechas) y al importar. Mensaje (tono de Brisa, texto propuesto): «El día de la tarea no puede ser después de su fecha límite. Cambia la fecha límite si necesitas más tiempo.» Se compara el día que la persona elija en esa edición o, si no lo toca, el `ScheduledDate` guardado (no el día efectivo que muestra el editor). Ejemplo: guardada `P=10-15`, `L=10-25`, hoy 10-18 (el editor muestra el 18); cambiar `L` a 10-17 es válido (15 ≤ 17) y la tarea pasa a vencida en el 17; cambiar el día a 10-26 se rechaza. Los selectores no deben ofrecer fechas que rompan la regla; la validación de servidor es la garantía. Un día pasado con fecha límite vigente se permite (la tarea igual se muestra hoy, §13.1).

**Fechas límite:** sin cambios (§5.3); «VENCIDA» mientras esté abierta y su fecha límite haya pasado.
El subtítulo de Vencidas se conserva tal cual (confirmado por el propietario).

### 13.3 Zona horaria por persona (Q4, Q5)
- Ajuste `TimeZoneId` (identificador IANA), valor inicial `America/Costa_Rica`. Se valida contra la base IANA (inválido → error con `code`).
- «Hoy», la medianoche, la fecha efectiva y el día de `CompletedAt` usan **esa zona**, no la del navegador ni la del servidor. No suponer desfase fijo: probar al menos una zona con horario de verano (Costa Rica no tiene).
- Fechas del módulo = `date` sin zona; `CreatedAt`, `CompletedAt`, `UpdatedAt` = `timestamptz` UTC, mostrados en la zona de la persona.
- Cambiar la zona solo cambia «hoy» (nada que reescribir).
- Brisa sigue **sin hora del día** (Q5).

### 13.4 Límites (Q8)
Título: **máximo 150 caracteres**. Notas: **máximo 2000**. Se cuentan tras `trim`. Sin límite de cantidad de tareas por persona. Validación en frontend (contador al acercarse) y backend (error con `code`, sin truncar en silencio); columnas del mismo tamaño. Son límites nuevos; en importación, un registro que los exceda se informa como error de ese registro.

### 13.5 `CompletedAt` (Q12)
`timestamptz` UTC asignado **por el servidor** al marcar hecha y `NULL` al reabrir. **Interviene en la regla de §13.1** (día efectivo de las tareas hechas). En datos importados con `completed = true` queda `NULL` (desconocido; no se inventa) y su día efectivo es `ScheduledDate`.

### 13.6 Comportamiento de pantalla aprobado
| Tema | Decisión |
|---|---|
| **Botón flotante «Nueva tarea»** (Q15, U2) | Abre el editor con el **día actual** (hoy) en cualquier pestaña, modificable. Para crear en un día concreto, el «+» del encabezado de cada día abre el editor con esa fecha (y, como en la app, enfoca ese día). Con esto quedan cubiertos todos los casos de alta. Valores por defecto sin cambios: prioridad Media, color aleatorio, sin fecha límite. |
| **Marcar hecha con un toque** (Q6, U1) | Control en cada tarjeta (Semana, Vencidas, Fechas límite, resultados de búsqueda) que alterna hecha/pendiente en un toque; el botón fijo «Marcar como hecha / pendiente» del editor se conserva. Tamaño táctil según `DESIGN_SYSTEM.md`. |
| **Búsqueda** (Q6) | Discreta (un icono en la cabecera). Busca en título y notas, sin distinguir mayúsculas ni tildes, entre las tareas **propias** abiertas y hechas, sin las eliminadas. El resultado muestra día y estado; tocarlo abre el editor. |
| **Cierre del editor** (Q16, U3) | Al cerrar (fuera del diálogo, «Cancelar» o la esquina) pide confirmación **solo si hay texto escrito**: en tarea nueva, título o notas no vacíos; en una existente, título o notas distintos de lo guardado. Cambios solo de día, prioridad, color o fecha límite no la piden. |
| **Foco y «Enter»** (Q17, U4) | Al abrir el editor el cursor queda en el título; «Enter» en el título guarda y cierra (si el título no está en blanco). En notas, «Enter» es salto de línea. |
| **Fechas del editor** (Q21) | Dos fechas: el **día** de la tarea (desde cuándo aparece la tarjeta; por defecto hoy) y la **fecha límite** opcional. Siempre `día ≤ fecha límite` (§13.2), también al modificar. |
| **Estado de pantalla** (Q18, U5) | La pestaña/vista y el día enfocado sobreviven a una recarga (mecanismo a elección de Dev; sin datos personales en la URL). |
| **Tema** (U6) | Claro y oscuro; la elección persiste; primera visita según `prefers-color-scheme` (`DESIGN_SYSTEM.md`). |
| **Accesibilidad** (U10) | Tamaños y objetivos táctiles según `DESIGN_SYSTEM.md`; nombres accesibles legibles (p. ej. «Crear tarea para el domingo 18 de octubre» en lugar de la fecha ISO); el icono de cierre del editor deja de ser un calendario. |
| **Deshacer** | **No aprobado.** La app Android no lo tiene: el término salió de mi lista de defectos (U13, «ausencias») y no de una función existente. Si desea algo como un aviso breve «Deshacer» tras marcar o eliminar, hay que pedirlo y definirlo aparte. |
| **Recordatorios** | Aplazados (`BRISA.md` §5). |

### 13.7 Tema y colores
**Tema claro: idéntico al de Android.** Valores exactos (`BrisaLightScheme`, `BrisaColors`):

| Rol Android | Valor | Rol Android | Valor |
|---|---|---|---|
| `background` | `#F7F6F0` | `outline` (borde) | `#E2E6DE` |
| `surface` | `#FFFEFA` | `error` (texto y alertas) | `#904B3C` (AA; el original era `#AE5B49`) |
| `primary` (acento, botones) | `#315B4A` | `secondary` | `#789987` |
| `onPrimary` | `#FFFFFF` | `tertiary` | `#E0BE73` |
| `onBackground` / `onSurface` (texto) | `#26342E` | `primaryContainer` / `surfaceVariant` | `#E6EEE5` |
| `onSurfaceVariant` (texto secundario) | `#57605A` (AA; el original era `#77837B`) | `onPrimaryContainer` | `#243D34` |
| `secondaryContainer` | `#E9F0EC` | `onSecondaryContainer` | `#243D34` |
| Mantequilla (`Butter`) | `#F2E5B5` | Coral (`Coral`) | `#E7A58D` |
| Prioridad alta / media / baja (fondo del chip) | `#F6DDCE` / `#F5E9B9` / `#E5EDC8` | Punto de prioridad alta / media / baja | `#C8755A` / `#B79A40` / `#7D9A6D` |

Paleta de tarjetas (10, sin cambios): Salvia `#DDE8D5`, Cielo `#DCEAF4`, Mantequilla `#F5E9B9`, Durazno `#F6DDCE`, Menta `#D4E9E1`, Arena `#E9E2D2`, Agua `#D1E7E5`, Coral suave `#F3D5C8`, Pistacho `#E5EDC8`, Azul bruma `#D7E4F0`. En claro la tarjeta usa el color tal cual.

**Tema oscuro: el de Pastel, no el de Android** (se descarta el fondo verdoso `#121815`/`#1B231F`). Fondo, superficies, texto y bordes salen de los tokens neutros de `DESIGN_SYSTEM.md` §2.1 (`--app-bg #191b20`, `--surface #22262d`, `--surface-raised #2b313a`, `--text #e9eae7`, `--text-secondary #c0c6cc`, `--muted #a2a9b1`, `--border #3b424e`) y el acento del módulo Brisa en oscuro (§2.2: `--accent #8daa98`, `--accent-soft #2a3636`, `--on-accent #14181c`). Lo que Pastel no define se conserva como en Android y se reserva para el diseño detallado: tarjetas de tarea (mezcla del color pastel al 36 % sobre `--surface`, regla `BrisaColors.TaskCard`) y chips/puntos de prioridad. **Confirmado por el propietario (Q24):** tarjetas y chips conservan la regla de Android sobre la superficie neutra de Pastel.

**Contraste (Q19):** el tema claro es exacto salvo dos valores que se oscurecieron lo mínimo para cumplir WCAG 2.2 AA (4,5:1) sobre fondos, superficies y las 10 tarjetas: texto secundario `#57605A` (4,7:1 en el peor caso) y rojo de error `#904B3C` (4,65:1). La prioridad nunca depende solo del color (punto + texto). **Reglas de Pastel (Q20):** los colores salen de tokens; los valores de este apartado se registran como tokens de `data-module="brisa"` (`module-themes.css`) y quedan documentados en `docs/modules/BRISA.md`. Las reglas de diseño del frontend del módulo prevalecen sobre las generales (`CCR-1`), solo en eso. Todos los colores citados quedan fuera del rango prohibido de morado (235°–345°).

**Colores de tarjeta en datos:** se guarda el `#RRGGBB` elegido; un valor con formato inválido se rechaza. Los de la paleta actual son los únicos que ofrece el editor.

### 13.8 Textos y tono (Q14)
**Decisión:** Brisa es una app personal y **conserva todos sus textos originales, con tuteo y tono cálido y sin culpa**, tal como están en Android; no se reescriben a usted ni a forma impersonal. Esto es una **excepción del propietario** a la regla general de Pastel, válida porque las reglas de diseño del frontend de cada módulo prevalecen sobre las generales (CCR-1). El voseo sigue sin usarse (la app original no lo usa). Todos van en `strings.ts`.

Excepciones a «copiar tal cual»: (1) el singular («1 pendiente», «1 hecha»; Q23); (2) los nombres accesibles técnicos (fecha ISO, icono de calendario como «Cerrar») de §13.6; (3) los textos nuevos de la web (búsqueda, validaciones, errores, confirmación al cerrar) se escriben **en el mismo tono** (tuteo cálido).

**Textos originales (normativos; fuente `ui/BrisaApp.kt`, `ui/components/TaskEditorDialog.kt`, `domain/TaskItem.kt`):**
| Zona | Texto exacto |
|---|---|
| Cabecera | «Brisa» · «Tus días, con calma.» · «N pendientes» · «Activar modo claro» / «Activar modo oscuro» |
| Pestañas | «Semana» · «Mes» · «Vencidas» · «Fechas límite» |
| Botón flotante | «Nueva tarea» |
| Semana | «Tu semana» · «d MMM – d MMM» · «N por hacer · M hechas» · «Ir a hoy» · «Un día atrás» · «Un día adelante» · «Desliza para explorar cada día» · «HOY» · «N tarea(s)» · «Sin tareas» · «HECHAS» · «Límite d MMM» · «Hecha» · «Crear tarea para {fecha}» |
| Mes | «Tu calendario» · «Elige un día para ver sus pendientes.» · «Mes anterior» · «Mes siguiente» · «Octubre 2026» (mes y año) · «N tarea(s)» · «HOY» · `L M X J V S D` |
| Vencidas | «Pendientes atrasados» · «Puedes mover cualquier tarea a otro día sin perder sus detalles.» · «Todo al día» / «1 tarea» / «N tareas» · vacío: «Vas al día» y «No tienes tareas pendientes de días anteriores.» · «PROGRAMADA PARA» · «Prioridad {baja/media/alta}» · «Límite d MMM» |
| Fechas límite | «Fechas límite» · «Las fechas más próximas aparecen primero.» · vacío: «Sin fechas límite» y «Cuando una tarea tenga fecha límite, aparecerá aquí en orden de vencimiento.» · «FECHA LÍMITE» / «VENCIDA» · insignias «Hecha» y «Vencida» |
| Editor | «Una nueva tarea» / «Tu tarea» · «Dale un lugar en tu día.» / «Ajusta los detalles a tu ritmo.» · «¿Qué necesitas hacer?» · «Ej. Preparar la presentación» · «Notas (opcional)» · «Añade un poco más de contexto…» · «DÍA ASIGNADO» · «Día de la tarea» · «PRIORIDAD» (Baja, Media, Alta) · «COLOR DE LA TARJETA» · «Tonos suaves que puedes cambiar cuando quieras.» · «Añadir fecha límite» · «Opcional, para no perderla de vista.» · «Fecha límite · toca para definirla» / «… toca para cambiarla» · «Sin fecha límite» · «Marcar como hecha» / «Marcar como pendiente» · «Cancelar» · «Guardar» · «Eliminar tarea» |
| Selector de fecha | «Día asignado» / «Elige la fecha límite» · «Guardar fecha» · «Cancelar» · «Cambiar fecha» |
| Confirmar eliminación | «¿Eliminar esta tarea?» · «No podrás recuperarla después de eliminarla.» · «Eliminar» · «Conservar» |
| Colores | Salvia, Cielo, Mantequilla, Durazno, Menta, Arena, Agua, Coral suave, Pistacho, Azul bruma |
| Formatos de fecha (`es-CR`) | Completa «Sábado 17 de octubre» (`EEEE d 'de' MMMM`, primera en mayúscula); corta «17 oct» (`d MMM`); mes «Octubre 2026»; día de la semana en el encabezado: abreviatura en mayúsculas sin punto («LUN») |

Nota: «Al día, sin prisa» **no** es un texto de la app Android; era una propuesta mía y queda descartada. El texto original es «Vas al día».

### 13.9 Importación (Q2, Q9, Q11)
- **Q2:** sin datos reales; no se añade «Exportar respaldo» ni se modifica la app Android. El importador y el formato de §9 se conservan como herramienta mínima probada con el archivo de §9.5 (P6).
- **Q9:** prioridad ausente o desconocida → `MEDIUM` con **advertencia** en el informe (no aborta el lote). Todo lo demás sigue la validación estricta de §9.4.
- **Colores:** `#RRGGBB` válido obligatorio; los de fuera de la paleta de 10 se aceptan como dato (el editor ofrece solo la paleta). Un formato inválido rechaza el lote.
- **Q11:** `Id` existente con contenido igual → «ya existente»; distinto → se **omite** y se informa «ya existía con diferencias»; nunca se sobrescribe.
- **Invariante `día ≤ fecha límite` (§13.2):** un registro con `dueDate` anterior a `scheduledDate` se rechaza (error de ese registro y del lote).

### 13.10 Resultado esperado en la web de los casos de §11 que cambian
| Caso | Resultado en la web |
|---|---|
| C05 `P=10-20`, `L=10-17` | **No puede existir** en la web: se rechaza al crear, modificar o importar (§13.2). |
| C06 `P=10-15`, `L=10-20` | Aparece en HOY (efectiva 10-18); `ScheduledDate` sigue en 10-15 en la base; sin escrituras. |
| C07 `P=10-16`, `L=10-18` | Hoy 10-18: en HOY. Hoy 10-19: día efectivo 10-18 → Vencidas («PROGRAMADA PARA Domingo 18 de octubre») y «VENCIDA» en Fechas límite. |
| C08 hecha `P=10-15`, `L=10-20`, `CompletedAt` nulo | Se queda en el 15 (V9). |
| C10 hecha `P=10-14`, `L=10-25`, se reabre | Aparece **de inmediato** en HOY; `CompletedAt = NULL`. |
| C12 `P=10-18`, `L=10-25`, se guarda `P=10-10` | Se guarda 10-10 y se muestra en HOY mientras la fecha límite esté vigente (§13.1). |
| C13 crear `P=10-18`, `L=10-10` | **Se rechaza al guardar** con el mensaje de §13.2 (la app lo permitía). |
| C14 alta mínima | Igual, pero con el botón flotante el día es **hoy**; con el «+» de una columna, el de esa columna. |
| C25 medianoche | Sin receptor: a las 00:00 locales «hoy» = 10-19; T1 se muestra el 19; T2 queda vencida en el 18; ninguna escritura (AC1). |
| C27 cambio de zona | Cambiar el ajuste de zona recalcula «hoy»; los datos no cambian. |
| C28 recargar | Se conservan tema, vista y día enfocado (§13.6). |
| C29 datos viejos | Prioridad desconocida → Media con advertencia; título vacío, fecha inválida o color con formato inválido → se rechaza el lote. |
| C30 | Determinista: la derivación no escribe. |
| C32 | «1 pendiente» y «1 hecha». |

### 13.11 Casos nuevos
«Hoy» = 2026-10-18 salvo indicación.
| ID | Entrada | Comportamiento esperado |
|---|---|---|
| N01 | Un toque en el control de una tarea abierta en Semana | Pasa a «HECHAS»; `CompletedAt` = ahora (UTC, servidor); contadores actualizados |
| N02 | Un toque en una tarea hecha | Vuelve a abiertas; `CompletedAt = NULL`; se ubica por su día efectivo |
| N03 | Abierta `P=10-15`, `L=10-20`; hoy = 10-18; se marca hecha | Queda en HECHAS del 18 (V7); al día siguiente sigue en el 18 |
| N04 | Abierta `P=10-15`, `L=10-20`; no se abre la app del 16 al 19; se abre el 19 | Aparece en el 19 (AC6), no en el 16 |
| N05 | Misma tarea; hoy = 10-21 | Está en el 20, vencida (AC3); no avanza más |
| N06 | Abierta `P=10-15`, sin `L`; hoy = 10-19 | Sigue en el 15, vencida (AC4) |
| N07 | Abierta `P=10-15`, `L=10-25`; se cambia el día a 10-22 | Hasta el 21 no aparece en hoy; el 22 aparece en el 22; el 23 se mueve al 23 (AC2) |
| N08 | Con fecha límite vencida (`P=10-15`, `L=10-17`) se cambia solo el día a 10-18 | Se rechaza (día > fecha límite); sigue vencida |
| N09 | Mismo caso; se cambia la fecha límite a 10-25 | Sale de Vencidas, aparece en HOY y pierde «VENCIDA» |
| N10 | Vencida sin fecha límite (`P=10-15`); se cambia el día a hoy | Sale de Vencidas y aparece en HOY |
| N11 | Botón flotante con el foco en el 10-21 | El editor abre con el día **10-18** |
| N12 | «+» de la columna del 10-21 | El editor abre con 10-21 y el foco pasa al 21 |
| N13 | Editor nuevo: se escribe un título y se toca fuera | Pide confirmación; sin texto escrito, cierra sin preguntar |
| N14 | Editor: solo se cambia el color y se toca «Cancelar» | Cierra sin preguntar |
| N15 | Editor nuevo: «Enter» con título «Comprar pan» | Guarda y cierra; con título en blanco no guarda |
| N16 | Recargar la página con la vista Mes y el 10-21 enfocado | Vuelve a Mes con el 10-21 enfocado |
| N17 | Buscar «reunion» con «Reunión semanal» (título), otra con «REUNIÓN» en notas, una eliminada y una de otra persona | Devuelve las dos propias no eliminadas |
| N18 | Título de 150 / 151 caracteres; notas de 2000 / 2001 | 150 y 2000 se guardan; 151 y 2001 → error claro, sin truncar |
| N19 | Persona con zona `America/New_York`; son las 23:30 del 18 en Costa Rica (01:30 del 19 en Nueva York) | Para esa persona «hoy» = 2026-10-19 |
| N20 | Persona sin ajuste de zona | Se usa `America/Costa_Rica` |
| N21 | Guardar la zona «Mars/Olympus» | Error con `code`; el ajuste no cambia |
| N22 | Importar un registro con prioridad «URGENT» | Se importa como Media con advertencia; el lote continúa |
| N23 | Reimportar el mismo archivo; luego con un título cambiado en un registro | 0 nuevos y 5 «ya existentes»; el cambiado se omite y se informa; la tarea guardada no cambia |
| N24 | 1 pendiente y 1 hecha | «1 pendiente» y «1 hecha» |
| N25 | Tema oscuro | Fondo `#191b20` y superficies de Pastel (sin verde); acento Brisa oscuro |
| N26 | Crear con día 10-18 y fecha límite 10-17 | Se rechaza con el mensaje de §13.2; no se guarda |
| N27 | Guardada `P=10-15`, `L=10-25` (el editor muestra 18); cambiar `L` a 10-17 / cambiar el día a 10-26 | 10-17: se guarda (15 ≤ 17) y pasa a vencida en el 17. 10-26: se rechaza |
| N28 | Tarea sin fecha límite; agregar fecha límite 10-16 con día 10-18 | Se rechaza (día > fecha límite) |
| N29 | Importar un registro con `scheduledDate` 10-20 y `dueDate` 10-17 | Error de ese registro; el lote no importa nada |

### 13.12 Texto de reemplazo para la prueba 5 de `BRISA.md`
> **Fechas:** con «hoy» calculado en la zona configurada de la persona (por defecto `America/Costa_Rica`, UTC-6, sin horario de verano), una tarea asignada al día 18 sigue en «Hoy» a las 23:30 hora local aunque en UTC ya sea el 19, y deja de serlo solo a las 00:00 local, cuando las tareas con fecha límite sin terminar avanzan al día siguiente. Brisa no maneja hora del día. El vencimiento y el día efectivo respetan esa zona (inventario §13.1–§13.3).

No modifiqué `BRISA.md`: el cambio queda a cargo de quien tenga autorización sobre las fichas.
