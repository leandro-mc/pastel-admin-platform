# ADR-0001 — Ventana de gracia para refresh tokens concurrentes

- Estado: propuesta implementada en código; pendiente de validación por Build.
- Fecha: 2026-10-18.
- Contexto: WP4 / S2 de `docs/phase0/FASE-0-REFACTOR-BASE.md`.

## Contexto y problema

Dos peticiones de pestañas del mismo navegador pueden enviar casi al mismo tiempo un mismo refresh token. La primera lo rota; la segunda encuentra el token revocado. Tratar inmediatamente esa segunda petición como reutilización maliciosa revocaba todas las sesiones incluso cuando la causa era concurrencia legítima.

## Decisión

1. `Auth:Refresh:ReuseGraceSeconds` determina la ventana de gracia; el valor predeterminado es 10 segundos y la configuración se valida en el rango de 0 a 60. El valor 0 desactiva la gracia.
2. Al rotar un token, se conserva en su fila el hash del token sucesor, el fin de la gracia y una copia cifrada del sucesor solo durante esa ventana. El token en texto plano no se almacena.
3. La protección del sucesor usa AES-GCM con nonce aleatorio y etiqueta de autenticación. La clave se deriva de la clave JWT configurada con separación de propósito (`Pastel.Identity.RefreshGrace.v1`); el propósito también se usa como datos asociados autenticados.
4. Si la misma petición presenta el token anterior dentro de la ventana, solo se acepta cuando el sucesor sigue vigente, no revocado y la cuenta continúa activa. El servidor devuelve un access token nuevo y el mismo refresh token sucesor, sin crear otra fila ni rotarlo otra vez.
5. Una reutilización de un token que ya fue rotado fuera de la ventana revoca los refresh tokens restantes, incrementa `TokenVersion` y registra `auth.refresh.reuse-detected`.
6. Un token revocado sin sucesor (por logout o revocación administrativa) devuelve sesión expirada, pero no se clasifica como reutilización. Durante la gracia, si el sucesor ya fue invalidado por una rotación concurrente posterior, se responde con sesión expirada sin revocar todas las sesiones.

## Consecuencias y riesgos

- `RefreshToken` añade `GraceUntil` y `ReplacedByEncryptedToken`. Build debe generar la migración inicial con `dotnet ef`; no se escribe una migración manual.
- La consulta concurrente se ejecuta dentro de la transacción serializable existente. Build debe comprobarla con PostgreSQL real, incluidas dos solicitudes simultáneas, reutilización fuera de la ventana, logout y revocación por cambio de contraseña.
- La clave de protección deriva de la clave JWT activa. Una rotación de clave durante la breve ventana puede impedir descifrar el sucesor: el sistema falla de forma cerrada (no acepta el token viejo y no revoca todas las sesiones por esa sola falla). La rotación de claves debe tener en cuenta esta ventana.
- El frontend implementará *single-flight* en WP7. La ventana de gracia es una protección backend complementaria, no un sustituto de la coordinación de peticiones del cliente.

## Validación pendiente

No se pudo ejecutar compilación ni pruebas en el entorno de autoría: no hay .NET SDK ni Docker, y no hay resolución DNS a GitHub/NuGet. Build debe compilar la solución, generar la migración con EF Core y ejecutar las pruebas de concurrencia y de expiración descritas arriba.
