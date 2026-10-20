# ADR-0003 — Ingreso con Google mediante OAuth/OIDC

- Estado: implementación publicada; prueba remota manual y regresiones de Build/QA pendientes.
- Contexto: un proveedor externo autentica la identidad; Pastel mantiene su propia sesión y autorización.

## Decisión
El ingreso de Google usa autorización por código con PKCE y los ámbitos mínimos `openid email profile`. La clave estable externa es `sub`, no el correo. El servidor emite la sesión propia de Pastel mediante cookies protegidas; no conserva tokens de Google. La integración es opcional: sin las dos credenciales de configuración, Google se anuncia como no disponible y la API debe seguir arrancando.

La vinculación por correo requiere que Google lo marque como verificado. Los errores de callback son genéricos y ni el `code`, ni el `state`, ni los secretos pueden acabar en logs.

## Consecuencias
El propietario configura el cliente OAuth y el URI de callback en Google Cloud. Las pruebas automatizadas deben usar un manejador remoto falso; la validación real con Google requiere un paso manual autorizado.

## Referencias
`docs/SECURITY.md` y `docs/phase0/GOOGLE_OAUTH_SETUP.md`.
