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
- Para cada tarea coherente, crea una sola rama desde `dev`, con prefijo y nombre descriptivo. No crees ramas para cada archivo o pequeño ajuste.
- Al terminar, ejecuta las validaciones pertinentes, crea commits convencionales y abre un PR con base `dev`. Integra en `dev` sólo tras revisar cambios y resultados de CI.
- No cambies tecnología, arquitectura, formato de permisos, modelo de sesión ni convenciones de ramas por iniciativa propia. Consulta `docs/ARCHITECTURE.md` y mantén la coherencia.
- Todo cambio estructural o de permisos debe incluir pruebas y actualizar la documentación pertinente.
- No uses `EnsureCreated` como sustituto de migraciones. No almacenes tokens en localStorage/sessionStorage ni registres secretos.

## Fuentes de contexto
- Flujo de trabajo, ramas, commits, PRs y releases: `docs/AI_WORKFLOW.md`.
- Arquitectura, tecnologías, ubicación de funcionalidades y cómo agregar módulos: `docs/ARCHITECTURE.md`.
- Modelo de seguridad y límites conocidos: `docs/SECURITY.md`.
- Arranque, operaciones comunes y conexión de pgAdmin: `README.md`.

Si inicias una sesión nueva sin contexto, comienza por los documentos anteriores antes de escribir código. No asumas que una explicación del chat es más actual que el estado remoto de `dev`.