# Brisa — ficha de migración

Identidad visual por definir (investigación en curso); icono `ListChecks` provisional · esquema `brisa` · ruta `/brisa` · API `/api/brisa`.

## 1. Situación
Brisa organiza los pendientes del día a día. **Existe como aplicación Android** (con su propio almacenamiento local). Se migra a Pastel como módulo web **conservando su comportamiento**. Más adelante la aplicación Android se conectará al backend para funcionar con y sin internet con sincronización: **no se implementa ahora**, pero el diseño debe dejarlo preparado.

Este documento no redefine sus funcionalidades: el **inventario del proyecto actual** (`docs/migration/brisa-inventory.md` (aún no existe: lo producirá la investigación en curso), lo produce un agente de investigación antes de la migración) es la fuente de verdad funcional.

## 2. Roles y permisos
Inicial: `brisa.access` (usar el módulo) y `brisa.items.manage` (sobre **sus propios** datos). Cada persona ve solo sus pendientes. Rol sugerido `Brisa — Usuario`. Cualquier concepto de compartir o grupos que exista en la app actual se anota en el inventario; **no se agrega nada nuevo** sin decisión del propietario.

## 3. Principios de la migración
1. **Paridad primero:** misma funcionalidad y reglas; cualquier cambio de comportamiento se registra aparte y se decide con el propietario.
2. **Preparado para sincronización (sin implementarla):**
   - Identificadores `Guid` v7 generados por el cliente; creación idempotente.
   - `UpdatedAt`, borrado lógico (`DeletedAt`) y token de concurrencia en cada entidad.
   - Endpoints de lectura incremental (`?updatedSince=`) y escritura por lotes diseñables después; documentar el modelo de conflicto propuesto (último cambio gana por campo, o por entidad) en `docs/DECISIONS.md`, sin construir el motor.
3. **Datos del usuario:** estrategia de importación desde la base o exportación de la app Android (formato a definir en el inventario), con respaldo, validación de integridad y reversión.
4. **Interfaz:** adopta el sistema de diseño de Pastel (color Brisa, componentes del kit); respeta los patrones de uso rápido que la app actual ya ofrece (alta veloz de pendientes, marcar como hecho, filtros del día).
5. **Pruebas de regresión** sobre los flujos esenciales antes de dar la migración por terminada.

## 4. Pasos de la migración
1. Leer el inventario (pantallas, flujos, entidades, reglas, recordatorios/notificaciones, almacenamiento, permisos).
2. Diseñar el esquema `brisa` y el contrato de API (documentar en `MODULE.md`).
3. Implementar backend por slices y el frontend por pantallas, en ese orden de uso (lista del día primero).
4. Herramienta de importación y pruebas con datos de ejemplo.
5. Validación con el propietario contra la app actual (lista de comprobación de paridad).

## 5. Fuera de este alcance
Conexión de la app Android, sincronización sin conexión, notificaciones push, recordatorios por WhatsApp o correo, compartir pendientes entre personas (salvo que ya exista).

## 6. Criterios de aceptación
- Todas las funciones del inventario marcadas "se conserva" funcionan en la web.
- Datos de prueba importados sin pérdida; reglas de negocio con pruebas (incluidas las fechas y repetición de tareas, si existen).
- Cada persona solo ve sus datos (prueba de integración).
- Accesibilidad, 320 px, claro/oscuro; `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=brisa`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

Criterios de aceptación esenciales del módulo (política de `docs/TESTING.md`): solo se prueba esto y no se amplía sin decisión del propietario. Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Paridad:** ejecutar los ≥ 20 casos del inventario (`docs/migration/brisa-inventory.md` §11) y compararlos con el comportamiento de la app Android; cualquier diferencia es un defecto o un cambio aprobado por escrito.
2. Aislamiento: la persona A nunca ve, edita ni borra pendientes de la persona B (IDs ajenos → 404).
3. Idempotencia: crear el mismo pendiente dos veces con el mismo `Guid` de cliente no genera duplicados.
4. Borrado lógico y `UpdatedAt`: borrar y volver a listar; `?updatedSince=` devuelve solo cambios; la concurrencia devuelve 409 con mensaje claro.
5. Fechas: un pendiente para las 23:30 hora de Costa Rica (UTC-6) aparece en la lista "Hoy" correcta aunque en UTC sea el día siguiente; repeticiones respetan la zona horaria.
6. Importación: archivo de ejemplo del inventario → totales y campos íntegros; reimportar no duplica; archivo corrupto → error claro sin importar nada a medias.
7. Permisos: anónimo 401; sin `brisa.access` 403.
8. Flujo de uso rápido (alta veloz, marcar como hecho, filtros del día) en 360 px, teclado y texto "Muy grande".
