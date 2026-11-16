# Progreso — Balance

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-16.

## Estado
- **Código:** implementado en la rama `feat/balance-mvp` (PR a `dev`, sin integrar): dominio (dinero, reparto, liquidación, política de roles), esquema `balance` con integridad en la base, API, e interfaz con los flujos de grupos, gastos, saldos, liquidación, personas, gestión de gastos y ajustes.
- **Especificación:** ficha `docs/modules/BALANCE.md`; requisitos, roles, inventario (D1–D9) y prototipo en `docs/requirements/balance/`.

## Verificado (y cómo)
- Dominio: compila limpio; prueba manual de reparto, liquidación y montos; catálogo de 40 monedas comparado con ISO 4217 (`pycountry`, `babel`), 0 discrepancias.
- Datos: el DDL equivalente se aplicó a PostgreSQL 16 y se comprobó que la base rechaza lo inválido (FK, CHECK, únicos, `RESTRICT`, disparador de administración, cascada).
- API y persistencia: compilan con las reglas del repositorio contra stubs mínimos de EF Core y de la plataforma.
- Frontend: `tsc --strict` limpio sobre el módulo; prueba manual de `lib/money.ts`.

## No verificado
- Compilación con los paquetes reales (NuGet no disponible en el entorno) y arranque de la aplicación; la migración `BalanceMvpSchema` y su snapshot se generaron desde una descripción común, no con `dotnet ef`: ejecutar `dotnet ef migrations has-pending-model-changes`.
- Las pruebas escritas no se ejecutaron (AGENTS §4): xUnit (casos dorados G01–G41, política de roles, limitador de ingreso) y Vitest (`balance-money.test.ts`).
- Lint, Prettier y build de Vite del frontend; interfaz en navegador; pruebas de integración y de borde (Etapa 2).

## Pendiente
- **Zona compartida (necesita decisión):** página para quien no tiene cuenta (BL-13): `RequireAuth` descarta el fragmento `#` y las rutas de módulo no son públicas.
- Registrar en `docs/DECISIONS.md` el modelo de participantes, roles de grupo, alcance de la gestión de gastos por rol e ingreso por enlace y código (hoy están en `src/Modules/Balance/MODULE.md`).
- Revisión visual: identidad definitiva, cifras tabulares, hoja de gastos en móvil.
- Preselección de la casilla de Balance al registrarse (inventario §12.11, P23): depende de Identity.

## Decisiones del propietario pendientes
- ¿Columnas adicionales (categoría, notas) o importar un CSV en la hoja?
- ¿Se muestra «Su parte será ₡…» al registrar un gasto?
- ¿Una marca de «recibido»? (Reabriría D6: Balance no registra pagos.)
- Al reabrir se borra la fecha de cierre (supuesto del prototipo); unirse a un grupo cerrado se rechaza; el historial lo ve solo la administración. ¿Se confirman?
