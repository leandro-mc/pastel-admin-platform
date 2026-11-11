# Balance — Requerimientos v3 (rediseño sobre las decisiones D1–D9)

> **Estado:** propuesta para validación del propietario · **Rama:** `research/brisa-balance-prototypes` (desde `research/requirements-and-prototypes`) · **Fecha:** 2026-11-09
> **Prototipo:** [`prototype/`](prototype/index.html) — diseño **nuevo** (no una copia de SaldApp), 6 roles, 3 grupos de ejemplo (colones con centavos sobrantes, grupo cerrado, yenes). Datos **ficticios**, en memoria.
> **Fuente funcional:** [`INVENTARIO-BALANCE.md`](INVENTARIO-BALANCE.md) (SaldApp tal como es + decisiones D1–D9 en su §12, que **prevalecen**). Quién puede qué: [`ROLES-Y-PERMISOS.md`](ROLES-Y-PERMISOS.md). Por qué se diseñó así: [`INVESTIGACION-BALANCE.md`](INVESTIGACION-BALANCE.md).

---

## 0. Resumen ejecutivo

**Qué es Balance.** Gastos compartidos entre personas que se conocen (un paseo, una casa, un cumpleaños): se registra **quién pagó qué**, se reparte en partes iguales y se dice **quién le paga a quién** para dejar las cuentas claras. Hoy existe como **SaldApp** (backend y frontend aparte); Balance será su módulo dentro de Pastel, empezando **desde cero** (D5: no se importan datos).

**Qué se hizo.** El propietario no estaba conforme con el diseño actual. Se investigó (competencia, psicología del dinero entre amistades, contexto costarricense, algoritmos de liquidación) y se **rediseñó** el producto sin tocar las reglas aprobadas. Las reglas de dinero y de acceso (D1–D9) se implementaron en **código ejecutable y se probaron con los casos dorados del inventario**, de modo que el diseño nuevo descansa sobre números que ya sabemos correctos.

**Ideas del rediseño**
1. **La situación personal primero.** Al abrir un grupo, lo primero es *su* situación («Le deben ₡136 404,10» / «Usted debe ₡25 365,65» / «Está al día»), con el total del grupo, su parte y lo que pagó. SaldApp mostraba una tabla de todos.
2. **Las cuentas se leen en voz humana.** Cada saldo lleva signo **y palabras** («Le deben», «Debe»), nunca solo color. La deuda **no es un error**: no hay rojo/verde moralizante; el que debe se muestra en **ámbar**, el que recibe en **verde azulado**.
3. **La liquidación es un recibo.** «Liquidar» presenta la lista como una cinta de recibo: *quién paga a quién y cuánto*, con **los pagos de la persona destacados** y «Copiar monto» (sin registrar pagos, D6).
4. **Cada grupo, un lugar propio.** «Sus grupos» con estado en texto (Abierto/Cerrado), moneda y su situación; ya no hay que recordar un número de grupo (problema 10.3.1 de SaldApp).
5. **El ingreso es una conversación, no un trámite.** Enlace + código de 4 dígitos, con una página que explica qué hacer a quien **no tiene cuenta** (el obstáculo principal de adopción en esta categoría; ver investigación §3).
6. **Mobile primero.** Los gastos se registran en la calle: pestañas inferiores, botón flotante «Registrar gasto», cifras grandes y táctiles.

**Hallazgos de la v3 (detalle en `../DECISIONES-Y-HALLAZGOS.md`):**
- **El inventario dice «41 códigos ISO» pero su tabla trae 40.** Se implementaron los 40; falta confirmar si se omitió uno.
- **El motor de dinero reproduce exactamente los resultados esperados** de G01–G41, incluido G26 (20 integrantes, 19 pagos) y las propiedades en 6 000 escenarios aleatorios (partes y saldos exactos, a lo sumo *n−1* pagos, independiente del orden).
- **Tensión de diseño D3 ↔ adopción:** exigir cuenta de Pastel con Balance es decisión del propietario; la competencia que no la exige (Tricount, Splid) lo usa como ventaja. Se mitiga con la página de invitación, no se cambia la decisión (ver §10 y preguntas abiertas).
- **Tensión D6 ↔ equidad percibida:** el reparto en partes iguales sin participación parcial es simple, pero la evidencia muestra que repartir igual **no siempre se siente justo** (investigación §2). Se deja como riesgo y pregunta, no se cambia D6.

---

## 1. Diagnóstico de SaldApp (inventario §10.3) y qué atiende el rediseño

| # | Problema de SaldApp | Respuesta en Balance |
|---|---|---|
| 1 | No hay forma de encontrar un grupo propio; los IDs son consecutivos | «Sus grupos» + pertenencia (D3) |
| 2–3 | Decimales dudosos; sin validación en el cliente; errores en inglés | Campo de monto con coma o punto, validación en cliente **y** servidor, mensajes en español junto al campo (D4) |
| 4 | Cálculos de pantalla ≠ servidor (coma flotante) | Todo en unidades mínimas enteras (`BigInt`); en producción, el servidor calcula |
| 5 | Saldo sin símbolo de moneda | Siempre símbolo; código ISO junto al total y al selector (D8) |
| 6 | «No hay deudas pendientes» con residuo | D1 elimina el residuo; el mensaje distingue «sin gastos» de «cuentas claras» |
| 7 | Falla silenciosa de liquidación | Estados de error con acción (patrón de Pastel) |
| 8 | Editar un gasto exige saber quién lo pagó | Lista de **todos** los gastos con orden definido; editar desde la fila |
| 9 | Parpadeo («Cargando…» reemplaza todo) | Se conserva el contexto al recalcular |
| 10 | Moneda editable con datos, símbolos con espacios | Moneda ISO por grupo con cambio **sin conversión** y bloqueo si hay decimales incompatibles (D8) |
| 11 | Accesibilidad deficiente | Diálogos con rol y foco, Esc, nunca solo color, texto ampliable |
| 12 | Voseo y errores de redacción | Trato de usted, textos revisados |
| 13 | Cierre irreversible | Cerrar y **reabrir** (D7); título «Liquidación (grupo cerrado)» |
| 14 | Sin control de concurrencia | Requerido para producción (409 por versión); **no** se prototipa |

---

## 2. Investigación aplicada (resumen; detalle en [`INVESTIGACION-BALANCE.md`](INVESTIGACION-BALANCE.md))

| Hallazgo | Confianza | Decisión que provoca |
|---|---|---|
| Quien divide la cuenta **en partes iguales** tiende a gastar más (estudio de Gneezy y colegas, 2004); muchos eligen partes iguales **por comodidad y por miedo a parecer tacaños** | B / C | Reparto igual sin participación parcial (D6) es simple pero puede **sentirse injusto**: se deja como riesgo y pregunta abierta |
| Las apps que **no exigen cuenta** para entrar (Tricount, Splid) reducen la fricción de invitar | B / C | La invitación a quien no tiene cuenta tiene página propia, pasos claros y vuelve al código al terminar |
| El plan gratuito de Splitwise limita entradas diarias; en esta categoría **el tope de uso gratis** es motivo habitual de cambio | C | Balance no limita entradas en el MVP; costo y límites son decisión del propietario |
| La liquidación con **mínimo de transferencias es un problema difícil (NP-difícil)**; cualquier método voraz garantiza a lo sumo *n−1* pagos | A (teoría) / B | D2 (voraz determinista) es la elección correcta; «minimizar» queda opcional (G32) |
| **SINPE Móvil** domina las transferencias entre personas en Costa Rica; hay fraudes con comprobantes falsos y el BCCR prepara QR y alias | B / C | «Copiar monto» (exacto, con coma decimal); aviso para **verificar el pago en la cuenta propia** antes de darlo por recibido |

---

## 3. Actores y empatía

Seis situaciones (rol de la barra de desarrollo). Personas simuladas y entrevistas en la investigación §5.

| Rol | Persona | Qué ve | Qué NO ve |
|---|---|---|---|
| **Ana · administra el paseo** | Organizadora | Todo del grupo, **enlace y código**, ajustes, cerrar/reabrir, nombrar administradores | — |
| **Beto · miembro** | Participante | Todo lo del grupo (gastos, saldos, liquidación, personas); registra y edita **solo sus** gastos | Enlace, código y ajustes del grupo |
| **Marcos · con acceso, sin grupos** | Persona nueva | «Todavía no está en ningún grupo» + crear o abrir enlace | Grupos ajenos (por URL: «No encontramos ese grupo») |
| **Invitada sin cuenta** | Quien recibe un enlace | Página informativa: registrarse, marcar Balance, volver con el código | Datos de cualquier grupo; **la misma página** para enlaces válidos e inválidos |
| **Con sesión, sin acceso a Balance** | Cuenta sin el módulo | Por qué no entra y a quién pedirlo (403) | Todo |
| **Sin sesión** | Visitante | «Inicie sesión…» (401) | Todo |

---

## 4. Principios

1. **Cuentas claras, sin juicio.** La deuda es un número, no una falta.
2. **Primero lo mío.** Cada pantalla de grupo abre con *su* situación.
3. **Cada saldo se explica en palabras y en cifra**; nunca solo color.
4. **El dinero es exacto o no se muestra.** Unidades mínimas enteras; las partes suman el total; los saldos suman cero.
5. **Lo que no puedo hacer no estorba; lo que se deniega se explica.** El rol decide qué se muestra; si se deniega, se dice por qué y a quién pedirlo.
6. **Una lista para todos.** La liquidación es determinista: la misma para todas las personas del grupo.
7. **Primero el teléfono.**

---

## 5. Experiencia (pantallas)

### 5.1 Estructura
**Escritorio:** barra lateral «Sus grupos» + contenido; encabezado de grupo con chips (Abierto/Cerrado, `CRC · ₡`, personas, su rol), tarjeta **«Su situación»**, pestañas **Gastos · Saldos · Liquidar · Personas · Ajustes** (esta solo para quien administra). **Móvil:** pestañas inferiores (4 o 5) y botón flotante **«Registrar gasto»**; el botón del encabezado se oculta para no duplicarlo.

### 5.2 Sus grupos
Tarjetas con nombre, descripción, estado (icono **y** texto), moneda, personas y **su situación**. Acciones: «Nuevo grupo» y «Tengo un enlace». Estado vacío con esos dos caminos.

### 5.3 Gastos
Lista de **todos** los gastos del grupo, del más reciente al más antiguo (empate por orden de registro). Cada fila: descripción, «Pagó X · fecha», monto y las acciones **que la persona puede hacer** (editar/eliminar solo los propios para miembros). Estado vacío con el primer paso. Grupo cerrado: aviso y, para quien administra, «Reabrir el grupo».

**Registrar/editar gasto** (diálogo): descripción (4–500), **monto** con sufijo de moneda y teclado numérico/decimal, **pagador** (quien administra elige a cualquiera; un miembro solo se tiene a sí mismo, bloqueado y explicado), **fecha** (por defecto hoy en la zona del grupo, editable, D7). Errores junto al campo, con icono y texto.

### 5.4 Saldos
Una fila por persona: inicial, nombre, «#n en el orden de ingreso · pagó X · su parte Y», saldo **en palabras y cifra** y una **barra con eje central** (a la izquierda lo que debe, a la derecha lo que le deben; decorativa, `aria-hidden`). Si el reparto deja unidades mínimas sobrantes, un aviso explica que se asignan por orden de ingreso y que las partes suman exacto.

### 5.5 Liquidar
**Recibo**: «Liquidación sugerida» (o «Liquidación (grupo cerrado)», D7), número de pagos, cada pago como «Elena le paga a usted ₡70 596,15» con **los de la persona resaltados**, «Copiar monto» en los pagos propios y «Total que se mueve» con código de moneda. Debajo: *Balance no registra pagos; la lista se recalcula con cada cambio y es la misma para todas las personas del grupo.* Estados: sin gastos («Todavía no hay nada que liquidar») y cuentas claras.

### 5.6 Personas
Lista en **orden de ingreso** (decide los centavos sobrantes) con rol; quien administra ve acciones (nombrar/quitar administrador, quitar) y el **cuadro de enlace y código** (copiar, regenerar con confirmación). Todas las personas ven «Salir del grupo». Las acciones bloqueadas por invariantes **se intentan y se explican** (tiene gastos, último administrador).

### 5.7 Ajustes (solo administración)
Nombre, descripción, **zona horaria** (D9), **moneda** (cambio sin conversión con aviso y bloqueo por decimales incompatibles, D8), cerrar/reabrir, borrar (solo sin gastos) e **historial**. Quien no administra y llega por URL ve «Sin permiso» con el motivo y los nombres de quienes administran.

### 5.8 Crear grupo y entrar a uno
**Crear:** nombre obligatorio, descripción, moneda (15 más usadas primero, luego todas, con código · símbolo · nombre), zona horaria; la persona queda como administradora y se abre «Personas» con su enlace y código. **Entrar:** enlace + código de 4 dígitos (teclado numérico); **error genérico** idéntico para enlace o código inválidos o regenerados; **5 fallos → pausa de 15 minutos** con mensaje; éxito → miembro, al final del orden de ingreso.

### 5.9 Estados por situación
Sin sesión, sin acceso, no encontrado (404 para no miembros), sin permiso, error de carga, vacío. Todos con acción o explicación.

---

## 6. Requerimientos funcionales

| ID | Requerimiento | Origen | Prioridad | Cómo se prueba |
|---|---|---|---|---|
| **BL-01** | Reparto en partes iguales con **centavos sobrantes por orden de alta**; partes suman el total; saldos suman 0 | D1 | Obligatorio | `money.test.js`: G02, G03, G10–G13, G23, G26 + 6 000 escenarios |
| **BL-02** | **Liquidación determinista** (mayor monto primero, empate por orden de alta; reordena tras cada pago); a lo sumo *n−1* pagos; falla si los saldos no suman 0 | D2 | Obligatorio | G04, G05, G23, G24, G26, G30–G33 |
| **BL-03** | Autenticación obligatoria; **pertenencia**; roles administración/miembro; matriz de permisos | D3 | Obligatorio | `rules.test.js` (26) + `t-balance.js` |
| **BL-04** | **Ingreso por enlace y código de 4 dígitos**; error genérico; 5 fallos → 15 min; regenerar invalida el anterior | D3 | Obligatorio | `rules.test.js`; UI |
| **BL-05** | Campo de monto: coma o punto, decimales según moneda, mayor que cero, hasta `numeric(18,2)`; mensajes en español | D4 | Obligatorio | G28, G38; UI |
| **BL-06** | Balance inicia **desde cero** | D5 | Decidido | — |
| **BL-07** | Reparto **retroactivo**, sin participación parcial; transferencias **sugeridas**, sin registrar pagos | D6 | Decidido | G18, G19; texto de Liquidar |
| **BL-08** | **Ciclo de vida:** cerrar, **reabrir**, borrar solo sin gastos; fecha del gasto editable; título «Liquidación (grupo cerrado)» | D7 | Obligatorio | `rules.test.js`; UI |
| **BL-09** | **Moneda ISO 4217 por grupo**; símbolo + código; cambio **sin conversión**; bloqueo si hay decimales incompatibles | D8 | Obligatorio | G35–G41; UI |
| **BL-10** | **Zona horaria por grupo** (IANA); «hoy» sale de ella | D9 | Obligatorio | prueba de frontera de zona |
| **BL-11** | **Sus grupos**, **su situación** en cada grupo, lista de **todos** los gastos | §10.3 (1, 8) | Obligatorio | UI |
| **BL-12** | **Sin permiso explica** el porqué y a quién pedirlo; lo que no corresponde no se muestra | Método | Obligatorio | UI por rol |
| **BL-13** | Página para **quien no tiene cuenta** (registrarse, marcar Balance, volver); idéntica para cualquier enlace | D3, investigación | Nuevo en v3 | UI |
| **BL-14** | «**Copiar monto**» en los pagos propios (sin registrar pagos) | Investigación (SINPE) | **Propuesta v3** (no aprobada) | UI |
| **BL-15** | Historial de cambios del grupo (quién y qué) | D7 (auditoría) | Obligatorio | UI |
| **BL-16** | Edición simultánea → 409 por versión | §3.2 / ficha | Obligatorio en producción | **No prototipado** |
| **BL-17** | Accesibilidad: diálogos con rol y foco, Esc, texto ampliable, nunca solo color, 320 px | `AGENTS.md` | Obligatorio | UI; contraste |

---

## 7. Reglas de dinero (resumen)

- **D1:** `total ÷ n` en unidades mínimas; sobran `total mod n`, que se reparten **de una en una a las primeras personas por orden de alta**. Ej.: ₡100,00 entre 3 → 33,34 / 33,33 / 33,33.
- **D2:** deudores y acreedores ordenados por monto descendente y, en empate, por orden de alta; se paga el mínimo entre el primer deudor y el primer acreedor; **se reordena con la misma clave** después de cada pago. Ej. G23 (5 personas): Elena→Ana 91,15 · Diego→Ana 67,69 · Diego→Beto 23,45 · Carla→Beto 10,90.
- **D4:** monto positivo, con los decimales de la moneda (0 en CLP, JPY, KRW y PYG); máximo `numeric(18,2)`.
- **D8:** ISO 4217; cambiar la moneda **reexpresa** («10 EUR» pasan a «10 USD»), no convierte; se rechaza si algún monto tiene más decimales de los que admite la nueva moneda.
- **Tope de pagos:** a lo sumo (deudores + acreedores − 1). **No es mínimo** (G32 da 4 donde 3 bastaría): se acepta por ser determinista y simple de explicar.

---

## 8. Modelo de datos (delta respecto a la ficha)

Sin cambios de esquema. El prototipo usa: `Group{name, description, currency, tz, closed}`, `Participant{person, role, orden de alta}`, `Expense{description, payer, amount(decimal), date}`, `JoinCredential{token, code}`, `Audit{at, who, what}`. Los montos se guardan como **decimal en la moneda del grupo** (no como unidades), lo que hace natural reexpresar al cambiar de moneda. En producción, token de **≥ 128 bits de un generador criptográfico**, nunca en registros.

---

## 9. No funcionales

- **Exactitud:** aritmética entera (`BigInt` en el prototipo; `decimal`/entero en el servidor). Cero coma flotante en dinero.
- **Seguridad:** denegar por defecto; 404 para no miembros (no revela existencia); error genérico de ingreso; límite de intentos por cuenta y enlace; token de alta entropía; auditoría.
- **Accesibilidad:** AA en claro y oscuro (`contrast.py`: 213 pares en total, 119 de Brisa y Balance, incluidos los **componentes**: borde de campo, barras, foco); objetivos de 44 px; nunca solo color; texto ampliable (A / A+ / A++).
- **Texto:** español de Costa Rica, **usted**, sin voseo; cifras con espacio fino como separador de miles y coma decimal (`₡1 234,56`).
- **Rendimiento:** grupos de hasta 20 integrantes y cientos de gastos sin recálculo perceptible (G26).

---

## 10. Riesgos

| Riesgo | Mitigación / estado |
|---|---|
| **Fricción de la cuenta obligatoria (D3)**: a quien le llega un enlace por WhatsApp y no tiene cuenta puede abandonar | Página de invitación con pasos y regreso; «Preselección de Balance al registrarse» sigue pendiente (inventario §12.11); medir abandono antes del código |
| **Partes iguales que no se sienten justas (D6)** | Decidido por el propietario. Alternativa mínima sin romper D6: crear dos grupos; si la evidencia de uso lo pide, evaluar «excluir de un gasto» (cambia D1/D6) |
| **Pago fuera de la app (SINPE)**: nada confirma que se pagó; comprobantes falsos | Texto de apoyo («verifique en su cuenta»); registrar pagos es D6 no aprobado |
| **Discrepancia de 41 vs 40 monedas** en el inventario | Pendiente de confirmar con el propietario |
| **Tokens en enlaces** pueden filtrarse | Regenerar invalida; límite de intentos; no vencen por decisión (se podría proponer vencimiento) |
| **Concurrencia** | BL-16; no probado en el prototipo |

---

## 11. Dirección visual (propuesta del prototipo)

**Concepto «cuentas claras»**: papel frío y tinta, una marca verde azulada y un ámbar. Nacida del contenido, no de una plantilla.
- **Color:** marca (verde azulado) `#0b6a6f` claro / `#5cc3c6` oscuro = **lo que le deben**; ámbar `#8a4a00` / `#f2b866` = **lo que debe**; fondo `#eef1f3` / `#0e151a`; tinta `#14212b` / `#e7eef3`. Avisos: ámbar suave (cerrado) y rojo **solo para errores reales**. Todo medido con WCAG (≥ 4,5:1 texto, ≥ 3:1 componentes). Sin morado.
- **Por qué no rojo/verde:** deber no es fallar; el rojo/verde además falla para daltonismo. Se separan por matiz (azul-verdoso vs. ámbar), por **signo y palabras**, y por la posición en la barra.
- **Tipografía:** Public Sans (neutra y legible, con tildes y cifras claras), con respaldo del sistema; las cifras piden `tabular-nums` para alinear columnas **si la fuente lo ofrece** (a verificar en la revisión visual; sin esa función, las columnas siguen siendo legibles). En producción, autoalojada.
- **Motivos con razón de ser:** el **recibo** (cinta con borde dentado y totales con línea punteada) para Liquidar, porque es el objeto real que la gente conoce; la **barra con eje** para Saldos, porque un balance es una balanza. Sin decoraciones.
- **Tema:** `light-dark()` con `color-scheme: light dark`; la barra de desarrollo fija Auto/Claro/Oscuro.

---

## 12. Métricas (sin vanidad)

Tiempo para **registrar el primer gasto** (< 30 s); proporción de invitaciones que **terminan en ingreso** (por paso: enlace abierto, cuenta creada, código escrito); **disputas** (gastos editados o eliminados por otra persona de administración tras registrarse); grupos que **llegan a «cuentas claras»**; errores de monto por campo. **No** medir tiempo en la app ni volumen de gastos.

---

## 13. Qué demuestra el prototipo (y qué no)

**Demuestra:** el diseño nuevo en escritorio y móvil, claro y oscuro; qué ve cada rol; las reglas D1–D9 funcionando sobre datos de ejemplo, incluido el recálculo retroactivo al entrar una persona; el bloqueo por intentos; el cambio de moneda con rechazo por decimales; el ciclo cerrar/reabrir; el historial.
**No demuestra:** persistencia ni servidor (los datos viven en la página), concurrencia, el correo de invitación, ni la apariencia en dispositivos reales (revisión visual del propietario). La tipografía se carga de Google Fonts (sin Internet se usa la del sistema).

---

## 14. Mejoras propuestas por esta investigación (no aprobadas)

Se suman a las de la §12.11 del inventario. **Decide el propietario.**

| Propuesta | Por qué | Costo |
|---|---|---|
| «Copiar monto» en pagos propios (**ya está en el prototipo**) | SINPE exige teclear el monto; evita errores de digitación | Bajo |
| Aviso «verifique el pago en su cuenta antes de darlo por recibido» | Comprobantes falsos | Bajo |
| Vencimiento opcional del enlace/código (p. ej. 7 días) | Reduce filtraciones | Medio |
| Resumen en texto para **compartir por WhatsApp** («Paseo: Elena paga a Ana ₡70 596,15…») | La conversación ocurre en el chat | Medio |
| «Excluir de un gasto» (participación parcial) | Equidad percibida | **Alto: cambia D1/D6** |
| Mostrar la **cuota de la persona** al registrar un gasto («Su parte será ₡…») | Previene sorpresas | Bajo |

---

## 15. Preguntas abiertas

1. **¿41 o 40 monedas?** ¿Qué código falta en la tabla de la §12.8?
2. **Cuenta obligatoria (D3):** ¿se acepta la fricción medida con la página de invitación, o se evalúa un acceso «solo lectura» por enlace?
3. **Equidad (D6):** ¿se mantiene «partes iguales sin excepción» en el MVP y se mide si los grupos se parten en dos?
4. **«Copiar monto» y el aviso de verificación:** ¿entran al MVP?
5. **Vencimiento del enlace:** ¿sí o no (hoy: no vence)?
6. **Texto compartible por WhatsApp:** ¿fase posterior?
7. **Notificaciones:** hoy ninguna; ¿se avisa cuando alguien registra un gasto en el grupo?
