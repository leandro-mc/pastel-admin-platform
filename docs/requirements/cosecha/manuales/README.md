# Guías de uso de Cosecha

Una guía por rol. Cada una está escrita en **Markdown** (fuente) y se convierte en **HTML con las pantallas reales del prototipo** incrustadas, abiertas en el rol y estado que explica el texto. Así las «capturas» no se desactualizan.

| Guía | Para quién |
|---|---|
| [`00-productor.md`](00-productor.md) | Productores (la lee en voz alta quien gestiona; se puede imprimir como tarjeta) |
| [`01-gestor-y-propietario.md`](01-gestor-y-propietario.md) | Gestor y propietario |
| [`02-comercial.md`](02-comercial.md) | Comercial (prospección) |
| [`03-acopio.md`](03-acopio.md) | Acopio (recepción) |
| [`04-transportista.md`](04-transportista.md) | Transportista |
| [`05-contabilidad.md`](05-contabilidad.md) | Contabilidad (lectura) |
| [`06-comprador.md`](06-comprador.md) | Compradores |
| [`07-enlace-de-zona.md`](07-enlace-de-zona.md) | Enlace de zona |

## Ver las guías con sus pantallas
```bash
python3 build_manuals.py     # genera html/*.html
# abrir html/index.html en el navegador
```
Las pantallas son iframes del prototipo (`../prototype/index.html?role=…&view=…`), así que se pueden **tocar** dentro de la guía. Al imprimir, los marcos se conservan como imágenes estáticas según el navegador.

## Cómo agregar una pantalla
```
:::shot role=acopio view=recepcion mode=mobile theme=light script="click:[data-a='ops:photo']" caption="Texto debajo de la pantalla."
```
Parámetros: `role`, `view`, `sub`, `mode` (`mobile`/`desktop`), `theme` (`light`/`dark`), `offline=1`, `field=1`, `script` (acciones `click:selector` o `type:selector=valor` separadas por `|`).

> Los textos y cifras de las guías son de ejemplo. Los valores de política (ventana de 8 h, tolerancias, 3 %, 60 %) son **iniciales y deben validarse con productores y compradores reales**; ver `../POLITICA-DE-RECLAMOS.md` y `../MODELO-DE-PAGO.md`.
