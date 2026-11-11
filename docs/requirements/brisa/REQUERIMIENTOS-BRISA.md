# Brisa — Requerimientos v3 (migración de la app Android a Pastel)

> **Estado:** propuesta para validación del propietario · **Rama:** `research/requirements-and-prototypes` · **Fecha:** 2026-11-09
> **Prototipo:** [`prototype/`](prototype/index.html) — el carrusel de 7 días que el propietario aprobó, con roles, tema Auto/Claro/Oscuro, reloj simulado y estados (datos de **ejemplo**).
> **Fuente funcional:** [`INVENTARIO-BRISA.md`](INVENTARIO-BRISA.md) (app Android actual + decisiones del propietario en su §13, que **prevalecen**). Este documento no las reabre: las ordena en requerimientos con identificador y dice cómo se prueba cada una. Investigación: [`INVESTIGACION-BRISA.md`](INVESTIGACION-BRISA.md).

---

## 0. Resumen ejecutivo

**Qué es Brisa.** Una app **personal** para llevar los pendientes del día a día sin presión: cada tarea tiene un **día**, se ve en un **carrusel de 7 días**, y lo que se atrasa se acomoda solo mientras su fecha límite siga vigente. Ya existe como app Android (`com.brisa.todo`); aquí se define su versión web dentro de Pastel.

**Decisión de diseño de esta iteración: no se rediseña.** El propietario aprobó el prototipo del carrusel («me gusta mucho»). Se **conserva** su identidad (salvia y pasteles, tarjetas de color, trato cálido) y se le agrega solo lo que el método exige y le faltaba: qué ve cada persona según su situación, tema que sigue al sistema, estados vacíos/de error y una forma de **probar el paso de los días**.

**Lo que se agregó al prototipo (v3):**
1. **Barra de desarrollo con 5 roles/situaciones:** persona con acceso (datos de ejemplo), persona nueva (sin tareas), con sesión pero **sin acceso a Brisa** (403), **sin sesión** (401) y **error de carga**. Cada estado explica qué pasó y qué hacer; ninguno muestra tareas ajenas.
2. **Reloj simulado** (‹ Día · Hoy real · Día ›): permite ver, sin esperar a medianoche, cómo una tarea con fecha límite vigente **avanza sola** y cómo se vuelve «Vencida» el día siguiente a su límite.
3. **Tema Auto / Claro / Oscuro:** sin elección, sigue al sistema; la elección se recuerda (§13.6 y §13.7 del inventario).
4. **Lógica de fechas separada y probada** ([`prototype/logic.js`](prototype/logic.js)): los vectores V1–V10 y los criterios AC1–AC7 del inventario se ejecutan como pruebas (39 comprobaciones) y la interfaz se prueba por rol (27).
5. **Primera vez con un solo paso** («Empieza con una sola tarea»), coherente con el principio de alta rápida.

**Hallazgos de la v3 (detalle en `../DECISIONES-Y-HALLAZGOS.md`):**
- **Contraste real:** en el tema oscuro, 7 de las 10 tarjetas pastel quedaban entre **4,34 y 4,49:1** con el texto general y el texto secundario bajaba de 4,5:1. Se corrigió **solo dentro de la tarjeta** (texto `#f7f8f5`, secundario `#eceff1`) conservando la mezcla al 36 % de Android. Para producción requiere un token (CCR) o bajar la mezcla al 28 %.
- **Singular pendiente:** el contador decía «1 hechas»; ahora «1 hecha» (§13.8, Q23).
- **Un defecto de arranque encontrado al probar:** si «hoy» no existe cuando se cargan las tareas de ejemplo, las fechas salen inválidas. Quedó cubierto por una prueba (el orden de arranque importa).

---

## 1. Diagnóstico de la app actual

**Se conserva (patrones que funcionan, inventario §10.1):** una sola idea por pantalla; el día como unidad; tarjetas de color con prioridad en punto **y** texto; «Vas al día» en lugar de listas rojas; alta con un solo dato (prioridad Media, color aleatorio, sin fecha límite).

**Se corrige** (inventario §10.2 y §13.6; el número «U» es el del inventario): marcar hecha en un toque (U1), botón flotante que crea para hoy (U2), confirmar al cerrar solo si hay texto (U3), foco en el título y «Enter» guarda (U4), pestaña y día enfocado sobreviven a recargar (U5), tema persistente (U6), dos criterios de «Vencida» explícitos (U7), accesibilidad y nombres legibles (U10), singular correcto (U11).

**No aprobado / aplazado por el propietario:** deshacer, recordatorios y notificaciones. No se prototipan.

---

## 2. Investigación aplicada (fuentes en [`../research/FUENTES.md`](../research/FUENTES.md); notas en [`../research/NOTAS-BRISA-BALANCE-V3.md`](../research/NOTAS-BRISA-BALANCE-V3.md))

| Hallazgo | Confianza | Decisión que provoca |
|---|---|---|
| Asignar **cuándo** se hará algo (plan «cuándo/dónde») aumenta de forma consistente que se haga: meta-análisis de 94 pruebas, efecto medio d≈0,65 | A | Cada tarea tiene un **día asignado** visible; el carrusel es el plan. La evidencia es de planes «si–entonces»; el día es solo el componente «cuándo»: **hipótesis**, no garantía |
| Las apps de tareas que acumulan «vencidas» en rojo se abandonan por culpa (testimonios de quienes las construyen y usan) | C | «Vencidas» es una pestaña propia, con tono «Pendientes atrasados», sin alarmas ni contadores rojos; «Vas al día» cuando está vacía (ya decidido en §13.8) |
| Escribir un plan para una tarea pendiente reduce su carga mental (Masicampo y Baumeister, 2011; **no recuperado en esta sesión: verificar**) | B | Alta con un solo dato: anotar es barato y ya alivia |

Detalle y límites en la investigación. Lo de arriba **respalda** decisiones del propietario; no las cambia.

---

## 3. Actores y empatía

Brisa es **personal**: no hay roles de operación. Lo que cambia es la **situación de la persona** (todas con la misma interfaz cuando entran):

| Situación (rol de la barra) | Qué ve | Qué NO ve |
|---|---|---|
| Persona con acceso | Sus tareas: Semana, Mes, Vencidas, Fechas límite, Importar, Configuración | Nada de otras personas (no existen en el producto) |
| Persona nueva | Semana vacía + «Empieza con una sola tarea» | Datos de ejemplo |
| Con sesión, sin acceso a Brisa | Por qué no entra y a quién pedirlo (403) | Ninguna tarea |
| Sin sesión | «Inicia sesión para ver tus días» (401) | Ninguna tarea |
| Error de carga | «No pudimos cargar tus tareas… están a salvo» + Reintentar | Pantalla vacía sin explicación |

Los permisos reales (`brisa.access`, `brisa.items.manage`) y que cada persona solo ve lo suyo están en el inventario §5 y la ficha del módulo. Personas simuladas y sus necesidades: [`INVESTIGACION-BRISA.md`](INVESTIGACION-BRISA.md) §4.

---

## 4. Principios

1. **Un día a la vez.** La unidad es el día; el carrusel muestra una semana sin abrumar.
2. **Sin culpa.** Lo atrasado se nombra con calma, se puede mover a otro día sin perder detalles y desaparece cuando se resuelve.
3. **Alta con un solo dato.** Escribir el título basta.
4. **Lo que se mueve solo, se mueve por regla y se puede explicar** (§13.1). Nada se reescribe en silencio: el día asignado se conserva; el que se muestra se **calcula**.
5. **Nunca solo color.** Prioridad = punto **y** texto; estado = icono **y** texto.
6. **Cada situación tiene salida.** Sin acceso, sin sesión o con error: se explica y se ofrece el siguiente paso.

---

## 5. Experiencia (pantallas)

### 5.1 Estructura
Cabecera de Pastel (Aplicaciones › Brisa, búsqueda, tema, configuración) + barra lateral (Semana, Mes, Vencidas con contador, Fechas límite · Importar tareas, Configuración); en móvil, navegación inferior. Botón «Nueva tarea».

### 5.2 Semana (carrusel de 7 días)
Siete columnas con **HOY** marcado y el día enfocado resaltado; cada día muestra **abiertas** y, aparte, **HECHAS**. «+» en el encabezado de cada día crea para ese día. Chips «N por hacer · M hechas · K en total». Se recorre con rueda, flechas, arrastre o teclado.

### 5.3 Mes · Vencidas · Fechas límite
**Mes:** cuadrícula L M X J V S D con conteo por día. **Vencidas** («Pendientes atrasados»): orden por (fecha límite o día efectivo) y prioridad; cada tarjeta dice «PROGRAMADA PARA». **Fechas límite:** abiertas antes que hechas, por vencimiento; «VENCIDA» solo si lo está.

### 5.4 Editor y búsqueda
Diálogo con foco en el título; «Enter» guarda; notas con contador; día asignado, fecha límite opcional, prioridad, 10 colores; validaciones con el mensaje de Brisa. Búsqueda discreta en la cabecera: título y notas, sin distinguir tildes.

### 5.5 Importar · Configuración
Importar JSON con vista previa y reversión; configuración: tema (**Del sistema**, Claro, Oscuro), tamaño de texto, zona horaria, restablecer demo.

### 5.6 Estados (nuevo en v3)
Primera vez, sin sesión, sin acceso, error de carga (ver §3). Todos con una acción principal.

---

## 6. Requerimientos funcionales

| ID | Requerimiento | Origen | Prioridad | Cómo se prueba |
|---|---|---|---|---|
| **BR-01** | **Reprogramación diaria derivada:** el día efectivo se calcula (abierta → hoy mientras la fecha límite lo permita; hecha → día de `CompletedAt`); `ScheduledDate` no se reescribe | Inventario §13.1 | Obligatorio | `logic.test.js`: V1–V10, AC1–AC7 (barrido de 60 días) |
| **BR-02** | **Dos criterios de «Vencida»** (con límite: límite pasado; sin límite: día efectivo pasado) y órdenes de Vencidas y Fechas límite | §13.2, §5.3 | Obligatorio | C03–C11, C21, C22 |
| **BR-03** | **Día ≤ fecha límite** al crear, modificar e importar, con mensaje «El día de la tarea no puede ser después de su fecha límite…» | §13.2 | Obligatorio | N08, N26–N28; UI |
| **BR-04** | **Alta rápida:** solo el título; prioridad Media, color aleatorio, sin límite | §13.6 | Obligatorio | UI: «Comprar pan» → HOY, MEDIA |
| **BR-05** | Botón flotante crea para **hoy**; «+» de cada día crea para ese día | §13.6 (Q15) | Obligatorio | UI |
| **BR-06** | **Marcar hecha con un toque** desde la tarjeta | §13.6 (Q6) | Obligatorio | UI |
| **BR-07** | **Búsqueda** en título y notas, sin tildes ni mayúsculas, solo tareas propias no eliminadas | §13.6 | Obligatorio | N17; UI |
| **BR-08** | Editor: foco en el título, «Enter» guarda, cierre con confirmación **solo si hay texto** | §13.6 (Q16, Q17) | Obligatorio | UI |
| **BR-09** | **Zona horaria por persona** (IANA, inicial `America/Costa_Rica`): «hoy» y medianoche salen de ella | §13.3 | Obligatorio | C26/N19/N21 |
| **BR-10** | Límites: título ≤ 150, notas ≤ 2000, sin truncar en silencio | §13.4 | Obligatorio | N18 |
| **BR-11** | `CompletedAt` lo asigna el servidor; `NULL` al reabrir; importadas hechas → `NULL` | §13.5 | Obligatorio | V9, V10 |
| **BR-12** | **Tema Auto/Claro/Oscuro:** sin elección sigue al sistema; la elección persiste | §13.6, §13.7 | Obligatorio | UI: alternar y volver a Auto |
| **BR-13** | **Texto ampliable** y objetivos táctiles según `DESIGN_SYSTEM.md` | §13.6 (U10) | Obligatorio | UI: Configuración |
| **BR-14** | **Importación** con validación estricta, vista previa y reversión | §13.9 | Obligatorio | UI: JSON dañado y de ejemplo |
| **BR-15** | **Estados por situación:** primera vez, sin sesión (401), sin acceso (403, con «a quién pedirlo»), error de carga con «Reintentar» | Método (L: cada situación tiene salida) | **Nuevo en v3** | `t-brisa.js` |
| **BR-16** | **Singular correcto** («1 hecha», «1 pendiente») | §13.8 (Q23) | Obligatorio | N24; UI |
| **BR-17** | **Trato de tú, tono cálido y sin culpa** también en textos nuevos | §13.8 (Q14, CCR-1) | Obligatorio | UI: sin «usted» |
| **BR-18** | Reloj de desarrollo (solo prototipo; **no es del producto**) | Método | Solo prototipo | — |

---

## 7. Reglas de fechas (resumen de §13.1; «hoy» = 18)

| Caso | Día asignado | Límite | Día efectivo | ¿Vencida? |
|---|---|---|---|---|
| V1 | 15 | — | 15 | Sí (sin límite, su día pasó) |
| V2 | 15 | 20 | **18** (avanza) | No |
| V3 | 15 | 18 | 18 | No |
| V4 | 15 | 17 | 17 | **Sí** |
| V5 | 20 | 25 | 20 | No |
| V6 | 20 | 17 | 20 (inválida: se rechaza al guardar) | — |
| V7 / V8 | 15 | 20 | día en que se marcó hecha (18 / 16) | No |
| V9 | 15 | 20 | 15 (`CompletedAt` desconocido) | No |
| V10 | 15 | — | 15 | No (hecha) |

Frontera de zona (C26): 23:30 del 18 en Costa Rica es 05:30 UTC del 19; «hoy» sigue siendo 18.

---

## 8. Modelo de datos (delta)

Sin cambios respecto al inventario §4 y §13: `ScheduledDate` y `DueDate` son `date` sin zona; `CreatedAt`, `CompletedAt`, `UpdatedAt` son `timestamptz` UTC; `TimeZoneId` por persona; títulos y notas con los límites de §13.4. **Nada se persiste para el día efectivo** (se calcula). No se agregó ningún campo en esta iteración.

---

## 9. No funcionales

- **Rendimiento:** el día efectivo se calcula en memoria al renderizar; sin tareas programadas ni escrituras nocturnas.
- **Accesibilidad:** AA en claro y oscuro (medido: `prototype-tests/contrast.py`, 215 pares en total, 121 de Brisa y Balance); objetivos de 44 px; foco visible; nombres accesibles legibles.
- **Datos:** cada persona solo accede a lo suyo; sin datos personales en la URL.
- **Sin conexión / sincronización:** diseño propuesto en el inventario §7.3 (no se prototipa).
- **Textos:** español de Costa Rica, tuteo cálido (excepción del propietario).

---

## 10. Riesgos

| Riesgo | Mitigación / estado |
|---|---|
| **Contraste de tarjetas oscuras** (hallazgo v3) | Corregido en el prototipo dentro de la tarjeta; en producción: token nuevo vía CCR o mezcla al 28 % |
| **Tareas que «viajan» semanas sin avisar** pueden normalizar la postergación | Es regla aprobada (§13.1). Hay una **propuesta sin aprobar** en §14 (indicador discreto de días acumulados); la evidencia es débil (C) y puede aumentar la culpa: decide el propietario |
| **Arranque dependiente del orden** (fechas inválidas si «hoy» no existe) | Cubierto por prueba; en el producto «hoy» viene del servidor/zona de la persona |
| **Tipografía:** el prototipo usa la pila del sistema (Inter si está instalada) | Se conserva por ser parte de lo aprobado; la regla anti-genérico del método sugiere revisarla (§14) |
| **Medianoche con la app abierta** | La vista se recalcula cada 30 s; el reloj simulado lo demuestra |

---

## 11. Dirección visual

**Se conserva la aprobada.** Fondo `#F7F6F0`, superficie `#FFFEFA`, acento salvia `#315B4A`, texto `#26342E`; 10 colores de tarjeta; claro idéntico a Android (salvo dos oscurecidos para AA: texto secundario `#57605A`, error `#904B3C`); oscuro con los tokens de Pastel. Todo detallado en el inventario §13.7. Cambios de v3: `light-dark` no se usó (se conservó el esquema por `data-theme`), se añadió el espejo **Auto** por `prefers-color-scheme` y el ajuste del texto de las tarjetas oscuras.

---

## 12. Métricas (sin vanidad)

Tareas creadas con solo el título (≥ 80 %); tiempo desde abrir hasta crear la primera tarea (< 20 s); proporción de «Vencidas» que se **resuelven o se mueven** en 7 días (no cuántas hay); abandono tras la primera semana; uso de «Marcar hecha» desde la tarjeta vs desde el editor. **No** medir «racha» ni tiempo en la app.

---

## 13. Qué demuestra el prototipo (y qué no)

**Demuestra:** el carrusel aprobado funcionando; la regla de reprogramación con reloj simulado; las validaciones y mensajes; búsqueda, tema, importación; los 5 estados por situación.
**No demuestra:** persistencia real, sincronización, zona horaria con horario de verano en navegador real, ni apariencia en dispositivos (revisión visual del propietario).

---

## 14. Preguntas abiertas

1. **Tipografía:** ¿se mantiene la pila actual (conserva lo aprobado) o se elige una con más identidad? Efecto: bajo.
2. **Días acumulados:** ¿un indicador discreto «aquí desde el 15 oct» en tarjetas que ya avanzaron varios días? Ayuda a ver patrones; puede sumar culpa.
3. **Contraste oscuro de tarjetas:** ¿token nuevo (CCR) o mezcla al 28 %?
4. **Deshacer** tras marcar o eliminar: no aprobado; ¿se pide?
5. **Primera vez:** ¿se ofrece un tour de 3 pasos o el banner único es suficiente?
