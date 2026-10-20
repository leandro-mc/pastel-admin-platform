# CCR-004 — Cierre de WP9 en rutas protegidas

- **Estado:** autorización del propietario recibida el 2026-10-20; cambios de infraestructura y documentación implementados en `refactor/modular-foundation`, pendientes de validación por Build/QA.
- **Fecha:** 2026-10-20.
- **Ámbito:** WP9 de `docs/phase0/FASE-0-REFACTOR-BASE.md`.
- **Motivo:** los cambios necesarios para completar WP9 afectaban rutas reservadas por `AGENTS.md` (`compose.yaml`, Nginx, `.github/**` y documentos de nivel raíz en `docs/`). El propietario autorizó explícitamente ese alcance en esta conversación; por eso la CCR se conserva como registro del cambio y de su verificación pendiente.

## Cambios realizados

### 1. Docker Compose — `compose.yaml` y `compose.override.yaml` (implementado; sin validar)

- Separar PostgreSQL del stack principal y dejarlo como servicio de desarrollo en el override, de acuerdo con WP9. La configuración base deberá conectarse a una base externa sin exponer credenciales.
- Añadir healthchecks reales para API (`/health/ready`) y web (`/health/web`) y dependencias con `service_healthy` cuando exista una dependencia de arranque.
- Aplicar `cap_drop: [ALL]`, límites de recursos razonables y rotación de logs (`json-file`, `max-size`, `max-file`) a los servicios compatibles; validar que PostgreSQL conserva el funcionamiento normal en el entorno local.
- Retirar IP estáticas y usar DNS de servicios de Compose. Mantener la validación del proxy confiable por CIDR configurable, no por una IP de contenedor fija.
- No alterar las variables de secretos ni publicar valores reales.

### 2. Nginx — plantilla `deploy/nginx/default.conf.template` y snippet de cabeceras (implementado; sin validar)

- Habilitar compresión adecuada.
- Servir los activos con hash con caché larga e `immutable`, y evitar cachear `index.html` de modo que los despliegues no dejen una aplicación obsoleta.
- Mantener una única fuente por cabecera de seguridad para evitar duplicados.
- Conservar el host y puerto requeridos por el redirect URI; admitir encabezados de proxy y real IP únicamente desde upstreams expresamente confiables y configurados, evitando confiar en encabezados arbitrarios de clientes.

### 3. CI — `.github/workflows/ci.yml` (manual, sin ejecutar)

- Mantener la política operativa actual: ejecución **manual**, `confirm_validation=true`, sin despacho durante el desarrollo ni triggers automáticos de push/PR.
- Revisar tiempos máximos por trabajo y permisos mínimos sin alterar esa política. No despachar el workflow como parte de la solicitud.

### 4. Documentación (implementada)

- Actualizar `README.md` para reflejar .NET 10, host modular, Identity y módulos, router y Tailwind 4 bajo `web/src/core/design/tailwind.css`, además de comandos reproducibles actuales. Retirar referencias heredadas como `Pastel.Api`, `Pastel.Application`, `web/src/styles.css`, `App.tsx`, `npm install` y el voseo no aprobado.
- Corregir `docs/AI_WORKFLOW.md` para que la descripción de CI coincida con el modo manual vigente.
- Incorporar en `docs/SECURITY.md` una sección explícita de cómo reportar una vulnerabilidad, sin publicar secretos ni detalles operativos sensibles.

## Estado de aceptación

- Compose deja de depender de direcciones IP estáticas y puede validar su configuración.
- Los healthchecks, límites, capabilities y rotación de logs se comprueban con Build; Nginx se valida sintácticamente y con una revisión de cabeceras/caché.
- La documentación describe el árbol modular y los comandos reales; ninguna instrucción propone ejecutar CI sin revisión local y aprobación expresa.
- Build ejecuta los controles afectados y registra los resultados reales. No se considera WP9 cerrado hasta completar esa validación.

## Límites

Los cambios descritos quedaron implementados en la rama de trabajo, pero **WP9 no se considera cerrado** hasta que Build/QA valide Compose, healthchecks, construcción/arranque de imágenes, Nginx y el workflow actualizado. Esta CCR no autoriza despliegues, ejecución manual de CI, apertura de PR ni integración en `dev`/`main`.
