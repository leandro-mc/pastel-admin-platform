# Brisa — ficha de migración

Color `data-module="brisa"` (verde) · icono `ListChecks` · esquema `brisa` · ruta `/brisa` · API `/api/brisa`.

## 1. Situación
Brisa organiza los pendientes del día a día. **Existe como aplicación Android** (con su propio almacenamiento local). Se migra a Pastel como módulo web **conservando su comportamiento**. Más adelante la aplicación Android se conectará al backend para funcionar con y sin internet con sincronización: **no se implementa ahora**, pero el diseño debe dejarlo preparado.

Este documento no redefine sus funcionalidades: el **inventario del proyecto actual** (`docs/migration/brisa-inventory.md`, lo produce un agente de investigación antes de la migración) es la fuente de verdad funcional. Las decisiones del propietario de su §13 prevalecen sobre la descripción de la app actual.

## 2. Roles y permisos
Inicial: `brisa.access` (usar el módulo) y `brisa.items.manage` (sobre **sus propios** datos). Cada persona ve solo sus pendientes. Rol sugerido `Brisa — Usuario`. Cualquier concepto de compartir o grupos que exista en la app actual se anota en el inventario; **no se agrega nada nuevo** sin decisión del propietario.

## 3. Principios de la migración
1. **Paridad primero:** misma funcionalidad y reglas; cualquier cambio de comportamiento se registra aparte y se decide con el propietario (los aprobados están en el inventario §13.0).
2. **Preparado para sincronización (sin implementarla):**
   - Identificadores `Guid` v7 generados por el cliente; creación idempotente.
   - `UpdatedAt`, borrado lógico (`DeletedAt`) y token de concurrencia en cada entidad.
   - Endpoints de lectura incremental (`?updatedSince=`) y escritura por lotes diseñables después; documentar el modelo de conflicto propuesto (último cambio gana por campo, o por entidad) en un ADR, sin construir el motor.
3. **Datos del usuario:** estrategia de importación desde la base o exportación de la app Android (formato a definir en el inventario), con respaldo, validación de integridad y reversión.
4. **Interfaz:** adopta el sistema de diseño de Pastel (componentes del kit) con las reglas propias de la sección 7; respeta los patrones de uso rápido que la app actual ya ofrece (alta veloz de pendientes, marcar como hecho, filtros del día).
5. **Pruebas de regresión** sobre los flujos esenciales antes de dar la migración por terminada.

## 4. Pasos de la migración
1. Leer el inventario (pantallas, flujos, entidades, reglas, recordatorios/notificaciones, almacenamiento, permisos).
2. Diseñar el esquema `brisa` y el contrato de API (documentar en `MODULE.md`).
3. Implementar backend por slices y el frontend por pantallas, en ese orden de uso (lista del día primero).
4. Herramienta de importación y pruebas con datos de ejemplo.
5. Validación con el propietario contra la app actual (lista de comprobación de paridad).

## 5. Fuera de este alcance
Conexión de la app Android, sincronización sin conexión, notificaciones push, recordatorios por WhatsApp o correo, compartir pendientes entre personas (salvo que ya exista), «Deshacer» y recordatorios (aplazados).

## 7. Reglas propias de Brisa (prevalecen sobre las generales)
Brisa es una app personal con identidad propia. Por `AGENTS.md` («Jerarquía de reglas»), lo siguiente prevalece sobre las reglas generales de Pastel. Siguen aplicando seguridad, fronteras entre módulos, errores y logs, WCAG 2.2 AA y las prohibiciones de morado y símbolos de IA.

1. **Tono y textos:** tuteo, cálido, calmado y sin culpa, igual que la app original («Tus días, con calma.», «Dale un lugar en tu día.», «Vas al día»). Se conservan los textos originales (lista exacta en el inventario §13.8) y los textos nuevos usan el mismo tono. Sin voseo. Autorizado según `docs/DESIGN_SYSTEM.md` §8.
2. **Tema claro propio**, idéntico al de la app Android salvo dos valores ajustados a AA. Se registra como tokens bajo `data-module="brisa"` en `web/src/core/design/module-themes.css` (nombres a criterio de Dev):
   - Fondo `#f7f6f0` · superficie `#fffefa` · borde `#e2e6de` · texto `#26342e`.
   - Texto secundario (`--muted`) `#57605a` (Android `#77837b`; ajustado a AA, 4,7:1 en el peor caso).
   - Acento y botones (`--accent`, `--accent-strong`) `#315b4a` · texto sobre acento `#ffffff` · fondo suave (`--accent-soft`) `#e6eee5`.
   - Error y «Vencida» `#904b3c` (Android `#ae5b49`; ajustado a AA, 4,65:1 en el peor caso).
   - Prioridad, fondo del chip: alta `#f6ddce`, media `#f5e9b9`, baja `#e5edc8`; punto: alta `#c8755a`, media `#b79a40`, baja `#7d9a6d` (siempre acompañado de texto).
   - Paleta de 10 colores de tarjeta y resto de roles: inventario §13.7.
3. **Tema oscuro:** el de la plataforma (neutros de `DESIGN_SYSTEM.md` §2.1 y acento Brisa oscuro de §2.2), **sin** el fondo verdoso de Android. Las tarjetas de tarea mezclan su color pastel al 36 % con `--surface`; los chips de prioridad siguen la regla de Android.
4. **Comportamiento propio:** «Deshacer» aplazado (no se incluye ahora; prevalece sobre el principio 5 de `DESIGN_SYSTEM.md` §1, aunque sí se confirma lo destructivo); alta rápida con valores por defecto (prioridad Media, color aleatorio, día actual); reprogramación diaria de tareas con fecha límite; validación `día ≤ fecha límite`. Detalle y criterios en el inventario §13.

## 6. Criterios de aceptación
- Todas las funciones del inventario marcadas "se conserva" funcionan en la web.
- Datos de prueba importados sin pérdida; reglas de negocio con pruebas (incluidas las fechas y repetición de tareas, si existen).
- Cada persona solo ve sus datos (prueba de integración).
- Accesibilidad, 320 px, claro/oscuro; `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=brisa`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

QA escribe `docs/testing/plans/BRISA-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente, y lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Paridad:** ejecutar los ≥ 20 casos del inventario (`docs/migration/brisa-inventory.md` §11, con los resultados que cambian en §13.10, y los casos nuevos de §13.11) y compararlos con la app Android; las únicas diferencias válidas son los cambios aprobados del inventario §13.0, cualquier otra es un defecto.
2. Aislamiento: la persona A nunca ve, edita ni borra pendientes de la persona B (IDs ajenos → 404).
3. Idempotencia: crear el mismo pendiente dos veces con el mismo `Guid` de cliente no genera duplicados.
4. Borrado lógico y `UpdatedAt`: borrar y volver a listar; `?updatedSince=` devuelve solo cambios; la concurrencia devuelve 409 con mensaje claro.
5. Fechas: con «hoy» en la zona configurada de la persona (por defecto `America/Costa_Rica`, UTC-6, sin horario de verano), un pendiente del día 18 sigue en "Hoy" a las 23:30 hora local aunque en UTC ya sea el 19, y deja de serlo solo a las 00:00 local. Brisa no maneja hora del día ni repetición de tareas (inventario §13.1–§13.3).
6. Importación: archivo de ejemplo del inventario → totales y campos íntegros; reimportar no duplica; archivo corrupto → error claro sin importar nada a medias.
7. Permisos: anónimo 401; sin `brisa.access` 403.
8. Flujo de uso rápido (alta veloz, marcar como hecho, filtros del día) en 360 px, teclado y texto "Muy grande".
9. Reprogramación diaria: vectores V1–V10 y criterios AC1–AC7 del inventario §13.1 (medianoche en la zona de la persona y varios días sin abrir la app); una tarea con fecha límite vigente nunca queda atrás.
10. Fechas: `día ≤ fecha límite` al crear, modificar e importar (inventario §13.2, casos N26–N29).
11. Zona horaria por persona (inventario §13.3, casos N19–N21).
12. Tema y tono: el claro con los tokens de la sección 7 pasa AA; el oscuro usa el fondo neutro de la plataforma; textos originales con tuteo y sin voseo.
