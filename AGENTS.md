# Instrucciones para agentes de IA — Pastel Admin Platform

Este archivo es la puerta de entrada obligatoria para cualquier persona o agente que trabaje en el repositorio.

## Antes de hacer cualquier cambio
1. Lee este archivo completo.
2. Lee `docs/AI_WORKFLOW.md` y `docs/ARCHITECTURE.md` antes de proponer, planificar o editar cambios.
3. Lee `docs/SECURITY.md` para trabajo de autenticación, autorización, sesiones, permisos, datos o configuración de despliegue.
4. Revisa `git status --short --branch`, el historial reciente y el código existente. No sobrescribas cambios locales del usuario.
5. Si los documentos y el código parecen contradecirse, confirma cómo funciona el código actual y actualiza la documentación relacionada en la misma tarea.

## Reglas obligatorias
- `dev` es la rama de integración y la base de todo trabajo nuevo. `main` se reserva para versiones estables publicadas.
- Nunca fusiones ni publiques en `main` hasta que el usuario lo autorice explícitamente.
- Para cada tarea coherente, usa una sola rama de trabajo. Si el usuario pide continuar en una rama existente, reutilízala; no crees ramas por archivo o pequeño ajuste.
- **No abras PR ni integres a `dev` automáticamente.** Primero entrega el nombre de la rama, el commit y los comandos para probar. Espera a que el usuario valide el cambio en su entorno y autorice expresamente enviarlo a `dev`; sólo entonces prepara la integración y CI.
- En cambios de UI iterativos, no consideres terminado el trabajo con una revisión del código solamente: solicita validación visual del usuario antes de integrar. `main` siempre requiere autorización explícita independiente.
- No cambies tecnología, arquitectura, formato de permisos, modelo de sesión ni convenciones de ramas por iniciativa propia. Consulta `docs/ARCHITECTURE.md` y mantén la coherencia.
- Todo cambio estructural o de permisos debe incluir pruebas y actualizar la documentación pertinente.
- No uses `EnsureCreated` como sustituto de migraciones. No almacenes tokens en localStorage/sessionStorage ni registres secretos.

## Estilos, iconografía y formato del frontend
- El frontend usa Tailwind CSS 4 con el plugin nativo de Vite. Antes de tocar estilos, revisa `docs/ARCHITECTURE.md` y los tokens/variantes de `web/src/styles.css`.
- Para nuevos estilos, usa utilidades Tailwind en JSX; utiliza variantes responsive, hover y focus-visible. `@apply` se reserva para patrones semánticos reutilizados y selectores complejos. Mantén los tokens de tema en un único lugar.
- **Paleta estricta:** no uses morado, violeta, púrpura ni ninguna variante, degradado o tono cercano. Aplica sólo la paleta Brisa y los tokens existentes; la prohibición cubre componentes, iconos, ilustraciones, fondos, estados, gráficas y nuevas variables.
- **Iconografía estricta:** no uses el icono Lucide `Sparkles`, iconos equivalentes de destellos/estrellas ni caracteres decorativos de estrella. Para el lenguaje visual de marca, prioriza `Flower2`; para cualquier otro caso, usa iconos Lucide semánticos que describan la acción o el estado.
- **Estructura:** `App.tsx` se concentra en el bootstrap de sesión y composición; las pantallas compartidas viven en `web/src/components/`. Configuración divide el estado/operaciones en `features/settings/useSettingsAdmin.ts`, la composición en `SettingsPage.tsx`, las vistas en `tabs/`, los formularios breves en `dialogs/` y el editor de pantalla completa en `AccessEditorPage.tsx` con secciones menores en `access-editor/`. Evita archivos que mezclen estado de API, varias pantallas y grandes bloques de JSX.
- **Formato obligatorio:** usa Prettier, definido por `web/.prettierrc.json`. Ejecuta `npm run format` para aplicar el formato y `npm run format:check` antes de terminar; evita JSX comprimido y líneas manuales enormes.
- `web/src/styles.css` contiene tokens, tema y patrones CSS reutilizables. No añadas reglas de componentes con propiedades CSS crudas; las excepciones son tokens globales, normalización y keyframes personalizados.

## Fuentes de contexto
- Flujo de trabajo, ramas, commits, PRs y releases: `docs/AI_WORKFLOW.md`.
- Arquitectura, tecnologías, ubicación de funcionalidades y cómo agregar módulos: `docs/ARCHITECTURE.md`.
- Modelo de seguridad y límites conocidos: `docs/SECURITY.md`.
- Arranque, operaciones comunes y conexión de pgAdmin: `README.md`.

Si inicias una sesión nueva sin contexto, comienza por los documentos anteriores antes de escribir código. No asumas que una explicación del chat es más actual que el estado remoto de `dev`.