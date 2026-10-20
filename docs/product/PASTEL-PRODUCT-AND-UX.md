# Visión de producto, modelo de aplicaciones y UX de Pastel

> **Fuente de verdad de producto para agentes de implementación, diseño, Build/QA y futuras apps.** Complementa `docs/DESIGN_SYSTEM.md` (reglas visuales) y `docs/ARCHITECTURE.md` (fronteras técnicas). Si una tarea contradice este documento, no se inventa una interpretación: se plantea la diferencia al propietario y se registra una decisión.

## 1. Diagnóstico de la degradación visual

El PDF «Degradación de la interfaz.pdf» compara seis pares de pantallas Antes/Ahora. La evidencia visual de la columna Antes muestra:

- **Acceso:** composición de dos columnas; marca floral; mensaje «Todo en su lugar. Todo fluye mejor.»; beneficios; ilustración ornamental discreta; tarjeta de acceso; alternancia de tema accesible desde la propia pantalla.
- **Inicio:** bienvenida personal, llamada a la acción, ilustración, resumen y tarjetas de estado con jerarquía clara.
- **Navegación:** shell persistente con selector de espacio/app, navegación lateral reconocible, selección visible, barra superior y pie de página.
- **Administración:** encabezados, agrupación, paneles, pestañas/filtros, tabla de usuarios y edición de permisos con jerarquía visual.
- **Cuenta:** perfil y seguridad en paneles separados y bien equilibrados.

En la columna Ahora, acceso se reduce a una tarjeta genérica centrada; el inicio se transforma en una cuadrícula de tarjetas de apps; disminuye el contexto persistente de navegación; cuenta, usuarios y permisos pierden parte de su composición, agrupación y jerarquía. El problema es sistémico: no se resuelve con cambiar colores o aumentar el radio de las tarjetas.

La comparación de código entre `dev` y `refactor/modular-foundation` confirma un cambio de composición: se eliminaron `web/src/App.tsx` y componentes originales de autenticación, dashboard, perfil y workspace; luego se construyeron shell/rutas/páginas nuevas. Por tanto, **la pérdida visual proviene de decisiones de reimplementación y de una regla de estilos demasiado restrictiva, no de una incapacidad de Tailwind CSS**.

## 2. Concepto central

Pastel es una **plataforma anfitriona de aplicaciones independientes**. Se debe percibir como un entorno de trabajo que puede alojar distintas apps bajo una sola identidad, inicio de sesión y capa de seguridad; no como una sola aplicación con un dashboard inicial que invita a entrar a módulos.

Cada subaplicación tiene objetivos, navegación, usuarios miembros, permisos, configuración y color propios. No se debe forzar un flujo de negocio común entre apps solo porque comparten el shell, la autenticación o los componentes base.

### Distinción de términos

- **Pastel:** marca y plataforma compartida (la flor, autenticación, preferencias generales, ayuda y shell).
- **App/subaplicación:** Ágora, Brisa, Balance, Huella o Cosecha. Tiene una identidad visual y un inicio propio.
- **Pastel Workspace:** app de administración global, no una tarjeta en el inicio. Solo aparece en el selector de quien tenga el privilegio global autorizado.
- **Configuración de una app:** administración local de sus miembros, roles, permisos y preferencias, siempre dentro del ámbito de esa app.
- **Catálogo de apps:** catálogo de apps en las que una persona puede decidir participar; no es el inicio cotidiano ni debe mostrarse como cuadrícula automática tras autenticarse.

## 3. Aplicaciones y reglas de disponibilidad

| App | Visibilidad / disponibilidad | Inicio y comportamiento |
|---|---|---|
| **Ágora** | Pública y obligatoria. Toda persona la puede ver; toda cuenta la conserva activa. No se puede desactivar. | Entrada inicial al sistema; feed y funcionalidades públicas disponibles sin registrarse. Después de autenticarse, sigue siendo el destino por defecto si no existe una ruta de retorno o preferencia válida. |
| **Brisa** | App de producto seleccionable/activable por el usuario que cumpla los requisitos de acceso. | Navegación, tema, inicio, miembros, roles, permisos y configuración de Brisa. |
| **Balance** | App de producto seleccionable/activable por el usuario que cumpla los requisitos de acceso. | Navegación, tema, inicio, miembros, roles, permisos y configuración de Balance. |
| **Huella** | Exclusiva del Owner/Superuser y de su único perfil personal. No es una opción de autoactivación, no está en búsquedas ni en el catálogo público. | El Owner/Superuser edita el borrador, publica y administra un enlace de capacidad largo, revocable y regenerable. Cualquier persona con el enlace vigente puede ver únicamente la versión publicada, sin registro. El perfil público lleva noindex,nofollow,noarchive. |
| **Cosecha** | App privada, excluida del catálogo de autoactivación. Solo el propietario/superusuario global autoriza el acceso a cada cuenta. | Sus miembros reciben exclusivamente los permisos que se les concedieron en Cosecha. |
| **Pastel Workspace** | App interna de plataforma, fuera del catálogo ordinario. La pueden abrir las cuentas con el permiso de plataforma platform.workspace.access: los roles de sistema Owner/Superuser y Administrator general. | Inicio/centro de administración global. Owner/Superuser tiene alcance de plataforma completo; Administrator general administra usuarios, roles y funciones de plataforma dentro de su conjunto de permisos, pero no adquiere permisos de negocio de cada app ni privilegios exclusivos de Owner. |

Tener acceso a Workspace no equivale a una membresía ni concede automáticamente permisos de negocio de todas las apps. Los roles de sistema son distintos: **Owner/Superuser** tiene alcance global completo y es el único propietario de Huella; **Administrator** es administración general de plataforma, no es propietario y no puede conceder roles o permisos reservados. Los permisos funcionales de Brisa, Balance y Ágora siguen siendo propios de sus ámbitos.

## 4. Inicio, selector y navegación

1. Una visita anónima a `/` conduce a **Ágora**, no a un hub de tarjetas. Si Ágora todavía no tiene su feed construido, mostrar su propia página pública/estado de módulo, no una pantalla de selección.
2. El login y el registro conservan la marca **Pastel Workspace**, porque son puertas de entrada de la plataforma. En ellas se recupera la composición visual original descrita en §7.
3. Tras iniciar sesión, el selector solo incluye apps activas y autorizadas para esa persona. Las apps que puede añadir se administran en Configuración/Catálogo, no se mezclan como tarjetas en el inicio. Cosecha y Huella quedan fuera de la autoactivación; Workspace aparece solo si la sesión contiene el permiso platform.workspace.access.
4. Ágora no se puede quitar de la lista de apps activas. Una cuenta nueva comienza con Ágora activa.
5. Seleccionar otra app cambia el contexto completo: nombre, color, navegación, destino inicial, rutas y configuración disponible. La app seleccionada se distingue también mediante texto/icono/estado, nunca solo por color.
6. La flor se conserva como marca común. El selector desplegable con icono de actualización vive en la sidebar y la tarjeta de la app activa queda inmediatamente debajo, con nombre, identidad y descripción; la barra superior no repite el nombre de la app. En Workspace, la tarjeta debe identificar expresamente «Pastel Workspace». El logo/nombre de Pastel devuelve al inicio de la app activa.
7. Al pulsar la marca/nombre se vuelve al inicio de la app actual; no se cambia accidentalmente a un hub global. Después de login, un returnUrl interno y válido tiene prioridad; si no existe, la primera entrada abre Ágora y los inicios posteriores vuelven a la última app de producto usada. Por ahora la preferencia se guarda localmente en el navegador; no representa una preferencia sincronizada entre dispositivos. La resolución de app activa debe derivarse de la ruta/manifiesto, no de un estado visual independiente que pueda quedar desincronizado.
8. El shell persiste en escritorio y móvil: navegación lateral en escritorio, patrón táctil equivalente en móvil, foco visible, ayuda, preferencias y menú de cuenta. No desaparecerá el footer ni se retirarán funciones originales sin decisión aprobada.
9. La UI filtra enlaces por permisos, pero la API sigue siendo autoridad. Una ruta no autorizada no se vuelve segura por ocultar un botón.

## 5. Identidad visual

- **Shell de Pastel:** neutro, tranquilo y editorial. La identidad principal de cada app emerge al seleccionarla.
- **Ágora:** azul sobrio, enfoque editorial/público.
- **Brisa:** verde tranquilo.
- **Balance:** verde azulado/teal.
- **Cosecha:** arena/dorado.
- **Huella:** terracota cálida.
- **Modo claro/oscuro:** ambos son experiencias de primera clase. En login/registro existe un control de cambio de tema. La preferencia se conserva al navegar e iniciar sesión.
- **Marca:** flor `Flower2`, iconos semánticos por acción. No morados/violetas ni iconografía de “IA mágica”.
- El color del módulo identifica el contexto, pero formularios, estados, foco, tablas y texto deben conservar contraste y legibilidad WCAG 2.2 AA. Ninguna app debe ser un simple cambio de tinte de la misma interfaz: debe tener libertad en sus vistas de dominio.

## 6. Aplicaciones con una plantilla de configuración común

Las apps pueden reutilizar **el patrón de interacción** y la estructura visual de Configuración: miembros, roles, permisos, preferencias, auditoría y secciones disponibles. La plantilla se tematiza con el color e identidad de la app activa, pero consulta/edita únicamente su ámbito. Las secciones se ocultan si no aplican o el usuario no tiene permiso; no se deben mostrar secciones genéricas vacías para simular funcionalidad.

Ámbitos de autorización previstos:

1. **Global/plataforma:** privilegios para Pastel Workspace y administración del catálogo global.
2. **Membresía de app:** determina si la persona puede entrar en cada app.
3. **Rol/permisos por app:** define las capacidades dentro de esa app, sin herencia implícita desde otra.
4. **Público anónimo:** solo lo que cada app exponga expresamente como público (feed de Ágora y perfil compartido de Huella).

El permiso para gestionar miembros o roles no puede conceder privilegios que el administrador no posee. El backend debe imponer esas fronteras, registrar cambios importantes y denegar por defecto.

## 7. Recuperación del lenguaje visual original

El PDF y los componentes que siguen disponibles en `dev` son la referencia, no una invitación a copiar todos los flujos antiguos sin adaptarlos al nuevo backend modular.

### Acceso y registro

- Diseño de dos zonas en escritorio: narrativa de marca a la izquierda y tarjeta de formulario a la derecha; en móvil, composición de una sola columna legible.
- Recuperar el título «Todo en su lugar. Todo fluye mejor.», beneficios de la plataforma, ornamentación floral discreta y tarjeta con icono, encabezado, labels, estado de seguridad y CTA.
- Recuperar alternancia de tema visible, marca, icono para mostrar/ocultar contraseña y pie de página.
- Mantener validaciones, método Google/contraseña si está habilitado por `/api/auth/options`, avisos de error y rutas de retorno existentes. No quitar ni inventar un proveedor de autenticación por motivos estéticos.
- El registro muestra el catálogo de apps disponibles según reglas del producto y mantiene Ágora seleccionada/obligatoria. Este paso de selección puede requerir trabajo posterior de backend; no simular persistencia antes de que exista API.

### Shell y app

- Restaurar la presencia de marca, selector desplegable, sidebar con iconos y etiquetas, estado activo claro, barra superior, menú de cuenta/ayuda/tema, espaciado, jerarquía y footer.
- Al cambiar de app, el sidebar y el tema cambian según el manifiesto de la app. No reutilizar a la fuerza elementos de navegación propios de otra app.
- No mostrar la cuadrícula de apps como página inicial. La lista de apps pertenece al selector y al flujo de gestión de apps.

### Inicio y administración

- Inicio con bienvenida contextual, contenido real disponible, una acción principal y paneles de información bien jerarquizados. No crear cifras ficticias.
- Usuarios: encabezado descriptivo, búsqueda/filtros, tabla con columnas legibles, estados y acciones agrupadas; diseño responsive para móvil sin scroll horizontal arbitrario.
- Roles/permisos: agrupación por dominio/recurso/acción, resumen de alcance, diferencia visual entre heredado, concedido y denegado, filtros/búsqueda cuando corresponda y acciones guardar/cancelar claras.
- Perfil: tarjetas separadas para información personal y seguridad; avatar/estado, detalles y acciones con significado.
- Formularios: labels persistentes, ayuda, errores junto al campo, botones consistentes, estados de carga y conservación de lo escrito.
- Diálogos: solo tareas breves; las tareas largas (p. ej. permisos) son páginas completas.
- Vacío, carga, error, éxito y estado sin permiso se diseñan igual de deliberadamente que el estado cargado. Nada de paneles en blanco sin explicar qué sucede.

## 8. Decisión tecnológica de estilos: mantener Tailwind con reglas corregidas

**No sustituir Tailwind ahora.** La versión previa usaba Tailwind CSS 4 y componía el diseño con reglas y clases de componente. La rama actual conserva Tailwind 4, pero exigió cero clases semánticas y llevó la presentación hacia utilidades genéricas, a la vez que sustituyó páginas completas. Esto hizo más difícil reproducir los patrones expresivos de la versión anterior.

En adelante:

- **Tailwind 4:** composición del JSX, distribución, responsive, espaciado, tipografía utilitaria y estados simples.
- **Tokens CSS centrales:** los colores, sombras, foco, superficies y variables del tema/app se definen una sola vez. No hay hexadecimales sueltos ni colores arbitrarios en JSX.
- **CSS de componentes acotado:** se permite en `web/src/core/design/components/` para composiciones de marca complejas (login editorial, ilustración geométrica, estructura de shell u otros patrones que se repiten). Debe usar tokens, quedar en archivos pequeños y mantener el JSX semántico. Sin estilos inline arbitrarios ni CSS duplicado en cada app.
- **Kit compartido:** botones, campos, selectores, menús, tarjetas, diálogos, tablas, estados y avisos son componentes reutilizables bajo `core/ui`, con variantes explícitas. No crear cinco implementaciones por módulo.
- `@apply` se mantiene en cero salvo excepción de diseño registrada en una decisión; no volver a generar centenares de líneas de `@apply` como solución automática.
- La auditoría Tailwind debe medir que la mayoría de elementos siguen usando utilidades, detectar selectores sin uso, CSS excesivo y colores prohibidos; no debe prohibir en bloque toda clase de componente necesaria para recuperar una interfaz expresiva. `check-design` mantiene las reglas de paleta, marca y tokens.
- Cambiar de framework (CSS Modules, vanilla-extract u otro) solo se considerará después de reconstruir una pantalla representativa y comparar: fidelidad visual, accesibilidad, mantenimiento, tamaño del CSS, legibilidad de JSX, rendimiento y dificultad de trabajo para agentes. No se tomará la decisión por preferencia personal.

## 9. Criterios de aceptación visual

Una entrega de UI no se considera completa solo porque compile o pase ESLint/CI. Debe verificar como mínimo:

- [ ] El acceso recupera la composición de dos columnas, texto/marca/ornamentación, tarjeta, control de tema, visibilidad de contraseña, feedback y footer.
- [ ] El inicio anónimo lleva a Ágora; no aparece un hub de tarjetas como destino principal.
- [ ] El selector cambia la app activa y se actualizan etiqueta, color, sidebar, inicio y configuración.
- [ ] Workspace no se muestra a una cuenta ordinaria; Cosecha no aparece en catálogo abierto; Ágora no puede desactivarse.
- [ ] Usuario, roles, permisos, perfil y configuración recuperan agrupación, espacio, encabezados, estados y patrones de interacción de la referencia.
- [ ] Modo claro/oscuro; móvil de 360 px, 320 px de tolerancia y escritorio; zoom 200 %; navegación de teclado; foco visible.
- [ ] Contraste suficiente, labels, estados accesibles, objetivos táctiles y ausencia de scroll horizontal inesperado.
- [ ] Comparativa de capturas en claro/oscuro, escritorio/móvil, incluyendo login, inicio, usuarios, permisos/roles y cuenta.
- [ ] Build/QA ejecuta build, tests y un recorrido real en navegador; el propietario valida visualmente. No se inventan resultados.

## 10. Decisiones de producto confirmadas por el propietario (2026-10-19)

Estas decisiones sustituyen las preguntas provisionales anteriores. Aplicarlas en el frontend no sustituye la autorización del servidor.

### 10.1 Owner/Superuser frente a Administrator general

- Owner/Superuser y Administrator son roles de sistema distintos e inmutables mediante las APIs de administración.
- El bootstrap configurado (Bootstrap:AdminEmail) crea o restaura la cuenta propietaria con ambos roles. Solo el bootstrap establece/restaura la membresía Owner; un endpoint de usuarios no puede asignarla, quitarla ni transferirla.
- Ambos roles reciben platform.workspace.access y pueden abrir Pastel Workspace. Owner/Superuser posee además todos los permisos de las apps y los privilegios reservados; Administrator tiene los permisos de plataforma (dashboard.view, settings.* y Workspace) y no hereda permisos funcionales de las apps.
- Solo Owner puede conceder permisos de Cosecha o gestionar sus accesos, y el rol Owner no puede crearse como rol personalizado ni asignarse desde UI/API. El rol Administrator puede administrar cuentas/roles de plataforma, pero una asignación de rol normal se valida contra los permisos efectivos del actor.
- platform.owner, platform.workspace.access y huella.* no se conceden por rol personalizado ni excepción individual; se asignan únicamente por el seeding de los roles de sistema. Cosecha puede tener roles de app, pero solo Owner puede concederlos.

### 10.2 Huella: el perfil personal del propietario

- Huella corresponde únicamente a la cuenta Owner/Superuser. Los usuarios regulares no pueden activarla, editarla ni recibir permisos huella.*.
- La página pública no requiere registro y solo se puede llegar a través del enlace compartido. No se debe construir un buscador, directorio, botón público de descubrimiento ni incluir perfiles en un catálogo.
- El enlace usa un token aleatorio opaco de alta entropía independiente de un nombre/slug. Recomendación de implementación: mínimo 32 bytes aleatorios, codificación Base64URL y almacenamiento únicamente del hash del token. Nunca derivarlo del correo, nombre ni ID del propietario.
- Regenerar el enlace crea un token nuevo e invalida inmediatamente el anterior. El enlace vigente funciona como secreto de acceso: cualquier persona que lo tenga puede leer la última versión publicada sin autenticarse.
- El perfil y sus respuestas HTML/PDF/metadatos deben indicar noindex,nofollow,noarchive. La entrega pública debe incluir la meta robots en el HTML inicial y la cabecera X-Robots-Tag; robots.txt por sí solo no garantiza la desindexación. No exponer el token en logs, analítica, mensajes de error ni referencias de terceros.
- Los datos de contacto permanecen ocultos por defecto. La página pública solo presenta los datos incluidos explícitamente en la instantánea publicada. El borrador nunca se sirve de forma anónima.

**Estado real:** la base Huella es todavía un esqueleto sin tablas de perfil, ruta pública o API de enlace. Los criterios de token/hash, publicación, revocación/regeneración y noindex son ahora obligatorios en su ficha, pero no se afirma que estén implementados en este checkpoint.

### 10.3 Destino después del login y retorno

1. Un returnUrl que pase la validación de ruta interna tiene prioridad sobre cualquier preferencia.
2. Si no hay returnUrl válido ni app recordada, la primera entrada conduce a Ágora.
3. En logins posteriores se recuerda la última app de producto que la persona usó; visitar Workspace, cuenta, login o una página interna de configuración no sustituye la última app.
4. El código actual usa una preferencia no sensible almacenada en localStorage por navegador. Por tanto, el recuerdo no se sincroniza entre equipos/perfiles de navegador. Si se necesita una preferencia por cuenta, debe acordarse e implementarse un contrato de servidor en una etapa posterior.
5. Nunca confiar en returnUrl para autorización: al llegar a la ruta, los guardas de sesión/permisos y el backend siguen siendo obligatorios.

### 10.4 Catálogo de apps

- Ágora está siempre activa y no se puede quitar.
- Brisa y Balance se ofrecen como opt-in cuando la cuenta cumple los requisitos, y se podrán añadir/desactivar desde Configuración cuando exista la persistencia de membresías.
- Huella no se ofrece a usuarios regulares. Cosecha se concede exclusivamente por Owner. Workspace se muestra solo a roles con platform.workspace.access.
- El catálogo/autogestión de apps aún necesita contratos de persistencia y UI; no simular la activación con controles que no guarden cambios.

### 10.5 Decisiones ya cerradas y pendientes técnicos

Cerrado: separación Owner/Administrator general; Huella solo del propietario; returnUrl válido prioritario y última app posterior; enlace Huella aleatorio, revocable/regenerable, solo por enlace y excluido de indexación.

Pendiente de implementación funcional: entidades/tablas/API de Huella, emisión segura y almacenamiento hash del token, regeneración/revocación, página pública por token y respuesta con noindex; selección y membresías persistentes por app; endpoints y UI de configuración de cada app (incluida la concesión de Cosecha por Owner); preferencia de última app sincronizada entre dispositivos (no requerida por decisión actual). Hasta que existan dichos endpoints, Workspace rechaza gestionar permisos funcionales de apps. La sincronización del catálogo puede retirar overrides de app concedidos por cuentas que no son Owner; los concedidos por Owner se conservan temporalmente para no perder configuración autorizada. **La tabla de membresías `UserRoles` no guarda quién asignó cada rol**, por lo que no se puede certificar autoría de las membresías históricas de Cosecha; requieren revisión/auditoría antes de una migración destructiva. Todo ello requiere Build/QA y pruebas de seguridad antes de considerarse terminado.

## 11. Orden de implementación

1. Restaurar la envoltura visual y el acceso/registro sin cambiar lógica de seguridad.
2. Cambiar raíz e inicio para que el destino predeterminado sea Ágora, eliminar el hub de tarjetas como página principal y diseñar el selector como control de cambio de app.
3. Restaurar la barra superior, sidebar y footer; tema persistente y nombre dinámico de app.
4. Rehacer bienvenida, perfil, directorio, roles, permisos y formularios con el lenguaje visual original y los datos/APIs actuales.
5. Ajustar el sistema de estilos híbrido y componentes compartidos con auditorías que hagan cumplir tokens, accesibilidad y CSS acotado.
6. Incorporar la selección/activación persistente de apps, membresías y configuración por ámbito cuando se acuerden los contratos de producto y backend.
7. Build/QA valida en navegador; documentar capturas y diferencias restantes. No integrar a `dev` ni `main` sin autorización expresa.
