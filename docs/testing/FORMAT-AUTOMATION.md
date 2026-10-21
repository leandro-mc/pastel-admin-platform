# Automatización de formato y chequeos de pre-commit

Objetivo: eliminar el trabajo manual y recurrente de formato **sin** mezclar los chequeos rápidos de cada commit con las validaciones completas.

## Dos niveles, separados a propósito

| Nivel | Cuándo | Qué hace | Herramienta |
|---|---|---|---|
| **Rápido (hook)** | En cada `git commit`, solo sobre los archivos preparados | Corrige lo seguro, detiene lo demás | `.githooks/pre-commit` → `scripts/hooks/pre-commit.mjs` |
| **Completo** | A demanda y en CI | `dotnet format`, build, pruebas, auditoría | `scripts/format-*.ps1`, `scripts/test-*.ps1` |

El hook **nunca** ejecuta `dotnet format`, build ni pruebas, y **no existe ningún hook de push**: un push no modifica commits ya creados.

## Instalación (una vez por clon)

Requisitos: Git y Node 20+ (el proyecto ya exige Node para el frontend).

```powershell
.\scripts\install-hooks.ps1        # Windows (PowerShell)
```

```sh
node scripts/install-hooks.mjs     # cualquier sistema (Windows, Linux, macOS)
```

Ambos hacen `git config core.hooksPath .githooks` en el clon local; son idempotentes. Para que Prettier funcione en el hook, instale las dependencias del frontend: `cd web && npm ci`. Sin ellas el hook avisa y omite solo la parte de Prettier (los chequeos de C#, secretos y rutas siguen activos).

Desinstalar: `git config --unset core.hooksPath`.

## Qué hace el hook

**Corrige automáticamente** (solo si el archivo **no** tiene cambios sin preparar) y vuelve a preparar el archivo:

- C# (`src/**` y `tests/**`): quita BOM, convierte CRLF a LF y agrega la nueva línea final. No toca el contenido de las líneas.
- Frontend (`web/`): aplica Prettier a los mismos archivos que `npm run format`.

**Detiene el commit e indica cómo corregir:**

- Espacios al final de línea en C# (no se corrigen solos para no alterar cadenas literales multilínea).
- Archivos con cambios sin preparar que además incumplen el formato (corrija y use `git add`, o `cd web && npm run format`).
- Rutas prohibidas: `*.csn`, `.env` (excepto `.env.example`), `*.pem`, `*.pfx`, `*.p12`, `*.key`.
- Patrones de secretos conocidos (tokens de GitHub, claves privadas, `GOCSPX-…`, claves de AWS/Anthropic). Nunca imprime el valor encontrado.

Emergencia: `PASTEL_SKIP_HOOKS=1 git commit ...` (o `--no-verify`). Lo omitido queda pendiente de corregir y CI/`test-*.ps1` lo detectará.

## Formateadores completos (Docker)

`scripts/format-backend.ps1` y `scripts/format-frontend.ps1` formatean una **copia temporal** dentro de Docker. Causa raíz corregida: antes copiaban de vuelta **todos** los archivos con `cp -p`; ahora copian solo los que difieren byte a byte, lo que evita falsos cambios masivos en `git status`. Tras copiar, imprimen cuántos archivos actualizaron.

- `format-backend.ps1` además muestra la sección *Diagnósticos de formato restantes* (sin ocultarlos) y termina con error si `dotnet format` no puede corregirlos solo. La normalización final a UTF-8 sin BOM y LF se mantiene en el host.
- Prueba de idempotencia: ejecutar el formateador dos veces; la segunda debe informar `0` archivos actualizados y `git status --short` no debe cambiar.

## Archivos `.csn`

No existen en el repositorio ni en su historial, ningún script los genera y `.gitignore` los excluye; el hook además los bloquea. Su origen sigue sin determinar: para investigarlo hace falta revisar fechas, contenido y la herramienta que los creó en el **respaldo del propietario**, que no debe borrarse.

## Pruebas del propio hook

```sh
node --test scripts/tests/pre-commit.test.mjs
```

Incluye pruebas unitarias y pruebas extremo a extremo en repositorios Git temporales (requiere `git`; no se ejecuta dentro de `test-frontend.ps1` porque la imagen Docker de Node no incluye Git).
