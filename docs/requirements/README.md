# Requerimientos y prototipos · Ágora · Huella · Cosecha (v2)

> Levantamiento hecho sobre `refactor/modular-foundation` en una rama propia (`research/requirements-and-prototypes`); **no se escribió en ninguna rama existente**. Se ignoraron a propósito las paletas y restricciones del repositorio (autorizado por el propietario). Los datos, personas y organizaciones de los prototipos son **ficticios**; las «entrevistas» son **simuladas** (cada documento trae su guía para hacerlas de verdad).

## Empiece por aquí
1. [`METODO-DE-TRABAJO.md`](METODO-DE-TRABAJO.md) — el mecanismo que se consulta en cada iteración (papeles, ciclo, entrevistas, lista anti-diseño-genérico, lista de cierre, lecciones).
2. [`REVISION-UX-V1.md`](REVISION-UX-V1.md) — qué se encontró en sus capturas de la v1 y qué se corrigió.
3. [`DECISIONES-Y-HALLAZGOS.md`](DECISIONES-Y-HALLAZGOS.md) — decisiones (v1 y v2), funcionalidades nuevas, estado de lo pendiente y **limitaciones**.

## Una carpeta por app
| App | Requerimientos e investigación | Prototipo (abrir `index.html`) |
|---|---|---|
| **Ágora** | [`REQUERIMIENTOS-AGORA.md`](agora/REQUERIMIENTOS-AGORA.md) · [`INVESTIGACION-AGORA.md`](agora/INVESTIGACION-AGORA.md) · [`ROLES-Y-PERMISOS.md`](agora/ROLES-Y-PERMISOS.md) | [`agora/prototype/`](agora/prototype/index.html) — 8 roles, escucha ciudadana, revisión, curaduría, bandeja, administración |
| **Huella** | [`REQUERIMIENTOS-HUELLA.md`](huella/REQUERIMIENTOS-HUELLA.md) · [`INVESTIGACION-HUELLA.md`](huella/INVESTIGACION-HUELLA.md) · [`cv-spec/`](huella/cv-spec/README.md) (límites, plantilla, Word, auditoría) | [`prototype-estudio/`](huella/prototype-estudio/index.html) (banco en texto largo + crear CV) · [`prototype-perfil/`](huella/prototype-perfil/index.html) (página pública por rol) |
| **Cosecha** | [`REQUERIMIENTOS-COSECHA.md`](cosecha/REQUERIMIENTOS-COSECHA.md) · [`INVESTIGACION-COSECHA.md`](cosecha/INVESTIGACION-COSECHA.md) · [`MODELO-DE-PAGO.md`](cosecha/MODELO-DE-PAGO.md) · [`POLITICA-DE-RECLAMOS.md`](cosecha/POLITICA-DE-RECLAMOS.md) | [`cosecha/prototype/`](cosecha/prototype/index.html) — app única, 9 roles |
| **Guías de uso (Cosecha)** | [`cosecha/manuales/`](cosecha/manuales/README.md) — una por rol; `python3 build_manuals.py` genera el HTML con pantallas reales | `cosecha/manuales/html/index.html` |

Investigación y fuentes: [`research/`](research/FUENTES.md) (notas por app con confianza A/B/C y la decisión que provoca cada hallazgo).

## Cómo ver los prototipos
HTML/CSS/JS sin compilar: doble clic en `index.html`. **Arriba hay una barra amarilla «Solo desarrollo»**: elija el **rol** (la vista cambia: navegación, datos y acciones) y el **tema** (Auto/Claro/Oscuro). Parámetros de URL para capturas: `?role=acopio&view=recepcion&theme=dark&dev=0`. Las fuentes vienen de Google Fonts (con respaldo); en producción irían autoalojadas. **Pruébelos también en el teléfono.**

## Verificaciones ejecutables (opcionales; no son requisito de entrega)
> Política de etapas (`docs/TESTING.md`): estas pruebas **ya existen y se conservan**, y sirven para comprobar que los prototipos no se contradicen con sus documentos. **No son un requisito** de la Etapa 1 (construir las cinco apps funcionales) y **no se amplían** hasta la Etapa 2; la verificación visual real es la revisión del propietario.

```bash
cd docs/requirements/prototype-tests && npm install && npm test
```
| Qué | Resultado |
|---|---|
| Interfaz y lógica de los 5 prototipos con jsdom (por rol, incluyendo lo que **no** debe ver cada rol) + algoritmo de reparto | 202 comprobaciones |
| Contraste WCAG de las paletas en claro y oscuro | 94/94 pares |
| Cada «captura» de las guías abre en su rol y estado | 25/25 |
| CV: auditoría ATS del PDF compilado · Word leído de vuelta · límites por nivel y papel · estrés al máximo | 14/14 · 9/9 · 6/6 · 6/6 |

**Lo que NO cubre:** apariencia real (colores, espaciados, tipografías) en navegadores y dispositivos. Esa verificación es **la revisión visual del propietario**: envíe capturas de la v2.

## Qué NO está hecho (a propósito)
No se tocó el código de la aplicación ni la base de datos; no hay backend, IA real, envío de correos ni WhatsApp. Esto es la **especificación y la validación funcional/visual** previas a implementar. Pendiente: solicitud de **CCR** (Typst, fuentes y `Pastel.Documents`, ya aprobado en principio).
