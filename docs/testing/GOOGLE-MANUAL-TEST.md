# Verificación manual de Google (F0-G01 y F0-G02)

Estas pruebas necesitan una cuenta real de Google y un navegador, por eso las ejecuta el propietario. La lógica de vinculación, el `state`, el `redirect_uri`, los tokens y los logs ya tienen pruebas automatizadas (`GoogleSignInTests`).

**No comparta contraseñas de Google con nadie ni las pegue en un chat:** no hacen falta, porque el navegador solo lo opera usted.

## Antes de empezar (una sola vez)

1. En Google Cloud Console, en el cliente OAuth, agregue este URI de redireccionamiento autorizado (el stack de QA usa el puerto 18080, distinto del de desarrollo):
   `http://localhost:18080/api/auth/google/callback`
2. Confirme que `.env` tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (los lee Compose; no se versionan).
3. Si la pantalla de consentimiento de Google está en modo «Prueba», agregue `Imc.edu.cr@gmail.com` como usuario de prueba.

## Fase 1: cuenta nueva (F0-G01): HECHA

Verificada por el propietario el 2026-10-24: entra con Google como usuario básico. El primer intento respondió 503 porque el stack venía de reiniciar la base en la misma corrida; por eso las fases siguientes usan `-SkipFaultInjection`.

## Fase 2: vincular a la cuenta del administrador de arranque (F0-G02): PENDIENTE

En la primera ejecución el propietario entró como usuario básico y no como administrador. Esta fase confirma por qué, con datos concretos.

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "Imc.edu.cr@gmail.com"
.\scripts\qa-phase0-stack.ps1 -KeepRunning -SkipFaultInjection
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
.\scripts\qa-inspect-identity.ps1
```

1. Copie la salida de `qa-inspect-identity.ps1` (aún sin haber entrado con Google). Debe mostrar `Imc.edu.cr@gmail.com` como correo de arranque y una cuenta con ese correo con roles de administrador. No imprime contraseñas.
2. Abra `http://localhost:18080/ingresar`, pulse «Continuar con Google» y elija esa cuenta.
3. Esperado: entra a la cuenta del administrador existente (no crea otra). Anote si el primer intento falla.
4. Ejecute otra vez `.\scripts\qa-inspect-identity.ps1` y copie la salida: muestra si se creó una cuenta nueva (`registered`) o se vinculó la existente (`linked`).
5. Si entró como administrador, cierre sesión e intente entrar con la contraseña de arranque de `.env`: debe fallar.

Reporte: las dos salidas de `qa-inspect-identity.ps1` y qué vio en pantalla.

## Limpieza

Al terminar, el script imprime el comando exacto de limpieza (`docker compose -p pastel-fase0-qa ... down -v`). Solo afecta al proyecto `pastel-fase0-qa`, no a su pila de desarrollo.
