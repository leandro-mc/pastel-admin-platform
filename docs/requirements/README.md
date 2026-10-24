# Requerimientos y prototipos · Ágora · Huella · Cosecha

> Levantamiento hecho el 2026-10-23 sobre la rama `refactor/modular-foundation` (commit `a8c1c7d`), **sin escribir en ninguna rama existente**. Todo vive en `research/requirements-and-prototypes`.
> Se ignoraron a propósito las paletas y restricciones del repositorio (autorizado por el propietario). Los datos, personas y organizaciones de los prototipos son **ficticios**.

## Empiece por aquí
1. [`DECISIONES-Y-HALLAZGOS.md`](DECISIONES-Y-HALLAZGOS.md) — decisiones clave, **funcionalidades nuevas que no se habían pedido**, decisiones que necesitan su confirmación y **lo que no se pudo verificar**.
2. Un documento de requerimientos por app, cada uno con su prototipo:

| App | Requerimientos | Prototipos (abrir `index.html`) |
|---|---|---|
| **Ágora** | [`agora/REQUERIMIENTOS-AGORA.md`](agora/REQUERIMIENTOS-AGORA.md) | [`agora/prototype/`](agora/prototype/index.html) |
| **Huella** | [`huella/REQUERIMIENTOS-HUELLA.md`](huella/REQUERIMIENTOS-HUELLA.md) | [`huella/prototype-perfil/`](huella/prototype-perfil/index.html) (página pública) · [`huella/prototype-estudio/`](huella/prototype-estudio/index.html) (banco + generador de CV) |
| **Cosecha** | [`cosecha/REQUERIMIENTOS-COSECHA.md`](cosecha/REQUERIMIENTOS-COSECHA.md) | [`cosecha/prototype-operacion/`](cosecha/prototype-operacion/index.html) (Hoy, envío, recepción, dinero) · [`cosecha/prototype-mercado/`](cosecha/prototype-mercado/index.html) (ruta de arranque, pipeline, secuencias, kit) |

3. [`research/FUENTES.md`](research/FUENTES.md) — fuentes consultadas y qué se tomó de cada una.

## Cómo ver los prototipos
Son HTML/CSS/JS sin compilar: doble clic en `index.html` (o `python3 -m http.server` en esta carpeta). Probar en el teléfono es lo más valioso: las tres apps se diseñaron primero para móvil. Las fuentes vienen de Google Fonts (con respaldo del sistema); en producción irían autoalojadas.

## Verificaciones ejecutables
| Qué | Dónde | Resultado |
|---|---|---|
| Límites de CV por nivel y papel (modelo de líneas) | [`huella/cv-spec/`](huella/cv-spec/README.md) | 6/6 combinaciones caben en su cupo |
| Auditoría ATS de un PDF real compilado con Typst | idem | 11/11 |
| Prueba de estrés al máximo de todos los límites | idem | 6/6 caben (1 · 2 · 2 páginas) |
| Reparto de Cosecha contra los casos 1–5 del plan de pruebas del MVP | `cosecha/prototype-operacion/allocation.test.js` | 7/7 (incluye 500 casos aleatorios) |
| Interfaz y lógica de los 5 prototipos (jsdom) | [`prototype-tests/`](prototype-tests/README.md) | 115/115 |
| Contraste WCAG de las paletas (claro y oscuro) | [`prototype-tests/contrast.py`](prototype-tests/contrast.py) | 66/66 pares ≥ 4,5:1 (3 defectos reales corregidos) |

## Qué NO está hecho (a propósito)
No se tocó el código de la aplicación ni la base de datos; no hay backend, IA real, envío de correos ni WhatsApp. Esto es la **especificación y la validación visual/funcional** previas a implementar, que requerirá CCR para lo que toque zonas protegidas (Docker/CI, BuildingBlocks, CSP).
