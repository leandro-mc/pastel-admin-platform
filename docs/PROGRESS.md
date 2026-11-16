# Estado del proyecto (global)

Solo lo transversal. El estado de cada aplicación vive en `docs/progress/<APP>.md`; la historia cerrada, en `docs/HISTORY.md`. Se edita únicamente cuando cambia algo que afecta a varias apps (`AGENTS.md` §9). Última actualización: 2026-11-15.

## 1. Etapa
**Etapa 1: construir las cinco aplicaciones funcionales.** La Fase 0 (base modular, Identity, infraestructura y validación) está cerrada e integrada en `dev` desde el 2026-11-15; `main` no cambia. Cada app se desarrolla en su rama `feat/<modulo>-<tema>` desde `dev`.

## 2. Aplicaciones
| App | Estado | Rama / PR | Progreso |
|---|---|---|---|
| Plataforma (Identity, shell, infraestructura) | Completa y validada en lo esencial | `dev` | `docs/progress/PLATAFORMA.md` |
| Huella | MVP funcional con PDF e IA; pendiente de aprobación | `feat/huella-mvp` · PR #43 | `docs/progress/HUELLA.md` |
| Ágora | Esqueleto; requisitos y prototipo listos | — | `docs/progress/AGORA.md` |
| Brisa | Esqueleto; requisitos y prototipo aprobado | — | `docs/progress/BRISA.md` |
| Balance | Esqueleto; requisitos y prototipo nuevos | — | `docs/progress/BALANCE.md` |
| Cosecha | Esqueleto; requisitos, prototipo y guías por rol | — | `docs/progress/COSECHA.md` |

## 3. Pendientes transversales
- **CCR-2** (Typst, `Pastel.Documents`, fuentes autoalojadas): aplicado en `feat/huella-mvp` salvo las fuentes de la interfaz (punto 4); entra en `dev` con el PR #43. Cosecha y Ágora lo reutilizan.
- **Identidad visual por app**: pendiente de la revisión visual del propietario de los prototipos; hasta entonces los tokens de `module-themes.css` son provisionales.
- **Selección de apps en el registro y membresías**: hoy el registro asigna solo `Member`; reglas en `docs/product/PASTEL-PRODUCT-AND-UX.md`.
- **Catálogo persistente de aplicaciones.**
- Decisiones abiertas por app: en el progreso de cada una. Registro completo de la investigación: `docs/requirements/DECISIONES-Y-HALLAZGOS.md` §7.

## 4. Cómo continuar
Lea `AGENTS.md` y, para su tarea, solo lo que indica su §2.

## 5. Backlog diferido — Etapa 2 (no se trabaja sin decisión del propietario)
Además de las secciones «Diferido a QA — Etapa 2» de cada ficha de `docs/modules/`:
- **Pruebas:** eventos de seguridad con antes/después, `/api/client-errors`, límite de errores de render, expiración de token por tiempo, pantalla de sesión vencida, esperas crecientes y aislamiento de Google en el limitador, recorridos en navegador (navegación, permisos, responsive y temas), regresión frente a `dev` y revisión visual y de contraste.
- **Técnicas:** `SetUserPermissionsHandler` y `CreateRole` en transacción serializable; reintento de EF Core ante conexiones caídas (tras reiniciar la base, la primera petición puede responder 503); nivel `Microsoft.AspNetCore` en Warning también en Development (hoy registraría la URL del callback con `code` y `state`); job de aislamiento por módulo en CI; bundle principal de ~555 kB; importación sin extensión en `vite.config.ts` que avisa Vite.
