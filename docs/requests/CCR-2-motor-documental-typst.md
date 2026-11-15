# CCR-2 — Motor documental compartido: Typst, fuentes autoalojadas y `Pastel.Documents`

| Dato | Valor |
|---|---|
| Estado | **Borrador preparado el 2026-11-13. No está autorizado ni aplicado.** La decisión de fondo ya fue aprobada por el propietario (Typst como motor documental, fuentes autoalojadas y el proyecto compartido `Pastel.Documents`); falta su autorización expresa para tocar las zonas compartidas de abajo. |
| Origen | `docs/requirements/DECISIONES-Y-HALLAZGOS.md` D-03 y D-06; investigación de Huella, Cosecha y Ágora en `docs/requirements/` |
| Zonas compartidas que tocaría | `src/Host/Pastel.Host/Dockerfile`, `src/BuildingBlocks/**` (proyecto nuevo), `Pastel.slnx`, `compose.yaml`, `.github/workflows/ci.yml`, `web/src/core/design/**` y archivos estáticos de `web/` (fuentes), `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/OPERATIONS.md`, `docs/SECURITY.md` |
| Relación con otras solicitudes | **No es CCR-1.** CCR-1 (reglas de diseño del frontend por módulo, rama `docs/module-rules-precedence`) trata otro asunto y se reaplica por separado, adaptado a las reglas actuales. Esta solicitud no depende de CCR-1 ni lo sustituye; pueden aplicarse en cualquier orden. Tampoco cubre D-04 (metadatos `og:*`), que lleva su propio ADR. |

## Motivo
Tres aplicaciones necesitan generar documentos desde datos estructurados: el **CV de Huella** (PDF etiquetado), las **cotizaciones, fichas y recibos de Cosecha** y las **tarjetas PNG para compartir de Ágora**. D-03 eligió **Typst** como motor único (un solo binario, PDF etiquetado, compilación rápida) para no instalar una distribución TeX ni un navegador sin cabeza. D-06 pide **fuentes autoalojadas** en producción: la CSP actual (`default-src 'self'`, `font-src 'self' data:`) ya bloquea a terceros y es mejor para la privacidad; los prototipos usan Google Fonts solo para ver el diseño.

## Cambios propuestos
1. **Proyecto compartido `src/BuildingBlocks/Pastel.Documents`.** Contrato mínimo: recibe una plantilla identificada, datos en JSON y el formato de salida (PDF o PNG); devuelve los bytes o un error con código estable. Sin dependencias NuGet nuevas (invoca el binario como proceso hijo). Los módulos lo usan por su contrato público, sin importar nada de otro módulo.
2. **Imagen del host (`Dockerfile`).** Agregar el binario de Typst con **versión fijada y verificación de suma de control**, y las fuentes autoalojadas dentro de la imagen. El proceso corre con el mismo usuario sin privilegios (`$APP_UID`) que ya usa el host.
3. **Ejecución acotada del proceso.** Sin red, con límite de tiempo y de memoria, directorio de trabajo temporal dentro de lo que ya permite el contenedor (`compose.yaml` hoy define `read_only`, `tmpfs`, `cap_drop`, `no-new-privileges`, `mem_limit: 768m` y `cpus: 1.50`; hay que confirmar que el `tmpfs` actual alcanza o ajustarlo), sin paquetes remotos de Typst y con la salida validada antes de devolverla.
4. **Fuentes autoalojadas para la interfaz.** Servir las familias desde el propio origen (`'self'`), de modo que **la CSP actual no cambia** (`font-src 'self' data:` ya las permite). Las familias que hoy usan los prototipos son: *Source Sans 3* y *Source Serif 4* (Ágora), *Public Sans* (Balance y Cosecha), *Archivo*, *Atkinson Hyperlegible* y *Source Sans 3* (Huella); Brisa usa la pila del sistema. **La lista definitiva depende de la identidad visual, que sigue pendiente de revisión.**
5. **CI.** Instalar Typst en el trabajo que ejecute las pruebas del proyecto, con la misma versión fijada.
6. **Documentación protegida.** Registrar `Pastel.Documents` como building block en `docs/ARCHITECTURE.md`; la tipografía autoalojada en `docs/DESIGN_SYSTEM.md`; el binario, las fuentes y los límites del proceso en `docs/OPERATIONS.md` y `docs/SECURITY.md`.

## Reglas de seguridad que se mantienen (D-10)
- **La IA devuelve JSON, nunca Typst ni LaTeX.** La plantilla es fija y los datos entran como datos: nunca se concatenan dentro del código de la plantilla.
- La salida de Huella conserva las reglas ATS ya definidas (sin iconos, ligaduras desactivadas, texto real).
- Ningún dato personal ni el contenido de los documentos se escribe en logs.

## Datos por verificar (no se asumen)
- **Versión de Typst** a fijar, su **licencia vigente** y que esa versión genere el PDF etiquetado que la investigación espera (se citó Typst 0.14 como la versión donde es el comportamiento por defecto).
- **Licencia de cada familia tipográfica** antes de redistribuirla dentro de la imagen y de la aplicación.
- **Tamaño de la imagen** resultante y tiempo de compilación en el hardware real de despliegue.
- Que el `tmpfs` y los límites de memoria actuales alcancen para compilar el documento más grande previsto.

## Criterios de aceptación
- Con la imagen construida y **sin red**, una plantilla de CV de ejemplo produce un PDF **etiquetado** con las fuentes **incrustadas**, y la extracción de texto recupera el contenido en orden de lectura.
- La interfaz muestra sus fuentes sin ninguna petición a otro origen y sin cambiar la CSP.
- Un dato malicioso en el JSON (por ejemplo, instrucciones de Typst) se imprime como texto y no se ejecuta.
- El proceso respeta los límites de tiempo y memoria y falla con un error claro cuando se exceden.
- La compilación de la solución y las pruebas existentes siguen en verde.

## Lo que no cambia
Todo lo que no sea lo anterior: reglas de módulos, fronteras entre módulos, autenticación y permisos, errores y logs, y el flujo de trabajo. Esta solicitud no incluye código de ningún módulo (la plantilla de CV y las de Cosecha y Ágora se implementan con cada módulo).

## Pendiente
- Autorización expresa del propietario para tocar las zonas compartidas listadas.
- Resolver los datos por verificar antes de fijar versiones.
