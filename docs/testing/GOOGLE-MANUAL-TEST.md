# Verificación manual de Google (F0-G01, F0-G02 y F0-G12)

Estas pruebas necesitan una cuenta real de Google y un navegador, por eso las ejecuta el propietario. La lógica de vinculación, el `state`, el `redirect_uri`, los tokens y los logs ya tienen pruebas automatizadas (`GoogleSignInTests`).

**No comparta contraseñas de Google con nadie ni las pegue en un chat:** no hacen falta, porque el navegador solo lo opera usted.

## Antes de empezar (una sola vez)

1. En Google Cloud Console, en el cliente OAuth, agregue este URI de redireccionamiento autorizado (el stack de QA usa el puerto 18080, distinto del de desarrollo):
   `http://localhost:18080/api/auth/google/callback`
2. Confirme que `.env` tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (los lee Compose; no se versionan).
3. Si la pantalla de consentimiento de Google está en modo «Prueba», agregue `Imc.edu.cr@gmail.com` como usuario de prueba.

## Fase 1: cuenta nueva (F0-G01)

```powershell
.\scripts\qa-phase0-stack.ps1 -KeepRunning
```

Cuando termine y deje el stack en marcha, abra `http://localhost:18080/ingresar`.

1. Pulse «Continuar con Google» y elija `Imc.edu.cr@gmail.com`.
2. Esperado: vuelve a la aplicación con la sesión iniciada, sin pedir contraseña, como `Member`.
3. Cierre sesión y repita: debe entrar de nuevo sin crear otra cuenta.

Reporte: si se cumplió cada punto y, si algo falló, el mensaje que vio en pantalla y el texto de la URL final.

## Fase 2: vincular a la cuenta del administrador de arranque (F0-G02)

El script recrea el stack desde cero, así que `Imc.edu.cr@gmail.com` vuelve a ser una cuenta desconocida. Esta vez se usa como correo del administrador de arranque:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "Imc.edu.cr@gmail.com"
.\scripts\qa-phase0-stack.ps1 -KeepRunning
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
```

1. Abra `http://localhost:18080/ingresar`, pulse «Continuar con Google» y elija esa misma cuenta.
2. Esperado: entra directamente a la cuenta del administrador existente (no crea una nueva).
3. Cierre sesión e intente entrar con correo y la contraseña de arranque de `.env`: debe fallar (la contraseña temporal quedó invalidada al vincular).
4. Entre otra vez con Google y abra Ajustes, Auditoría: debe aparecer el evento de vinculación con Google.

Reporte: si se cumplió cada punto.

## Pantalla de ingreso (F0-G12)

En `http://localhost:18080/ingresar`:

1. Recorra toda la pantalla solo con el teclado (Tab, Shift+Tab, Enter): el foco debe verse siempre y el botón de Google debe poder activarse.
2. Pulse «Continuar con Google» y, en la pantalla de Google, cancele: debe volver a `/ingresar` con un mensaje comprensible (no un código técnico).
3. Abra `http://localhost:18080/ingresar?error=failed`: debe mostrar un mensaje claro.

Reporte: qué mensajes vio y si algo no se podía alcanzar con el teclado.

## Limpieza

Al terminar, el script imprime el comando exacto de limpieza (`docker compose -p pastel-fase0-qa ... down -v`). Solo afecta al proyecto `pastel-fase0-qa`, no a su pila de desarrollo.
