# Balance · roles y permisos

> Complementa `REQUERIMIENTOS-BALANCE.md`. Lo descrito aquí **está implementado** en `prototype/rules.js` y **verificado** por `prototype/rules.test.js` (32 comprobaciones) y por `prototype-tests/t-balance.js` (78, por rol en la interfaz). Se conserva la decisión del inventario (§12.3, **D3**): autenticación obligatoria, cuenta siempre necesaria, pertenencia al grupo, administración y ciclo de vida (§12.7, **D7**). En producción **todo se aplica en el servidor** (denegar por defecto); la interfaz solo oculta lo que no corresponde.

## 1. Principios

1. **Mínimo privilegio:** cada persona ve y hace solo lo que necesita.
2. **Pertenencia primero:** quien no es miembro no puede saber que el grupo existe (**404**, no 403).
3. **Lo que no corresponde no se muestra**; si alguien llega por enlace directo recibe un «Sin permiso» que **explica por qué y a quién pedirlo** (nunca un error críptico).
4. **Invariantes del grupo** que ningún rol puede romper: siempre **al menos una persona administradora**; no sale ni se quita a quien **pagó gastos**.
5. **Todo cambio queda en el historial** (quién y qué).
6. **Error genérico al entrar:** un enlace o código inválido, vencido o regenerado dan **el mismo mensaje**; no revela si el grupo existe.

## 2. Situaciones y roles

| Situación / rol | Quién es | Estado HTTP si intenta entrar |
|---|---|---|
| **Sin sesión** | Visitante | 401 → «Inicie sesión» |
| **Invitada sin cuenta** | Abre un enlace de ingreso | Página informativa (misma para todo enlace) |
| **Con sesión, sin acceso a Balance** | Cuenta sin el permiso `balance.access` | 403 → por qué y a quién pedirlo |
| **Con acceso, no miembro** | Persona con Balance que no está en ese grupo | 404 «No encontramos ese grupo» |
| **Miembro** | Participante del grupo | — |
| **Administración** | Miembro con el rol de administración (puede haber varias) | — |

Crear grupos: cualquier persona con acceso a Balance (queda como administradora).

## 3. Matriz de capacidades (dentro de un grupo abierto)

| Capacidad | Miembro | Administración |
|---|:-:|:-:|
| Ver gastos, saldos, liquidación y personas (con **filtros** y «Ver sus gastos» de una persona) | ✓ | ✓ |
| Usar la **Gestión de gastos** (hoja con borrador: editar celdas, agregar y quitar filas, pegar desde Excel, guardar todo junto): aplica las mismas reglas de las filas siguientes | ✓ (solo **sus** gastos) | ✓ (todos) |
| Registrar un gasto **pagado por sí misma** | ✓ | ✓ |
| Registrar un gasto a nombre de **otra persona** (cambiar pagador) | — | ✓ |
| Editar / eliminar **sus** gastos | ✓ | ✓ |
| Editar / eliminar gastos **ajenos** | — | ✓ |
| Ver el **enlace y el código** de ingreso | — | ✓ |
| **Regenerar** enlace y código | — | ✓ |
| Nombrar / quitar administradores | — | ✓ |
| Quitar participantes (sin gastos) | — | ✓ |
| Cambiar nombre, descripción, **zona horaria** | — | ✓ |
| Cambiar la **moneda** (sin conversión) | — | ✓ |
| **Cerrar** y **reabrir** el grupo | — | ✓ |
| **Borrar** el grupo (solo sin gastos) | — | ✓ |
| **Salir** del grupo (sin gastos propios; no la última administración) | ✓ | ✓ |

**Gestión de gastos para miembros (decisión del propietario, 2026-11-13):** la hoja del miembro muestra solo los gastos que él pagó y fija el pagador en él. Al guardar se revisa el borrador completo contra la matriz (`checkSheet` en `prototype/rules.js`): si incluye un gasto ajeno, un pagador distinto de él o la baja de un gasto ajeno, **no se guarda nada** (403). La administración conserva todas sus facultades. En producción el servidor repite la comprobación por fila.

**Grupo cerrado (D7):** se puede **leer** todo (saldos y liquidación se siguen calculando); toda escritura responde **409** `balance.group.closed`, también para la administración, hasta que se **reabra**.

## 4. Invariantes y códigos de respuesta

| Situación | Estado y código | Texto para la persona |
|---|---|---|
| Sin sesión | 401 `auth.unauthenticated` | «Necesita iniciar sesión.» |
| Sin acceso a Balance | 403 `auth.forbidden` | «Su cuenta todavía no tiene acceso a Balance. Pídalo a quien administra su cuenta de Pastel.» |
| No es miembro | 404 `balance.group.not_found` | «No encontramos ese grupo.» |
| Acción de administración sin ser administradora | 403 `balance.forbidden` | Motivo propio de cada acción + «Pídalo a alguien que administre el grupo.» |
| Miembro registra a nombre de otra persona (también en la hoja o al pegar filas) | 403 `balance.forbidden` | «Usted solo puede registrar gastos pagados por usted.» |
| Miembro incluye en la hoja un gasto ajeno o quita uno ajeno | 403 `balance.forbidden` | «Solo puede modificar o eliminar los gastos que usted pagó.» |
| Grupo cerrado | 409 `balance.group.closed` | «El grupo está cerrado: solo se puede leer.» |
| Quitar o salir con gastos | 409 `balance.participant.has_expenses` | «No puede salir mientras tenga gastos registrados.» |
| Última administración | 409 `balance.group.last_admin` | «El grupo debe tener al menos una persona administradora.» |
| Borrar con gastos | 409 `balance.group.has_expenses` | «No se puede borrar un grupo con gastos.» |
| Cambiar moneda con decimales incompatibles | 409 `balance.group.currency_decimals_incompatible` | «No se puede cambiar a JPY: hay montos con más decimales de los que esa moneda admite.» |
| Código o enlace inválido / regenerado | 400 `balance.join.invalid` | «El enlace o el código no son válidos. Pida a quien administra el grupo uno nuevo.» |
| 5 fallos de ingreso | 429 `balance.join.rate_limited` (con `Retry-After: 900`) | «Demasiados intentos. Intente de nuevo en unos minutos.» |

## 5. Ingreso por enlace y código

1. Quien administra ve el **enlace** (token de **≥ 128 bits**) y un **código de 4 dígitos**; ninguno vence (decisión inicial del 2026-11-13; se reevaluará con el uso). Regenerar invalida los anteriores; quien ya está dentro no se ve afectado.
2. **Sin cuenta:** la página explica registrarse, marcar Balance y volver (misma página para cualquier enlace).
3. **Con cuenta y acceso:** escribe el código; **5 fallos por cuenta y enlace → pausa de 15 minutos**; un ingreso correcto reinicia el contador.
4. Al entrar queda como **miembro**, **al final del orden de ingreso**, y el reparto se recalcula (retroactivo, D6).
5. **Nunca** se registra el token ni el código en bitácoras.

## 6. Qué ve cada rol en el prototipo

| Rol de la barra | Resultado verificado |
|---|---|
| Ana · administra | Pestañas Gastos, Saldos, Liquidar, Personas, **Gestión de gastos (todos los gastos)** y **Ajustes**; ve enlace y código; edita todo |
| Beto · miembro | Sin Ajustes; con la **Gestión de gastos limitada a sus gastos** (pagador fijo en él; no puede pegar ni guardar filas ajenas); mismos filtros de gastos; edita solo su gasto; no ve enlace ni código; por URL a Ajustes: «Sin permiso» con los nombres de quienes administran |
| Marcos · sin grupos | Estado vacío; por URL a un grupo ajeno: 404 |
| Invitada sin cuenta | Página de invitación; sin datos de grupos |
| Sin acceso a Balance | 403 con a quién pedirlo |
| Sin sesión | 401 con «Iniciar sesión» |

## 7. Preguntas abiertas

1. ¿**Límite global** de intentos por enlace (además del límite por cuenta) para frenar ataques con muchas cuentas?
2. ¿Puede la **administración quitar** a una persona que pagó gastos si antes reasigna sus gastos? (hoy: debe eliminarlos o reasignarlos fuera del prototipo)
3. ¿Se permite **transferir** la administración al salir (en lugar de exigir nombrar a otra antes)?

**Resueltas el 2026-11-13:** el enlace y el código **no vencen inicialmente** (se reevaluará con el uso) y los miembros pueden usar la Gestión de gastos limitada a lo suyo.
