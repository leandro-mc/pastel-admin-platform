# Progreso — Huella

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-16.

## Estado
- **Rama:** `feat/huella-mvp` · PR #43 hacia `dev`. **No integrada**: el propietario la integra cuando confirme que funciona.
- **Hecho en la rama:** banco privado, estudio de CV (ofertas, evidencia, generación, versiones, edición validada, texto ATS), perfil público por enlace secreto, **PDF** con Typst (`Pastel.Documents`, CCR-2) e **IA** en tres caminos con el mismo prompt: automática con la clave y el modelo del propietario (Gemini, OpenAI o Anthropic; clave cifrada y nunca devuelta), prompt descargable (`.md`/`.txt`) para una IA externa e importación de su respuesta. Todo pasa por el guardián de verdad.
- **Mejoras de uso (2026-11-16):** banco con autoguardado, buscador y elementos colapsados, confirmación al quitar, fecha y hora en ofertas y versiones de CV, enlace público siempre visible y copiable (guardado cifrado) y vista previa real en pestaña nueva. Después: descarga del CV también en Word (.docx), iconos por enlace del perfil (predeterminado según el tipo, cambiable) y nivel inicial Junior.
- En `dev` solo existe el esqueleto del módulo.

## Última validación (en la rama, 2026-11-15)
`test-backend.ps1` completo (Documents 2/2, Huella 8/8), `test-database.ps1` 58/58 (las 6 de Huella y la de IA, con las migraciones aplicadas), `has-pending-model-changes` sin cambios, `test-frontend.ps1` completo y recorrido real por nginx (CV, prompt, importación, PDF, clave sin filtrarse, llamada real a Gemini con clave falsa).

## Por verificar
- Las mejoras de uso del 2026-11-16 solo se compilaron (`tsc`, `dotnet build`); el propietario las probó a mano en el navegador (banco, enlace, vista previa). La prueba HUELLA-E1-6 y las nuevas (`CvDocxTests`, icono inválido en el perfil) están escritas y no se ejecutaron.
- El Word (.docx) se comprobó abriéndolo con Word real (sin avisos de reparación, 1 página); falta abrirlo en Google Docs. Un icono elegido en un enlace solo aparece en el perfil público tras volver a publicar.
- Respuestas reales de Gemini, OpenAI y Anthropic con claves válidas (lo hace el propietario en «Configurar IA»).
- Revisión visual en navegador (Etapa 2).

## Decisiones del propietario pendientes
- Tema de Huella en `module-themes.css`.
- Metadatos `og:*` del enlace público (nginx).
- Fuentes de la interfaz (CCR-2, punto 4).
- ¿Idiomas del CV solo ES/EN desde F1? ¿Varios «enfoques» visibles en el perfil público?
