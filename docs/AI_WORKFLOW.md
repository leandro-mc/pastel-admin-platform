# Flujo de trabajo para personas y agentes de IA

Este documento define el ciclo normal de desarrollo. `AGENTS.md` y este archivo deben leerse al inicio de cada sesión nueva.

## 1. Modelo de ramas

- `main`: versión estable publicada. No se usa para el desarrollo diario.
- `dev`: rama de integración actualizada. Todas las funcionalidades, correcciones y refactorizaciones aprobadas regresan a esta rama.
- Ramas de trabajo: se crean desde la base indicada por el orquestador (normalmente el `dev` más reciente), salvo que se indique continuar una rama existente. Cada rama contiene una tarea coherente y permanece separada de `dev` mientras el usuario la prueba. **Nunca abras PR ni integres a `dev` sin autorización explícita del usuario.**

Flujo normal:

```text
main  --sólo promoción autorizada de una versión estable--  dev
                                                             ↑
             rama de trabajo ── validación explícita ── PR a dev ──┘
```

Comandos iniciales:

```powershell
git status --short --branch
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feat/nombre-corto
```

No cambies de rama si hay cambios locales sin guardar o sin permiso del usuario. Si el usuario pide mantener la misma rama, inspecciona su estado e historial y reutilízala si corresponde a esta tarea. Si el nombre propuesto ya existe, inspecciónalo y reutilízalo únicamente si corresponde.

### Coordinación cuando hay agentes y proyectos en paralelo

- Durante una refactorización de la base, **no supongas que la arquitectura objetivo ya está implementada en `dev`**. El orquestador debe indicar la rama y el SHA base que corresponde a cada tarea. Sigue el código real de esa base y las instrucciones de la fase; no mezcles automáticamente el código antiguo con el objetivo de la refactorización.
- Cada agente trabaja en una rama por tarea coherente y con una zona de escritura definida. Los módulos/proyectos independientes pueden avanzar en paralelo; evita que dos agentes editen los mismos archivos compartidos. `BuildingBlocks`, `Identity`, shell/core, configuración global, CI y documentación raíz siguen protegidos salvo asignación expresa del orquestador o CCR autorizado.
- Para relevos, un agente **Tipo 2 agrupa en un único commit cada unidad de trabajo completa**; no publica commits por archivo ni por ajuste pequeño. Mantén un `PROGRESS.md` por tarea/fase con SHA, cambios, decisiones, comandos, limitaciones y siguiente paso, actualizado dentro de ese mismo commit.
- No integres ramas de agentes entre sí ni cambies su base por iniciativa propia. Coordina el orden y la base con el orquestador para evitar que una tarea dependiente se construya sobre una arquitectura todavía en transición.

## 1.0 Reglas duras de commits y CI

- El workflow CI es manual únicamente. Ningún push a una rama de trabajo inicia CI; el despacho exige `confirm_validation=true`.
- **Prohibido usar CI como bucle de feedback durante la implementación.** No dispatch ni push de prueba. Primero completa el lote, inspecciona todo el diff y ejecuta localmente format/lint/build/tests/auditorías.
- Un agente Tipo 2 hace **un commit por lote lógico**, con código, documentación y `PROGRESS.md` relacionados. No hagas un commit por cada archivo o cada pequeño ajuste.
- Las GitHub Contents APIs de escritura crean commits automáticamente: nunca las utilices secuencialmente para un conjunto de archivos relacionado. Usa Git Data API (blobs, tree, commit y ref update) para publicar el lote con un commit.
- Ante un CI fallido, revisa todos los logs relevantes y agrupa arreglos; no vuelvas a despachar CI hasta completar validaciones locales y obtener autorización explícita.
- Si no hay herramientas locales suficientes, registra el lote como **sin validar** y deja la validación para Build/QA; no uses CI como sustituto del entorno.
- No reescribas el historial compartido ni fuerces una ref sin autorización explícita. Nunca integres a `dev` ni `main` sin autorización del propietario.

## 1.1 Gobierno obligatorio de UX/frontend (CCR-003)

Antes de crear o modificar cualquier pantalla, componente compartido, CSS, tema, navegación o manifiesto de aplicación, cada agente debe leer:

- `docs/product/PASTEL-PRODUCT-AND-UX.md`: visión de producto, modelo multiapp, decisiones confirmadas y pendientes.
- `docs/DESIGN_SYSTEM.md`: lenguaje visual, accesibilidad, tokens y reglas de implementación.
- La sección WP8 de `docs/phase0/FASE-0-REFACTOR-BASE.md` y `docs/phase0/PROGRESS.md`.
- La CCR aprobada aplicable, incluida `docs/requests/CCR-003-ux-recovery-and-app-model.md`.
- Los componentes originales pertinentes en `dev` y la comparación «Antes/Ahora» adjunta a la conversación CCR-003. `dev` es referencia visual/histórica; nunca se copia de él código a una rama nueva sin revisar contratos y arquitectura vigentes.

### Reglas que no son negociables

1. **La UX es un requisito funcional.** Build verde, TypeScript correcto o auditoría Tailwind no significan que una pantalla sea visualmente aceptable.
2. **No reemplazar una interfaz trabajada por una tarjeta centrada, listado genérico o cuadrícula de aplicaciones como atajo.** Preservar la jerarquía, las composiciones, los controles, el footer y los estados de la referencia, o registrar y solicitar aprobación explícita del cambio.
3. **La ruta raíz lleva a Ágora.** El selector desplegable vive en la sidebar, bajo el concepto de un control de actualización; la app activa se distingue en la tarjeta inmediatamente inferior y su nombre no se repite en la barra superior. No convertir el inicio cotidiano en un catálogo de tarjetas. Workspace es administración global privilegiada; Cosecha no es autoactivable y Ágora no se puede desactivar.
4. **No confundir shell compartido con experiencia de negocio compartida.** Las apps comparten login, identidad, tokens/componentes y navegación anfitriona, pero cada manifiesto/página conserva sus flujos, navegación, roles, permisos y configuración por ámbito. Nunca asumir que un rol de una app otorga permisos en otra.
5. **No simular capacidades.** No inventar conteos, publicaciones, datos, persistencia de apps o resultados de seguridad. Si una API o decisión de producto no existe, presentar un estado honesto y registrar el trabajo requerido.
6. **Mantener Tailwind 4 salvo evidencia comparativa.** Utilidades para layout/espaciado/responsive/estados simples; tokens CSS como fuente de verdad para color; CSS de componente pequeño y gobernado para composiciones editoriales/brand. Prohibidos colores dispersos, estilos arbitrarios por pantalla y CSS global de conveniencia. Las clases semánticas solo viven en `web/src/core/design/components/` y deben usarse.
7. **Identidad y permisos reales.** Ocultar opciones en frontend es presentación, no autorización. No cambiar roles, políticas, entidades o contrato de API para hacer encajar el diseño sin la aprobación de producto y seguridad.
8. **Accesibilidad forma parte del diseño.** Validar teclado, foco, labels, errores, contraste claro/oscuro, zoom, tamaños táctiles, lectores de pantalla y responsive; no aprobar por apariencia de escritorio únicamente.
9. **Capturas obligatorias antes de cerrar UI.** Guardar/revisar, como mínimo, acceso/registro, home de Workspace, home de Ágora, directorio de usuarios, lista de roles, editor de permisos y cuenta; en tema claro y oscuro, escritorio y móvil. Comparar visualmente con la referencia; explicar diferencias intencionales.
10. **Reportar honestamente el SHA validado.** Si el agente no dispone de navegador o entorno ejecutable, registrar «sin compilar/sin validación visual» en `PROGRESS.md` y el relevo. No afirmar que un lote pasa pruebas hasta ejecutar Build/QA sobre el SHA actual. Antes de declarar Fase 0 terminada, se necesita aceptación visual del propietario.
11. **Separar Owner/Superuser de Administrator general.** Son roles de sistema distintos, inmutables mediante las APIs ordinarias. La cuenta de arranque configurada recibe ambos; solo el bootstrap establece/restaura Owner. Workspace exige el permiso explícito `platform.workspace.access`, otorgado únicamente a los roles del sistema.
12. **Limitar Workspace a la plataforma.** El Administrador general conserva `dashboard.view` y `settings.*`, pero no recibe automáticamente permisos de negocio de las apps. Desde Workspace solo se editan roles/overrides de plataforma; nunca borrar por accidente membresías existentes de una app al guardar accesos globales. Los permisos funcionales y su configuración pertenecen al ámbito de la app, y el backend valida todos los cambios; ocultar controles no basta.
13. **Privilegios reservados no asignables.** Ningún rol personalizado ni excepción directa puede obtener `platform.owner`, `platform.workspace.access` ni `huella.*`. Solo Owner concede acceso a Cosecha. El frontend no debe presentar Owner como rol asignable en creación de usuarios ni ofrecer roles de app en la administración de roles de Workspace.
14. **Huella solo pertenece al Owner/Superuser.** No crear un rol de usuario regular para Huella, ni directorio/buscador/autoactivación. El contrato público usa un token opaco, generado criptográficamente (mínimo 32 bytes aleatorios, Base64URL), cuyo hash es lo único que se almacena. La regeneración invalida inmediatamente el enlace anterior. Solo el snapshot publicado se puede servir en público; ningún borrador o dato privado se expone. Se requieren meta robots y cabecera `X-Robots-Tag: noindex,nofollow,noarchive`; el token nunca se añade a logs ni telemetría. Huella aún es un esqueleto: documentar el pendiente sin fingir que el enlace ya funciona.
15. **Regreso tras login.** `returnUrl` interno validado tiene prioridad; sin él, primer inicio va a Ágora y los siguientes a la última app de producto usada. El estado guardado en navegador no se presenta como una preferencia sincronizada entre dispositivos. Las guardas de ruta y el backend siguen siendo autoridad.

## 2. Convención de nombres

Usa minúsculas, kebab-case y una rama por objetivo coherente:

- `feat/<funcionalidad>`: funcionalidad o módulo nuevo.
- `fix/<problema>`: corrección de un bug.
- `refactor/<alcance>`: refactorización sin cambio intencional de comportamiento.
- `docs/<tema>`: sólo documentación.
- `test/<alcance>`: pruebas independientes.
- `chore/<tarea>`: tooling, CI, configuración o mantenimiento.

No crees ramas por archivo, clase o commit. Agrupa cambios dependientes en una sola rama y usa commits para separar pasos lógicos. Las ramas `dependabot/...` son una excepción automática: las genera GitHub Dependabot y no deben renombrarse manualmente; su configuración agrupa las actualizaciones y las dirige a `dev`.

## 3. Commits y Pull Requests

- Usa Conventional Commits en español o inglés consistente con el área: `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Mantén cada commit enfocado, pero no confundas “un commit por idea” con “un commit por archivo”. Ajustes dependientes de una misma corrección se agrupan.
- **Tipo de agente obligatorio por tarea:** el orquestador debe indicar Tipo 1 o Tipo 2; la clasificación es independiente del rol (Dev/Build/QA). Si no se indica, pregunta antes de continuar con cambios de implementación. **Tipo 1:** commit + push con progreso coherente al menos cada 3 minutos, incluyendo `PROGRESS.md`. **Tipo 2:** sin límite fijo de 3 minutos; publica con regularidad al completar unidades de trabajo coherentes, sin crear commits mínimos por cada ajuste. En ambos tipos, registra el progreso en el mismo commit cuando corresponda, y publica antes de cambiar de tarea/contexto o ante riesgo de interrupción.
- **Dev:** si su entorno lo permite, ejecuta build y validaciones locales razonables antes de entregar. Si no tiene entorno de compilación, puede publicar código sin compilar; no lo simula ni afirma que compila, y declara «sin compilar» en `PROGRESS.md` y en el informe. El código publicado debe estar lo más coherente posible y listo para que el agente con entorno lo compile.
- **Build/QA:** siempre deben trabajar en un entorno capaz de restaurar, compilar y ejecutar pruebas. Pueden ser responsabilidades de la misma sesión/agente para optimizar sesiones. Si corrigen código, vuelven a ejecutar las comprobaciones afectadas y declaran el SHA validado; no ocultan fallos ni afirman resultados no ejecutados.
- **CI deliberadamente diferido:** los pushes a ramas de trabajo no disparan CI automáticamente. La CI completa se ejecuta en pushes a `dev`/`main`, al abrir/reabrir un PR o marcarlo listo para revisión, y al actualizar un PR que ya está listo. También se puede iniciar manualmente desde GitHub Actions. Así los commits de relevo no generan una ejecución por cada push, pero el trabajo integrado y los PR listos siguen verificados.
- Cuando trabajes directamente mediante herramientas GitHub, no uses el endpoint de contenido para actualizar cada archivo en serie si la tarea es multiarchivo: prepara todos los blobs, crea un árbol y publica **un solo commit atómico** con Git Data API. En un checkout local, agrupa los cambios relacionados en commits coherentes; no esperes a que todo el módulo esté terminado para guardar avances.
- Si una refactorización extensa necesita puntos intermedios, publica avances coherentes en la misma rama para que otro agente pueda retomarlos. No desactives ni elimines las comprobaciones finales: se difiere su ejecución, no la validación.
- Si la CI falla, reúne los errores del mismo run, corrige el conjunto y vuelve a validar; no abras nuevos PR por cada intento.
- Antes del commit, revisa `git diff --check`, `git diff` y `git status`; confirma que no haya `.env`, claves, contraseñas, tokens, dumps o datos personales.
- Antes de terminar, revisa el diff y las validaciones que realmente se pudieron ejecutar; no afirmes pruebas no realizadas.
- No borres ejecuciones históricas de CI solo para ocultar fallos válidos. La prevención se hace publicando estados coherentes; cualquier limpieza de historial debe ser deliberada y autorizada.
- **Nunca abras PR ni integres a `dev` sin autorización explícita del usuario.** Entrega rama, SHA, resumen y validaciones. Cuando el usuario autorice abrir el PR, abre uno solo para la tarea validada; espera CI y revisa el diff. Solo haz merge cuando la autorización para integrar también sea explícita. Las iteraciones permanecen en la misma rama.
- Tras la integración autorizada, actualiza tu copia de `dev` y elimina la rama sólo cuando ya no se necesite.
- No hagas commits de trabajo directamente a `main`. Evita `git push --force`; nunca reescribas el historial compartido.

## 4. Promoción de `dev` a `main`

Sólo ocurre cuando el usuario dice explícitamente que quiere publicar/pasar a `main`. Antes de hacerlo:

1. Confirma que `dev` está actualizado y sin tareas incompletas.
2. Ejecuta las validaciones de backend, frontend y Docker indicadas en `README.md`.
3. Revisa cambios de esquema, migraciones, secretos, configuración de producción y notas de versión.
4. Solo después de recibir autorización explícita para abrir el PR de promoción, abre el PR de `dev` a `main`, revisa CI y espera autorización explícita para hacer merge si todavía no se autorizó la integración.
5. Integra el PR aprobado y crea un tag semántico en el commit publicado: `vMAJOR.MINOR.PATCH` (por ejemplo, `v1.0.0`). No inventes ni reutilices un tag.
6. Documenta en el PR o notas de la versión los cambios incluidos y cualquier paso operativo.

Por defecto, termina el trabajo en `dev`. Nunca interpretes que pedir una funcionalidad o decir “listo” autoriza publicarla en `main`.

## 5. Validación mínima

La CI no se ejecuta automáticamente con cada push a ramas de trabajo. Se ejecuta en pushes a `dev`/`main`, al abrir/reabrir un PR, al marcarlo listo para revisión y con nuevos pushes a un PR que ya no está en borrador. Cuando este workflow también esté en la rama predeterminada (`main`), podrá iniciarse manualmente desde **Actions → CI → Run workflow**, seleccionando la rama objetivo. Los PR en borrador pueden dejar un run con los trabajos omitidos, pero no consumen minutos de runner. El workflow no se desactiva: solo se difiere la validación completa hasta que la tarea esté lista.

Ejecuta lo aplicable y reporta exactamente qué pasó y qué no pudo ejecutarse. Sin entorno de compilación (rol Dev) no ejecutes ni simules estos comandos: declara «sin compilar».



```powershell
dotnet restore Pastel.slnx
dotnet build Pastel.slnx --configuration Release --no-restore
dotnet test Pastel.slnx --configuration Release --no-build --no-restore
Push-Location web
npm ci --no-audit --no-fund
npm run format:check
npm run build
npm run lint
Pop-Location
docker compose config --quiet
docker compose build
```

Para cambios en el arranque o la base, compila y además levanta el stack limpio de CI o prueba la migración y el seeding en PostgreSQL. Que una imagen compile no demuestra que las tablas se creen o que los servicios arranquen.

## 6. Documentación y contexto duradero

Actualiza la documentación dentro de la misma rama si cambian el flujo de trabajo, los comandos, variables de entorno, tecnologías, arquitectura, contratos, endpoints o la manera de agregar módulos. Las decisiones técnicas persistentes no deben quedar sólo en la conversación.

Al finalizar antes de la aprobación, informa el nombre de la rama, commit, pruebas ejecutadas/no ejecutadas y comandos exactos para probar; no abras PR. Después de la confirmación expresa del usuario, informa el PR/merge hacia `dev` sólo cuando esté verificado. No afirmes una validación sin evidencia.