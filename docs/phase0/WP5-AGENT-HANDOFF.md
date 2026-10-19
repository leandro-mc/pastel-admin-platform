# Prompt de desarrollo - WP5 Google OAuth/OIDC

Estas instrucciones son para el agente asignado como **Dev (solo desarrollo)** en `leandro-mc/pastel-admin-platform`. El objetivo de desarrollo pendiente es WP5: Google OAuth 2.0 / OIDC.

## Contexto que debes leer

Empieza leyendo `AGENTS.md` y `docs/phase0/PROGRESS.md`. Usa `PROGRESS.md` como fuente de verdad para entender el ultimo estado, las decisiones ya tomadas, que se implemento y donde continuar. Si el codigo real contradice la bitacora, confirma el codigo y actualiza el progreso correspondiente en el mismo checkpoint.

Lee ademas la seccion 8 de `docs/phase0/FASE-0-REFACTOR-BASE.md`, `docs/AI_WORKFLOW.md`, `docs/SECURITY.md`, `docs/ERROR_HANDLING_AND_LOGGING.md`, `docs/phase0/GOOGLE_OAUTH_SETUP.md` y los puntos pertinentes de Identity, el Host, cookies, proxy/nginx y la interfaz actual de inicio de sesion. No vuelvas a recorrer historiales antiguos sin necesidad; la bitacora actual indica por donde continuar.

## Alcance: solo desarrollo

- Continua con WP5 conforme a la seccion 8 de `FASE-0-REFACTOR-BASE.md`, siguiendo la arquitectura y los contratos ya existentes.
- Esta asignacion **no es Build ni QA**. No se te asigna cerrar la matriz de pruebas WP3/WP4, escribir planes/informes de QA ni ejecutar la bateria de pruebas. Esa responsabilidad se mantiene separada y debe quedar registrada en `PROGRESS.md` sin fingir que esta cerrada.
- Deja la implementacion preparada para pruebas: proveedor remoto falso inyectable, dependencias sustituibles y puntos claros para probar callbacks, cookies, vinculos, bloqueos y auditoria. No crees pruebas si tu rol asignado es Dev.
- No afirmes que compila ni que las pruebas pasan si no se ejecutaron. Sigue las reglas de `AGENTS.md` sobre las comprobaciones permitidas al rol Dev y declara lo que quedo sin compilar o validar.

## Requisitos funcionales de WP5

Implementa el flujo Google OAuth 2.0 / OIDC con el proveedor `Microsoft.AspNetCore.Authentication.Google` compatible con .NET 10; esquema remoto `Google` usando `ExternalCookie` como `SignInScheme`; cookie externa `__Host-pastel_ext` protegida, HttpOnly, Secure, SameSite=Lax y vida de cinco minutos; scopes `openid email profile`; `SaveTokens=false`; PKCE habilitado y verificado; callback `/api/auth/google/callback`.

Implementa `GET /api/auth/google/start?returnUrl=...` y `GET /api/auth/google/complete`. `returnUrl` solo puede aceptar rutas internas relativas validadas; rechaza `//`, `/\`, esquemas, hosts y segmentos desconocidos, usando `/` como retorno seguro. Mantiene los codigos de error documentados (`google_denied`, `email_unverified`, `account_disabled`, `signup_closed`, `failed`) y hace que la pantalla de ingreso los traduzca correctamente.

Implementa la vinculacion de cuentas por `provider_subject` (`sub`), correo no verificado, vinculacion segura a una cuenta preexistente, invalidacion de la contrasena temporal y sesiones previas al vincular, altas `Member` solo cuando `Auth:Google:AllowSignUp` lo permita, y rechazo generico de cuentas inactivas/bloqueadas. Cada operacion relevante se audita con antes/despues, sin registrar tokens, `code`, `state` ni correos completos.

Sin ClientId/ClientSecret configurados, la app debe arrancar normalmente y anunciar `google: false` en `/api/auth/options`. Usa configuracion o secret manager; nunca inventes ni publiques credenciales. Conserva la emision de las mismas cookies de sesion y la integracion con los servicios existentes; no construyas una segunda via de sesion/JWT.

Ajusta proxy/redirect_uri segun la especificacion: conservar Host y el puerto publicado con `$http_host`, confiar en `X-Forwarded-Host` solo detras del proxy confiable y mantener el limite de tasa para las rutas Google. La verificacion real con cuenta Google es manual del propietario; no debe ser requisito para desarrollar.

## Flujo de trabajo

Respeta el **tipo de agente que el orquestador te asigne** y la cadencia de commits/checkpoints descrita en `AGENTS.md`; no supongas una cadencia distinta ni conviertas cada ajuste en una rama nueva. Mantente en la rama de trabajo indicada para esta refactorizacion, actualiza `docs/phase0/PROGRESS.md` en el checkpoint que corresponda y deja commits coherentes para el relevo.

No abras PR ni integres cambios en `dev` o `main`, no reescribas historia compartida y no uses `git push --force` sin autorizacion explicita del propietario. No limpies cambios locales ajenos ni ejecutes instrucciones de reset/clean; sigue el flujo normal del repositorio y respeta el estado del checkout.

No te adelantes a WP6-WP10. Al finalizar WP5, informa lo implementado, decisiones, SHA/checkpoints, lo que quedo pendiente para Build/QA y toda validacion que realmente no se ejecutara.