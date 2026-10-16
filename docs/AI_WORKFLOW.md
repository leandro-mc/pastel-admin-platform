# Flujo de trabajo para personas y agentes de IA

Este documento define el ciclo normal de desarrollo. `AGENTS.md` y este archivo deben leerse al inicio de cada sesión nueva.

## 1. Modelo de ramas

- `main`: versión estable publicada. No se usa para el desarrollo diario.
- `dev`: rama de integración actualizada. Todas las funcionalidades, correcciones y refactorizaciones aprobadas regresan a esta rama.
- Ramas de trabajo: se crean desde el `dev` más reciente, se usan para una tarea coherente y se integran mediante un Pull Request cuya base es `dev`.

Flujo normal:

```text
main  --sólo promoción autorizada de una versión estable--  dev
                                                             ↑
                         PR de feat/... / fix/... / ... ─────┘
```

Comandos iniciales:

```powershell
git status --short --branch
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feat/nombre-corto
```

No cambies de rama si hay cambios locales sin guardar o sin permiso del usuario. Si el nombre propuesto ya existe, inspecciónalo y reutilízalo únicamente si corresponde a la misma tarea.

## 2. Convención de nombres

Usa minúsculas, kebab-case y una rama por objetivo coherente:

- `feat/<funcionalidad>`: funcionalidad o módulo nuevo.
- `fix/<problema>`: corrección de un bug.
- `refactor/<alcance>`: refactorización sin cambio intencional de comportamiento.
- `docs/<tema>`: sólo documentación.
- `test/<alcance>`: pruebas independientes.
- `chore/<tarea>`: tooling, CI, configuración o mantenimiento.

No crees ramas por archivo, clase o commit. Agrupa cambios dependientes en una sola rama y usa commits para separar pasos lógicos. Las ramas `dependabot/...` son una excepción automática: las genera GitHub Dependabot y no deben renombrarse manualmente; su configuración agrupa las actualizaciones y las dirige a `dev`.

## 3. Commits y Pull Requests

- Usa Conventional Commits en español o inglés consistente con el área: `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Mantén cada commit enfocado. Ajustes pequeños de una misma corrección pueden compartir commit.
- Antes del commit, revisa `git diff --check`, `git diff` y `git status`; confirma que no haya `.env`, claves, contraseñas, tokens, dumps o datos personales.
- Sube la rama y abre un único PR por tarea coherente con base `dev`. Resume propósito, decisiones, pruebas ejecutadas y riesgos conocidos.
- Espera CI y revisa el diff del PR. Si falla, corrige en la misma rama; no abras otra por cada arreglo.
- Tras el merge, actualiza tu copia de `dev` y elimina la rama de trabajo cuando ya no se necesite.
- No hagas commits de trabajo directamente a `main`. Evita `git push --force`; nunca reescribas el historial compartido.

## 4. Promoción de `dev` a `main`

Sólo ocurre cuando el usuario dice explícitamente que quiere publicar/pasar a `main`. Antes de hacerlo:

1. Confirma que `dev` está actualizado y sin tareas incompletas.
2. Ejecuta las validaciones de backend, frontend y Docker indicadas en `README.md`.
3. Revisa cambios de esquema, migraciones, secretos, configuración de producción y notas de versión.
4. Abre un PR de `dev` a `main`, revisa CI y espera autorización si el usuario no ordenó de forma inequívoca completar la promoción.
5. Integra el PR aprobado y crea un tag semántico en el commit publicado: `vMAJOR.MINOR.PATCH` (por ejemplo, `v1.0.0`). No inventes ni reutilices un tag.
6. Documenta en el PR o notas de la versión los cambios incluidos y cualquier paso operativo.

Por defecto, termina el trabajo en `dev`. Nunca interpretes que pedir una funcionalidad o decir “listo” autoriza publicarla en `main`.

## 5. Validación mínima

Ejecuta lo aplicable y reporta exactamente qué pasó y qué no pudo ejecutarse:

```powershell
dotnet restore Pastel.slnx
dotnet build Pastel.slnx --configuration Release --no-restore
dotnet test Pastel.slnx --configuration Release --no-build --no-restore
Push-Location web
npm install --no-audit --no-fund
npm run build
npm run lint
Pop-Location
docker compose config --quiet
docker compose build
```

Para cambios en el arranque o la base, compila y además levanta el stack limpio de CI o prueba la migración y el seeding en PostgreSQL. Que una imagen compile no demuestra que las tablas se creen o que los servicios arranquen.

## 6. Documentación y contexto duradero

Actualiza la documentación dentro de la misma rama si cambian el flujo de trabajo, los comandos, variables de entorno, tecnologías, arquitectura, contratos, endpoints o la manera de agregar módulos. Las decisiones técnicas persistentes no deben quedar sólo en la conversación.

Al finalizar, informa el nombre de la rama, PR hacia `dev`, commit/merge cuando esté verificado, pruebas ejecutadas y comandos exactos que el usuario debe ejecutar. No afirmes una validación sin evidencia.