# Brisa — inventario funcional y técnico (aplicación Android actual)

Fuente funcional de la migración descrita en `docs/modules/BRISA.md`. Elaborado por un agente de investigación; **no se modificó el código original ni se escribió código de migración**.

| Dato | Valor |
|---|---|
| Repositorio analizado | `leandro-mc/brisa-android` (rama `main`, 3 commits, 2026-10-15). Se asume que es el repositorio «Brisa» de la solicitud: el nombre difiere, pero `rootProject.name = "Brisa"` y `applicationId = com.brisa.todo`. |
| Commit analizado | `c090107` («fix: polish dark theme surfaces and contrast») |
| Alcance leído | Todo el código fuente (≈1 900 líneas: 15 archivos Kotlin, manifiesto, recursos, Gradle, README y la única clase de pruebas). La app no se compiló ni se ejecutó: todo lo descrito sale de leer el código. |
| Convención de citas | `ruta › símbolo`. Las rutas son relativas a `app/src/main/java/com/brisa/todo/` salvo que empiecen por `app/` u otra raíz. «L123» = línea en el commit analizado. **Suposición** = no confirmado en el código. |
| Fecha de referencia en los casos | «hoy» = **domingo 2026-10-18** (zona `America/Costa_Rica`, UTC-6, sin horario de verano). |

Hallazgo que condiciona la migración: **Brisa trabaja solo con fechas (día), nunca con hora del día; no tiene repetición de tareas, recordatorios ni notificaciones.** Los apartados 5, 6 y 11 lo detallan.

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

«Conservar» es **propuesta del investigador**; la decide el propietario (§12).

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
| Reprogramación automática a hoy | Pendiente con fecha límite vigente y día asignado pasado → día asignado = hoy | `TaskQueries.kt › rollForwardDeadlineTasks`; `LocalTaskRepository.reconcileDailyTasks` | **Esencial** (regla); el mecanismo cambia en la web (§7.3) |
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
- **A. Derivada (recomendada para sincronizar):** no persistir; la «fecha efectiva» de una tarea abierta con `dueDate >= hoy` es `max(scheduledDate, hoy)`. Resultado visible idéntico y sin escrituras ni conflictos; pierde la propiedad de que el día asignado quede escrito.
- **B. Persistida (paridad estricta):** un proceso idempotente en el servidor, al cambiar el día en la zona de la persona o en la primera lectura del día, actualiza `scheduledDate` y `UpdatedAt`; el cambio de sistema solo se aplica si la fila no cambió desde la versión leída (compare-and-set).
Ambas deben pasar los casos C06–C12.

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
- **Cómo sacarlo (opciones, ninguna implementada):** (a) añadir a la app una acción «Exportar respaldo» que escriba el arreglo —cambio mínimo, requiere autorización del propietario porque toca el código original—; (b) acceso al archivo con una compilación de depuración (**Suposición**: una instalación normal no es depurable); (c) respaldo automático del sistema (**Suposición**, no accesible para Pastel). Se recomienda (a).

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
| `title` | `Title` | `trim`; no vacío. Límite máximo: pendiente (§12, Q8). |
| `details` | `Notes` | Texto; `null`/ausente → `""`. |
| `scheduledDate` | `ScheduledDate` (`date`) | ISO `yyyy-MM-dd` estricta. Sin conversión de zona. |
| `priority` | `Priority` (smallint) | `LOW→0`, `MEDIUM→1`, `HIGH→2`. Ausente → `MEDIUM`; valor distinto de los tres → error (la app lo tolera como `MEDIUM`; ver §12 Q9). |
| `colorHex` | `ColorHex` (`#RRGGBB`) | Formato obligatorio. Fuera de la paleta de 10: aceptar o mapear a Salvia (decisión Q10). Ausente → `#DDE8D5`. |
| `dueDate` | `DueDate` (`date` nula) | `""` o ausente → `NULL`; si no, ISO estricta. |
| `completed` | `IsCompleted` | Booleano. Ausente → `false`. |
| `createdAt` (ms UTC) | `CreatedAt` (`timestamptz`) | `epoch ms → UTC`. Ausente → instante de importación (con aviso). |
| — | `CompletedAt` | `NULL` (no se conoce; no inventarlo). |
| — | `UpdatedAt` / `RowVersion` | Los asigna el servidor al importar. |
| — | `DeletedAt` | `NULL`. |
| — | `ImportBatchId` | Identifica el lote para revertirlo (§9.4). |

### 9.4 Reglas de la importación (de `BRISA.md` §3.3 y plan de pruebas 6)
1. **Todo o nada:** una transacción; **cualquier** registro inválido aborta el lote y se informa fila, campo y motivo. (Difiere a propósito de la app, que descarta en silencio.)
2. **Sin duplicar:** por `OwnerId + Id`. Reimportar el mismo archivo no cambia nada; si el `Id` existe con contenido distinto, se informa como conflicto (no se sobrescribe sin decisión; Q11).
3. **Vista previa (dry-run)** con totales: registros, abiertas, hechas, con fecha límite, rango de fechas.
4. **Respaldo previo** de las tareas actuales de la persona y **reversión** del lote (borrado lógico de lo creado con `ImportBatchId`).
5. **Integridad:** comparar totales origen/destino (cantidad, abiertas/hechas, con/sin fecha límite) y los 9 campos por registro.
6. **No** ejecutar la reprogramación 5.5 durante la importación: los datos entran tal cual; la regla actúa después como en la app.

### 9.5 Archivo de ejemplo (sintético, sin datos personales)
Con «hoy» = 2026-10-18:
```json
[
 {"id":"7d1f3a52-9c40-4e6b-8a17-2b5c0e9d4f01","title":"Llamar al banco","details":"","scheduledDate":"2026-10-18","priority":"HIGH","colorHex":"#F6DDCE","dueDate":"","completed":false,"createdAt":1792278000000},
 {"id":"a3c8e2b9-51d7-4f06-9b3e-6e1a7c2d8f02","title":"Enviar informe mensual","details":"","scheduledDate":"2026-10-15","priority":"MEDIUM","colorHex":"#DCEAF4","dueDate":"2026-10-20","completed":false,"createdAt":1792022400000},
 {"id":"5e9b0c47-2a8d-4d13-a6f5-3c7b1e0a9d03","title":"Ordenar el escritorio","details":"","scheduledDate":"2026-10-16","priority":"LOW","colorHex":"#E5EDC8","dueDate":"","completed":false,"createdAt":1792108800000},
 {"id":"c2406d8e-7b1f-4a95-8e2c-9d5f3a1b6e04","title":"Pagar el recibo de agua","details":"","scheduledDate":"2026-10-14","priority":"HIGH","colorHex":"#F5E9B9","dueDate":"2026-10-16","completed":true,"createdAt":1791936000000},
 {"id":"e81a5f30-6c9d-4b27-b4a8-1f2e7d0c5a05","title":"Revisar presupuesto","details":"Incluye ajustes de septiembre","scheduledDate":"2026-10-20","priority":"MEDIUM","colorHex":"#D4E9E1","dueDate":"2026-10-17","completed":false,"createdAt":1792300000000}
]
```
**Totales esperados tras importar:** 5 registros; 4 abiertas y 1 hecha; 3 con fecha límite (una hecha); 9 campos íntegros por registro.
**Resultado esperado en pantalla (regla de la app):**
- Vencidas: «Ordenar el escritorio» (16 oct, sin límite) y luego «Revisar presupuesto» (límite 17 oct, aunque su día asignado es el 20). «Enviar informe mensual» **no** (límite vigente).
- Fechas límite: «Revisar presupuesto» (VENCIDA, 17 oct) y «Enviar informe mensual» (20 oct). «Pagar el recibo de agua» no aparece (hecha con límite pasado).
- Tras la primera reconciliación: «Enviar informe mensual» pasa a 2026-10-18.
- Archivo corrupto de prueba: la misma lista con la coma entre dos registros eliminada → error claro y **cero** registros importados.

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

### 10.3 Textos y tono
Todo el texto está fijo en Kotlin, en español, con tono **cálido, calmado y sin culpa** («Tus días, con calma.», «Ajusta los detalles a tu ritmo.»). Eso debe conservarse. Pero usa **tuteo** («Puedes», «Elige», «Desliza», «¿Qué necesitas hacer?», «Vas al día»), y Pastel exige **usted o forma impersonal, sin voseo ni tuteo** (`AGENTS.md`; `DESIGN_SYSTEM.md` §8) y textos en `strings.ts`. Hay que reescribir los textos antes de portarlos. Ejemplos (propuesta, el texto final lo define UX):

| Actual | Propuesta impersonal |
|---|---|
| Tus días, con calma. | Los días, con calma. |
| Dale un lugar en tu día. | Asigne un lugar en el día. |
| ¿Qué necesitas hacer? | ¿Qué hay que hacer? |
| Puedes mover cualquier tarea a otro día sin perder sus detalles. | Cualquier tarea se puede mover a otro día sin perder sus detalles. |
| Vas al día / No tienes tareas pendientes de días anteriores. | Al día / No hay tareas pendientes de días anteriores. |
| Elige un día para ver sus pendientes. | Elija un día para ver sus pendientes. |
| Desliza para explorar cada día | Deslice para explorar cada día |
| No podrás recuperarla después de eliminarla. | La tarea no se podrá recuperar después de eliminarla. |

**Inventario de textos visibles** (para `strings.ts`): cabecera «Brisa» / «N pendientes»; pestañas Semana, Mes, Vencidas, Fechas límite; «Nueva tarea»; Semana: «Tu semana», «N por hacer · M hechas», «Ir a hoy», «Un día atrás/adelante», «HOY», «N tarea(s)», «Sin tareas», «HECHAS», «Límite d MMM»; Mes: «Tu calendario», «Mes anterior/siguiente», letras `L M X J V S D`; Vencidas: «Pendientes atrasados», «Todo al día», «PROGRAMADA PARA»; Fechas límite: «Fechas límite», «Las fechas más próximas aparecen primero.», «FECHA LÍMITE», «VENCIDA/Vencida», «Hecha», «Sin fechas límite», «Cuando una tarea tenga fecha límite, aparecerá aquí en orden de vencimiento.»; editor: «Una nueva tarea/Tu tarea», «Notas (opcional)», «DÍA ASIGNADO», «PRIORIDAD» (Baja/Media/Alta), «COLOR DE LA TARJETA», «Añadir fecha límite», «Sin fecha límite», «Marcar como hecha/pendiente», «Guardar», «Cancelar», «Guardar fecha», «¿Eliminar esta tarea?», «Conservar», «Eliminar». Fechas con configuración regional `es-CR` («Sábado 17 de octubre», «17 oct»).

---

## 11. Casos de paridad

«Hoy» = 2026-10-18 (domingo) salvo indicación. `P` = día asignado, `L` = fecha límite. Estado: **P** = replicar tal cual; **D** = comportamiento actual discutible, el propietario decide (§12). Los resultados salen del código, no de la ficha de migración.

| ID | Entrada | Comportamiento esperado | Estado |
|---|---|---|---|
| C01 | Día 10-18 con 4 abiertas: A Baja (creada 1.º), B Alta (3.º), C Alta (2.º), D Media (4.º) | Orden: C, B, D, A (prioridad ↓, antigüedad ↑) | P |
| C02 | Día 10-18 con abierta A y hechas X Media (5.º), Y Alta (6.º), Z Alta (7.º) | Abiertas: A. Sección «HECHAS»: Z, Y, X (prioridad ↓, creación ↓). | P |
| C03 | Abierta, `P=10-17`, `L=null` | Aparece en Vencidas («PROGRAMADA PARA Sábado 17 de octubre»); sigue en la columna del 17; no se reprograma | P |
| C04 | Abierta, `P=10-18`, `L=null` | No está en Vencidas; aparece en el día «HOY» | P |
| C05 | Abierta, `P=10-20`, `L=10-17` | Vencidas (muestra «Martes 20 de octubre» y «Límite 17 oct»); Fechas límite como «VENCIDA» («Sábado 17 de octubre») | P/D (Q7) |
| C06 | Abierta, `P=10-15`, `L=10-20`; se abre la app | `P` pasa a 10-18; no está en Vencidas; aparece en HOY y en Fechas límite (20 oct) | P |
| C07 | Abierta, `P=10-16`, `L=10-18`. Luego pasa un día (hoy = 10-19) sin completarla | Hoy 10-18: `P` pasa a 10-18, sin vencida. Hoy 10-19: `P` queda en 10-18 (`L < hoy`), aparece en Vencidas y como «VENCIDA» en Fechas límite | P |
| C08 | Hecha, `P=10-15`, `L=10-20` | No se reprograma (queda en HECHAS del 15); no está en Vencidas; en Fechas límite al final con «Hecha» | P |
| C09 | Hecha, `P=10-14`, `L=10-16` | No aparece en Fechas límite ni en Vencidas; sí en HECHAS del 14 y en el contador del mes | P |
| C10 | Hecha, `P=10-14`, `L=10-25`; «Marcar como pendiente» | Queda abierta; **sigue en el 14** hasta el siguiente `ON_RESUME`/receptor, luego pasa a 10-18 | D (D-1) |
| C11 | Hecha, `P=10-14`, `L=null`; «Marcar como pendiente» | Abierta y de inmediato en Vencidas | P |
| C12 | Abierta, `P=10-18`, `L=10-25`; se edita `P` a 10-10 y se guarda | Se guarda 10-10; en el siguiente `ON_RESUME` vuelve a 10-18 sin aviso | D (U9) |
| C13 | Crear `P=10-18`, `L=10-10` | Se guarda sin error; aparece de inmediato en Vencidas y también en HOY | D (U9) |
| C14 | Foco 10-18; título «  Comprar pan  », nada más; Guardar | Tarea: título «Comprar pan», notas vacías, `P=10-18`, prioridad Media, sin límite, abierta, color de la paleta (aleatorio), id nuevo, `createdAt` = ahora | P |
| C15 | Título «   » (solo espacios) | «Guardar» (y «Marcar como hecha») deshabilitados; no se crea nada | P |
| C16 | «+» de la columna 10-21 | Editor con día 10-21; el foco pasa a 10-21 (columnas 19…25 oct) | P |
| C17 | Foco 10-18 → «Siguiente» | Columnas 16…22 oct; tras «Siguiente»: foco 10-19, columnas 17…23 oct; «Ir a hoy» vuelve a 10-18. El resumen «N por hacer · M hechas» cuenta solo tareas con `P` dentro de la ventana | P |
| C18 | 3 abiertas (una vencida, otra con `P=10-30`) y 2 hechas | Cabecera: «3 pendientes» (todas las abiertas) | P/D (U11) |
| C19 | Mes octubre 2026 (el 1 es jueves) | 3 celdas vacías antes del 1, 31 días, 35 celdas (1 vacía al final); día con 12 tareas → insignia rellena «12»; con 100 → «99+»; tocar el 20 → foco 10-20 y pestaña Semana con columnas 18…24 oct | P |
| C20 | Mes febrero 2028 | 1 celda vacía antes del 1 (martes), 29 días, 35 celdas | P |
| C21 | Abiertas: V1 `P=10-15` Baja sin `L`; V2 `P=10-20`, `L=10-14` Media; V3 `P=10-15` Alta sin `L`; V4 `P=10-12`, `L=10-15` Media | Orden en Vencidas por `(L ?? P)` ↑ y prioridad ↓: V2, V3, V4, V1 | P |
| C22 | Abiertas: F1 `L=10-17` Baja; F2 `L=10-20` Alta; F3 `L=10-20` Baja; F4 `L=10-19` Media. Hecha: F5 `L=10-19` | Orden en Fechas límite: F1, F4, F2, F3, F5 (abiertas antes que hechas) | P |
| C23 | Abierta, `P=10-18`, `L=10-18` | Sin cambios; en Fechas límite con «FECHA LÍMITE» (no vencida); no está en Vencidas | P |
| C24 | Eliminar una tarea: papelera → «Conservar» y luego «Eliminar» | «Conservar» la deja intacta; «Eliminar» la quita de todas las vistas y contadores, sin deshacer (en la web, borrado lógico con el mismo resultado visible) | P |
| C25 | Dispositivo en Costa Rica; pasa de 2026-10-18 23:59 a 00:00 del 19. T1 `P=10-18`, `L=10-21`; T2 `P=10-18`, `L=null`; ambas abiertas | El receptor deja T1 en `P=10-19`; T2 no cambia. Al abrir la app (hoy 10-19), T2 está en Vencidas («PROGRAMADA PARA Domingo 18 de octubre») | P |
| C26 | **Frontera de zona:** son las 23:30 del 18 en Costa Rica (= 05:30 UTC del 19). Tarea abierta `P=10-18`; otra `P=10-19` | «Hoy» = 10-18: la primera está en HOY y **no** en Vencidas; la segunda es «mañana». A las 00:00 CR del 19 (06:00 UTC) «hoy» pasa a 10-19. Un servidor en UTC debe dar el mismo resultado usando la zona de la persona | P |
| C27 | Dispositivo cambia de UTC-6 a UTC+1 a las 22:00 CR del 18 (allí ya es 05:00 del 19) | `TIMEZONE_CHANGED` → hoy = 10-19 → se reconcilia como en C25 (solo Android; en la web «hoy» sigue la zona configurada, Q4) | D |
| C28 | Cerrar y reabrir la app | Las tareas se conservan; vuelve a la pestaña Semana con foco = hoy; el tema vuelve a claro | P/D (U6) |
| C29 | Datos locales con: registro sin título; otro con `scheduledDate` «2026-13-40»; otro con prioridad «URGENT»; otro sin `colorHex`; otro con `dueDate` «xx» | La app descarta los dos primeros; los siguientes se leen como prioridad Media, color `#DDE8D5` y `dueDate = null`. **La importación web no hereda esto:** rechaza el lote (§9.4) | P (solo lectura de datos viejos) |
| C30 | Ejecutar la reprogramación dos veces el mismo día | Segunda ejecución sin cambios (idempotente) | P |
| C31 | Editar una tarea existente y guardar | Sigue habiendo una sola con ese `id`; `createdAt` no cambia; conserva `completed` (salvo que se use el botón de estado) | P |
| C32 | Exactamente 1 tarea abierta | Texto actual «1 pendientes» (cabecera) y «1 hechas»; «tarea/tareas» sí pluraliza | D (U11): se espera corrección aprobada |

---

## 12. Riesgos y preguntas abiertas para el propietario

### Riesgos
| # | Riesgo | Evidencia |
|---|---|---|
| R1 | Receptor y `ViewModel` usan instancias distintas del repositorio; el estado en memoria puede quedar desactualizado y sobrescribir cambios (efecto leve por idempotencia). | `DailyTaskRolloverReceiver`, `TasksViewModel` |
| R2 | JSON corrupto → lista vacía → la siguiente escritura borra todo; registros inválidos se pierden en silencio. | `LocalTaskRepository.readTasks` |
| R3 | «Hoy» no se actualiza con la app abierta pasada la medianoche. | `BrisaApp › DisposableEffect` |
| R4 | No existe exportación: **sin acción del propietario no hay forma práctica de extraer datos reales** (§9.1). | búsqueda en el código |
| R5 | `colorHex` no se valida; un valor inválido haría fallar `Color.parseColor` al dibujar (**Suposición**: lanza `IllegalArgumentException`). Solo alcanzable con datos manipulados o importados sin validar. | `BrisaColors.TaskCard`, `pastelColor` |
| R6 | La ficha `BRISA.md` (prueba 5) supone tareas «para las 23:30»; Brisa **no tiene hora**. Riesgo de construir un campo inexistente o de probar un caso que no aplica. | `TaskItem` |
| R7 | La reprogramación borra el día original; al migrar no se podrá reconstruir. | `rollForwardDeadlineTasks` |
| R8 | Formatos de fecha en `es-CR` por Java (`Locale("es","CR")`) pueden diferir de `Intl` en el navegador (p. ej. abreviaturas de mes con o sin punto) (**Suposición**). | `formatCompactDate`, `formatFullDate` |
| R9 | README desactualizado (versiones), wrapper no estándar y cobertura de pruebas mínima (solo lógica pura); la paridad depende de este inventario. | §1 |
| R10 | Receptor `exported="true"` y `allowBackup="true"` sin reglas (**Suposición**: bajo riesgo hoy; no aplica a la web). | `AndroidManifest.xml` |

### Preguntas abiertas
1. **Q1.** ¿Confirma que `leandro-mc/brisa-android` (`main`) es el proyecto «Brisa» y que no existe otra versión (p. ej. con Room) en otra rama o repositorio?
2. **Q2.** ¿Hay datos reales que migrar (cuántas personas, dispositivos y tareas)? ¿Autoriza añadir «Exportar respaldo» a la app Android (§9.1a), único camino práctico hoy?
3. **Q3 (D-1).** Reprogramación automática: ¿**derivada** (opción A, recomendada para sincronizar) o **persistida** (B, paridad estricta)? (§7.3)
4. **Q4.** Zona horaria: ¿fija `America/Costa_Rica` o configurable por persona? ¿«Hoy» usa siempre esa zona aunque el navegador esté en otra?
5. **Q5.** Prueba 5 de `BRISA.md`: ¿se corrige la ficha (el caso equivalente sin hora es C26) o se quiere **agregar hora** (cambio de alcance, fuera de paridad)?
6. **Q6.** Defectos actuales (U1–U13): ¿cuáles se corrigen como cambio aprobado? Sugerencia: corregir sin discusión textos (usted/impersonal), singular, tema persistente y accesibilidad; decidir U1 (marcar hecha desde la tarjeta), U2 (fecha del botón flotante) y U7.
7. **Q7.** ¿Una tarea con fecha límite vencida sigue en Vencidas aunque se mueva su día (C05, C13)? ¿Se valida `L ≥ P` al guardar?
8. **Q8.** Límites: longitud de título y notas, y máximo de tareas por persona (hoy sin límite).
9. **Q9.** Importación: ¿prioridad desconocida se rechaza (propuesto) o se tolera como Media, como hace la app?
10. **Q10.** Color: ¿se guarda el hex o la **clave** del color (para ajustar en oscuro)? ¿Los colores fuera de la paleta se aceptan o se mapean a Salvia?
11. **Q11.** Reimportar un `Id` ya existente con contenido distinto: ¿omitir, sobrescribir o informar?
12. **Q12.** ¿Se agrega `CompletedAt` (no existe hoy)? ¿Se ofrece deshacer/papelera (la app no)?
13. **Q13.** ¿Se conserva la paleta de 10 colores y el color aleatorio al crear?
14. **Q14.** Textos: ¿aprueba reescribirlos a usted/impersonal manteniendo el tono cálido (§10.3)?
