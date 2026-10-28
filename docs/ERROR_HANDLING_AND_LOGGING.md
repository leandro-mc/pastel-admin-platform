# Gestión de errores y registros (logs) — estándar para toda la plataforma

Obligatorio para Identity, Platform y **todos** los módulos. Lo implementa la Fase 0 en `Pastel.Platform` y en `web/src/core`; los módulos solo lo usan.

## 1. Principios
1. **Quien usa la aplicación recibe un mensaje humano y accionable; quien opera el sistema recibe el detalle técnico en los logs.** Nunca al revés.
2. **Los fallos esperables no son excepciones.** Validación, "no encontrado", conflicto o permiso denegado se devuelven como `Result` y se traducen en un único lugar.
3. **Todo error inesperado deja rastro y un código de soporte** (`traceId`) visible para el usuario y buscable en los logs.
4. **Los logs nunca contienen secretos ni datos personales.** Se registran identificadores, no contenido.
5. **Registro técnico y auditoría son cosas distintas** (sección 5): no se mezclan.
6. **Un mismo patrón en todos los módulos.** Si un módulo necesita algo distinto, se pide autorización del propietario; no se inventa.

## 2. Errores en el backend

### 2.1 Modelo
- `Result` / `Result<T>` en `Pastel.SharedKernel` con `Error { Code, Type, Message, Details }`. `Type`: `Validation`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `Unexpected`.
- **Código estable** con el formato `<modulo>.<recurso>.<motivo>` en minúsculas (`cosecha.shipment.already_closed`, `identity.user.last_admin`). Transversales: `platform.validation_failed`, `platform.concurrency_conflict`, `platform.rate_limited`, `platform.unavailable`, `platform.unexpected`. Cada módulo mantiene sus códigos en un archivo `Errors.cs` y los documenta en su `MODULE.md`.
- `Message` en español de Costa Rica, sin tecnicismos, con el tono predeterminado de usted o impersonal (el voseo se admite si el propietario lo solicita), y siempre con la acción posible ("No se pudo guardar. Revise los datos e intente de nuevo.").
- Prohibido usar excepciones como control de flujo y prohibido devolver `ex.Message` al cliente.

### 2.2 Respuesta HTTP (RFC 9457, `application/problem+json`)
```json
{
  "type": "urn:pastel:error:validation",
  "title": "Hay datos que corregir",
  "status": 400,
  "detail": "Revise los campos marcados.",
  "code": "platform.validation_failed",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "errors": { "phone": ["Escriba 8 dígitos, por ejemplo 8888 1234."] }
}
```
La respuesta siempre incluye `traceId` (también en la cabecera `X-Trace-Id`). Nunca incluye pila, nombres de tablas ni SQL.

| Tipo | HTTP | Registro |
|---|---|---|
| Validation | 400 | Debug (sin ruido) |
| Unauthorized | 401 | Information (Warning si hay ráfaga) |
| Forbidden | 403 | **Warning + auditoría** |
| NotFound | 404 | Debug |
| Conflict | 409 | Information |
| Límite de tasa | 429 | Warning (con `Retry-After`) |
| Dependencia caída / reintentos agotados | 503 | Error |
| Unexpected | 500 | **Error con excepción y `traceId`** |

### 2.3 Traducción centralizada
Un único `IExceptionHandler` (en `Pastel.Platform`) con `AddProblemDetails()` reemplaza al middleware actual. Traduce:
- `DbUpdateException` con violación única (`23505`) → 409 con el campo afectado (p. ej. correo duplicado), sin exponer el nombre del índice.
- `DbUpdateConcurrencyException` → 409 `platform.concurrency_conflict` ("Este registro cambió mientras lo editaba…").
- Fallo de serialización (`40001`) o interbloqueo (`40P01`) → **reintento acotado** (2–3 intentos con espera breve); si se agota → 503/409, **nunca 500**.
- `OperationCanceledException` por cancelación del cliente → no se registra como error.
- Cualquier otra excepción → 500 genérico con `traceId`.

### 2.4 Concurrencia
Entidades editables con token de concurrencia (en PostgreSQL, `xmin` como versión de fila mediante la técnica vigente del proveedor Npgsql; verificar al implementar). Las actualizaciones reciben la versión esperada y devuelven 409 si cambió.

### 2.5 Fallos de segundo plano
Todo `BackgroundService` captura, registra con contexto y continúa; un fallo nunca tumba el host. Las operaciones periódicas son idempotentes.

## 3. Errores en el frontend

| Situación | Comportamiento |
|---|---|
| Validación (400 con `errors`) | Mensajes junto a cada campo + resumen enfocable; no se borra lo escrito |
| 401 | Un único refresco compartido (*single-flight*); si falla: pantalla de inicio de sesión con "Su sesión venció" y retorno a la ruta |
| 403 | Página "No tiene acceso a esta sección" con salida al hub |
| 404 | Página "No encontramos lo que busca" con salida clara |
| 409 de concurrencia | Diálogo "Este registro cambió"; ofrecer recargar **conservando** los cambios del usuario para compararlos |
| 429 | Mensaje con espera sugerida |
| Sin red / 503 | Aviso visible, datos del formulario conservados, reintento al volver la conexión |
| 500 / error de render | Pantalla de error con **código de soporte** (`traceId`) y botón "Reintentar" |

Reglas:
- Modelo único `ApiError { status, code, detail, errors, traceId }` en `core/api`. Los códigos se traducen a textos de `strings.ts`; si falta, se usa `detail`.
- Las respuestas se validan en tiempo de ejecución con `zod` en el borde de la API (se acabó el `as T`).
- `errorElement` por ruta del router y un límite de errores global; un fallo en un módulo no derriba el shell ni otros módulos.
- Reintentos automáticos solo en lecturas idempotentes (máx. 2, con espera creciente). **Nunca** reintento automático de escrituras.
- Prohibido `console.log` en código de producción (ESLint `no-console`). Se usa `core/log` (envoltorio) que solo reporta errores.
- Reporte de errores del cliente: `POST /api/client-errors` (límite 10/min por IP, cuerpo ≤ 8 KB, campos: mensaje, pila recortada a 2 KB, ruta, módulo, versión). El servidor lo registra como Warning `ClientError` y **no** lo guarda en la base. Sin datos escritos por el usuario.

## 4. Registros (logs)

### 4.1 Tecnología y formato
**Serilog** (`Serilog.AspNetCore`) con formato JSON compacto a la salida estándar (Docker recoge la salida). Plantillas de mensaje (`"Pedido {OrderId} cerrado"`), **nunca** interpolación de cadenas. Sin sumideros de pago en esta etapa; la estructura permite añadir otro destino después. Verificar versiones vigentes al instalar.

### 4.2 Campos obligatorios (enriquecimiento automático)
`@t` (UTC), nivel, plantilla, `TraceId`, `SpanId`, `RequestId`, `Module` (código del módulo), `UserId` (GUID, nunca el correo), `ClientIp` (IP real validada), `Environment`, `Version`, y `EventId` por módulo (rangos: Identity 1000–1999, Brisa 2000, Balance 3000, Ágora 4000, Cosecha 5000, Huella 6000, Plataforma 9000).

### 4.3 Niveles
| Nivel | Uso |
|---|---|
| Error | Fallos inesperados que requieren atención (5xx, dependencias caídas) |
| Warning | Anomalías que no son un fallo del sistema: acceso denegado, límite de tasa, reutilización de refresh token, error del cliente |
| Information | Eventos de negocio y seguridad relevantes (inicio/cierre de sesión, cierre de un envío) y resumen de petición |
| Debug | Solo desarrollo; apagado en producción |

Una petición genera **una línea de resumen** (método, plantilla de ruta, estado, duración, `TraceId`); no se registran cuerpos ni cabeceras.

### 4.4 Nunca se registra
Contraseñas ni hashes; tokens (acceso, refresh, CSRF); cookies; `Authorization`; **parámetros `code` y `state` de OAuth y tokens de Google** (excluir la cadena de consulta de `/api/auth/google/*`); `client_secret`; correos completos (usar `UserId`; para intentos con correo desconocido, un HMAC truncado); teléfonos, direcciones y datos personales de compradores, productores o perfiles; cuerpos de petición/respuesta; valores de parámetros SQL (`EnableSensitiveDataLogging` apagado fuera de desarrollo).

### 4.5 Eventos de seguridad (log + auditoría)
Inicio de sesión correcto y fallido, bloqueo, reutilización de refresh token, cambio y restablecimiento de contraseña, vinculación y alta con Google, cambios de roles/permisos/excepciones, bloqueo y desbloqueo de usuarios, acciones sobre cuentas administradoras, restauración del administrador de arranque, activación/desactivación de módulos y **accesos denegados (403)** (con límite para evitar inundar el registro).

### 4.6 Rotación y retención
Docker con controlador `json-file` y `max-size` y `max-file` definidos en `compose.yaml` (p. ej. 10 MB × 5). Tareas de limpieza periódicas: refresh tokens vencidos o revocados con más de 30 días; auditoría con retención configurable (`Retention:AuditDays`, por defecto sin borrado, decisión del propietario).

## 5. Registro técnico vs. auditoría
| | Log técnico | Auditoría |
|---|---|---|
| Para qué | Diagnosticar y operar | Responder "quién hizo qué y cuándo" |
| Dónde | Salida estándar (JSON) | Tabla en la base (`IAuditTrail`) |
| Contenido | Eventos técnicos, errores, tiempos | Acción, actor, objeto, **antes → después** (`DetailsJson`), módulo de origen, `TraceId` |
| Quién lo lee | Operación y agentes | Administración y el propietario |
| Se escribe | Siempre | En la misma transacción que el cambio (si el cambio falla, no queda rastro) |

`DetailsJson` se usa siempre que haya cambio de datos relevantes (permisos, precios, cantidades, estados). Las listas de auditoría y de usuarios tienen paginación y filtros en el servidor.

## 6. Salud y operación
`/health/live` (proceso vivo), `/health/ready` (base de datos alcanzable y migraciones de cada módulo aplicadas). Compose usa `ready` para el orden de arranque y los `healthcheck` de `api` y `web`.

## 7. Lista de verificación por módulo (se revisa en QA)
- [ ] Todo endpoint devuelve `problem+json` con `code` y `traceId` en errores.
- [ ] Los códigos de error del módulo están en `Errors.cs` y en `MODULE.md`.
- [ ] Sin `catch` vacíos ni `catch (Exception)` que traguen el error.
- [ ] Sin `ex.Message` en respuestas.
- [ ] Logs con plantillas, sin datos personales ni secretos; eventos de seguridad cubiertos.
- [ ] Cambios relevantes auditados con antes/después.
- [ ] Frontend: cada página tiene estados de carga, vacío y error; los formularios muestran errores por campo; 409 y 401 manejados.
- [ ] Pruebas de integración para cada código de error y para la ausencia de datos sensibles en logs.

## 8. Pruebas obligatorias (las escriben QA y Build a partir de este documento)
1. Cada traducción de excepción (único, concurrencia, serialización con reintento, cancelación, inesperado) produce el estado y `code` correctos y nunca filtra detalles.
2. `traceId` de la respuesta coincide con el del log del servidor.
3. **Redacción:** al ejecutar login, refresco y callback de Google, ningún log contiene contraseñas, tokens, cookies, `code` ni `state`.
4. `/health/ready` falla si la base de datos no está disponible y la API responde 503 coherente.
5. El manejador de errores del cliente (`/api/client-errors`) respeta límites y no almacena datos.
