# Huella — ficha técnica (frontend)

Estado: **marcador** (esqueleto generado por `tools/new-module`).

- Código `huella` · ruta `/huella` · icono `Footprints` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `permission`; se exige `huella.access`, asignado únicamente a Owner/Superuser. La ruta de perfil público se implementará aparte mediante token secreto, sin aparecer en el selector ni en una búsqueda.
- Backend: `src/Modules/Huella/MODULE.md`. Producto: `docs/modules/HUELLA.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos) · `pages/` (una página por ruta; exportan `Component`).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas previstas

| Ruta | Página | Acceso |
|---|---|---|
| `/huella` | Panel/entrada privada (marcador actual) | Owner/Superuser con permiso |
| `/huella/p/:token` | Perfil público de la última versión publicada (pendiente) | Token aleatorio vigente, sin login; meta/cabecera noindex |

## Seguridad de enlace obligatorio

- Perfil único para Owner/Superuser; no existe edición de perfiles de otras cuentas.
- Token aleatorio de al menos 32 bytes, Base64URL, hash almacenado en el servidor, regenerable y revocable.
- Perfil público no indexable (`noindex,nofollow,noarchive` y `X-Robots-Tag`). No se añade un `robots.txt` que bloquee la lectura del `noindex`.

## Pendiente

El módulo actual sigue siendo solo un marcador: no se debe afirmar que existe el perfil público, la generación del token, la publicación ni la desindexación hasta implementar el modelo/API/ruta y probarlo. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
