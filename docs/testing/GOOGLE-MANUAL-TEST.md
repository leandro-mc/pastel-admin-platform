# Verificación manual de Google (F0-G01 y F0-G02)

Estas pruebas necesitan una cuenta real de Google y un navegador, por eso las ejecuta el propietario. La lógica de vinculación, el `state`, el `redirect_uri`, los tokens y los logs ya tienen pruebas automatizadas (`GoogleSignInTests`).

**No comparta contraseñas de Google con nadie ni las pegue en un chat:** no hacen falta, porque el navegador solo lo opera usted.

## Antes de empezar (una sola vez)

1. En Google Cloud Console, en el cliente OAuth, agregue este URI de redireccionamiento autorizado (el stack de QA usa el puerto 18080, distinto del de desarrollo):
   `http://localhost:18080/api/auth/google/callback`
2. Confirme que `.env` tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (los lee Compose; no se versionan).
3. Si la pantalla de consentimiento de Google está en modo «Prueba», agregue `lmc.edu.cr@gmail.com` como usuario de prueba.

## Fase 1: cuenta nueva (F0-G01): HECHA

Verificada por el propietario el 2026-10-24: entra con Google como usuario básico. El primer intento respondió 503 porque el stack venía de reiniciar la base en la misma corrida; por eso las fases siguientes usan `-SkipFaultInjection`.

## Fase 2: vincular a la cuenta del administrador de arranque (F0-G02): HECHA

Verificada por el propietario el 2026-10-25 y confirmada en la base: una sola cuenta de arranque (roles Administrator y Owner/Superuser), vínculo Google creado, contraseña invalidada y auditoría `auth.google.linked`. La anomalía de la primera ejecución se debía a un correo mal transcrito: `lmc.edu.cr@gmail.com` empieza con **ele minúscula** (no con i mayúscula).

Para repetirla:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "lmc.edu.cr@gmail.com"
.\scripts\qa-phase0-stack.ps1 -KeepRunning -SkipFaultInjection
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
.\scripts\qa-inspect-identity.ps1
```

Si el ingreso no vincula la cuenta esperada, compare primero el correo de `qa-inspect-identity.ps1` con el que devuelve Google, carácter por carácter.

## Limpieza

Al terminar, el script imprime el comando exacto de limpieza (`docker compose -p pastel-fase0-qa ... down -v`). Solo afecta al proyecto `pastel-fase0-qa`, no a su pila de desarrollo.
