# Desarrollo y publicación

Repositorio: `https://github.com/leandro-mc/pastel-admin-platform`.

## Clonar o actualizar

```powershell
git clone https://github.com/leandro-mc/pastel-admin-platform.git
cd pastel-admin-platform
git fetch origin
git switch dev
git pull --ff-only origin dev
```

Si ya tenés una copia local, no vuelvas a clonarla. Verifica antes `git status --short --branch` y guarda cualquier cambio propio.

## Añadir una funcionalidad o corrección

Parte de la base indicada por el orquestador (normalmente la punta más reciente de `dev`; durante una refactorización base puede ser la rama de refactor autorizada). Crea una sola rama coherente (`feat/...`, `fix/...`, `refactor/...`, `docs/...`, `test/...` o `chore/...`) y guarda avances mediante commits coherentes. Los pushes a ramas de trabajo no disparan el CI completo. **No abras PR ni integres a `dev` sin autorización explícita del usuario**; cuando autorice abrirlo, valida y abre un único PR hacia `dev`.

```powershell
git switch dev
git pull --ff-only origin dev
git switch -c feat/nombre-del-cambio
# editar y ejecutar pruebas
git diff --check
git add ruta/archivo1 ruta/archivo2
git commit -m "feat: describir el cambio"
git push -u origin feat/nombre-del-cambio
```

Cuando exista autorización para abrir el PR, usa `dev` como base salvo que el orquestador haya indicado otra base de integración. No fusiones directamente a `main`; sólo se promueve `dev` a `main` cuando el usuario lo autoriza expresamente. Los PR en borrador sirven para checkpoint y no ejecutan CI completo; al marcarlos listos, GitHub Actions ejecuta la validación. También puede iniciarse manualmente desde **Actions → CI → Run workflow**. Para cada versión publicada, usa un PR revisado y crea un tag `vMAJOR.MINOR.PATCH` en el commit aprobado. Consulta `docs/AI_WORKFLOW.md` para el procedimiento completo.

No subas `.env`, tokens, contraseñas reales, dumps, ni datos personales. Nunca uses `git push --force` en ramas compartidas.

## Entorno Docker

Los pasos de preparación de `.env`, URL web, conexión pgAdmin, logs, reinicios y apagado están en la sección **Uso diario de Docker** del `README.md`.