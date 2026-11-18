# Progreso — Cosecha

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-17.

## Estado
- **Código:** MVP de la Etapa 1 construido en la rama `feat/cosecha-mvp` (PR a `dev` abierto, sin integrar). Backend: modelo de datos (17 tablas y migración `AddCosechaMvpSchema`), catálogo, parámetros de pago y reclamos como configuración versionada, productores, compradores, pedidos con vista aislada del comprador, envíos con reparto proporcional, recepción y entrega, liquidación y pagos, reportes con CSV y «Hoy». Frontend: todas las pantallas de la ficha §6. `Campaign → Season` ejecutado en código y ficha.
- **Pruebas:** escritas y **no ejecutadas** (AGENTS §4). Unitarias de cálculo (casos 1 a 7 y 11 de la ficha §10) e integración por HTTP (casos 8, 9, 10 y 12). Las funciones de cálculo se probaron a mano con los casos de la ficha; el esquema, en PostgreSQL 16 (26 rechazos y los casos 5, 6 y 7).
- **Especificación:** ficha `docs/modules/COSECHA.md`; requisitos, modelo de pago, política de reclamos y prototipo en `docs/requirements/cosecha/`.

## Por verificar (en orden de importancia)
1. La migración, su designer y el snapshot se escribieron sin `dotnet ef` (el entorno no alcanzaba NuGet). Ejecutar `dotnet ef migrations has-pending-model-changes`; si reporta diferencias, regenerar con `dotnet ef migrations add`.
2. El módulo solo se compiló contra sustitutos de EF Core y Npgsql: falta `dotnet build` real, y comprobar la traducción de las consultas a SQL y las columnas generadas (`accepted_kg`, `amount_crc`) tras guardar.
3. Ejecutar las pruebas unitarias y las de integración (`PASTEL_TEST_CONNECTION_STRING` hacia `pastel_integration_tests`): es la primera vez que permisos, aislamiento de compradores y concurrencia correrían de punta a punta.
4. Recorrer en navegador planificar → repartir → recibir → entregar → cerrar → pagar, y la vista del comprador. Después ESLint, Prettier, Vitest, `check-design` y accesibilidad.

## Pendiente
- Cotizaciones, fichas de producto y recibos en PDF: dependen de CCR-2. Quedan detrás de `Documents/ICosechaDocuments` (hoy «no disponible»); ninguna ruta ni pantalla los expone todavía.
- Las tablas deberían convertirse en tarjetas en móvil (ficha §6); hoy se desplazan horizontalmente. Faltan los valores por defecto «precio base» y «último comprador».
- Vincular la cuenta de un comprador exige escribir su identificador (`buyers.user_id`): Cosecha no consulta a Identity. Un contrato de Identity que liste cuentas mejoraría esto (zona compartida).
- Fuera del MVP (ficha §9): lotes y trazabilidad, reclamos, mercado y cotizador, equipo y anticipos. Los parámetros de reclamos ya se guardan, pero no hay flujo que los use.

## Validación externa pendiente (no se asumió ningún valor)
Parámetros del modelo de pago y de la política de reclamos (productores, compradores, técnico poscosecha, abogado; asamblea), personería jurídica y registros (SFE), socio exportador, cuarto frío, dominio de correo, admisibilidad, factura electrónica y datos personales (`docs/requirements/DECISIONES-Y-HALLAZGOS.md` §7). El sistema no siembra ninguno: la política vigente es `null` hasta que alguien la registre.

## Decisiones del propietario pendientes
- Capital para el tope de caja o financiamiento puente; SINPE como medio único y productores sin cuenta.
- Varios commits de la rama superan las ~800 líneas (cada uno es una rebanada vertical completa); decidir si se deja así o se reorganiza antes de integrar.
