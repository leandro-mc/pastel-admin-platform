# Progreso — Huella

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-15.

## Estado
- **Rama:** `feat/huella-mvp` · PR #43 hacia `dev`. **No integrada**: el propietario la integra cuando confirme que funciona.
- **Hecho en la rama:** banco privado, estudio de CV (ofertas, evidencia, generación, versiones, edición validada, texto ATS), perfil público por enlace secreto, **PDF** con Typst (`Pastel.Documents`, CCR-2) e **IA** en tres caminos con el mismo prompt: automática con la clave y el modelo del propietario (Gemini, OpenAI o Anthropic; clave cifrada y nunca devuelta), prompt descargable (`.md`/`.txt`) para una IA externa e importación de su respuesta. Todo pasa por el guardián de verdad.
- En `dev` solo existe el esqueleto del módulo.

## Última validación (en la rama, 2026-11-15)
`test-backend.ps1` completo (Documents 2/2, Huella 8/8), `test-database.ps1` 58/58 (las 6 de Huella y la de IA, con las migraciones aplicadas), `has-pending-model-changes` sin cambios, `test-frontend.ps1` completo y recorrido real por nginx (CV, prompt, importación, PDF, clave sin filtrarse, llamada real a Gemini con clave falsa).

## Por verificar
- Respuestas reales de Gemini, OpenAI y Anthropic con claves válidas (lo hace el propietario en «Configurar IA»).
- Revisión visual en navegador (Etapa 2).

## Decisiones del propietario pendientes
- Tema de Huella en `module-themes.css`.
- Metadatos `og:*` del enlace público (nginx).
- Fuentes de la interfaz (CCR-2, punto 4).
- ¿Idiomas del CV solo ES/EN desde F1? ¿Varios «enfoques» visibles en el perfil público?
