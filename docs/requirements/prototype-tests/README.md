# Pruebas de los prototipos

Usan **jsdom** (un DOM real dentro de Node), porque en el entorno donde se levantaron los requerimientos no había navegador. Cargan cada `index.html`, ejecutan sus scripts, hacen clic y comprueban resultados.

```bash
cd docs/requirements/prototype-tests
npm install
npm test            # o: bash run-all.sh
```

**Qué cubren:** reparto proporcional con topes, equidad y plan B; recepción, liquidación y caja proyectada; puntuación de encaje y guardas de cumplimiento de contacto; importación con deduplicación; resaltador del perfil público (incluye que no inyecte HTML); presupuesto de líneas y escalera de ajuste del Estudio; guardián de verdad al editar; inicio finito, sello, glosario y compositor de Ágora.

**Contraste:** `contrast.py` mide 66 pares texto/fondo de las paletas (claro y oscuro) contra WCAG 2.x (≥ 4,5:1). Al ampliarlo encontró tres defectos reales (medidor del Estudio, aviso de faltante de Cosecha y rojo de error de Ágora en modo oscuro) que ya están corregidos.

**Qué NO cubren:** apariencia (colores, tipografías, espaciados), animaciones ni comportamiento en navegadores/dispositivos reales. Eso requiere abrir los prototipos y revisarlos a ojo (idealmente también en un teléfono). Las fuentes se cargan desde Google Fonts; sin Internet se verán las de respaldo.
