# Pruebas de los prototipos

> **Opcionales.** Se conservan y se pueden ejecutar, pero no son requisito de entrega de la Etapa 1 ni se amplían hasta la Etapa 2 (`docs/TESTING.md`). Ayudan a comprobar que los prototipos no se contradicen con sus documentos; no sustituyen la revisión visual del propietario.

Usan **jsdom** (un DOM real dentro de Node), porque en el entorno de trabajo no había navegador. Cargan cada `index.html`, ejecutan sus scripts, **cambian de rol con la barra de desarrollo**, hacen clic y comprueban resultados.

```bash
cd docs/requirements/prototype-tests
npm install
npm test            # o: bash run-all.sh   (requiere además: pip install typst python-docx; poppler-utils)
```

**Qué cubren:** por rol, **qué ve y qué NO debe ver** (p. ej., Acopio nunca ve montos; Comercial nunca ve pagos; el productor no tiene navegación; la matriz de permisos respeta el mínimo privilegio y la separación de funciones de Ágora); reparto proporcional con topes, equidad y plan B; recepción, entregas con prueba y espera pagable, reclamos con la política, modelo de pago (anticipo, saldo, adelanto acotado), caja y costos; puntuación de encaje y guardas de contacto; banco narrativo y derivación de logros, filtros duros, escalera de ajuste y guardián de verdad; resaltador sin inyección de HTML; escucha ciudadana, revisión, curaduría y administración de Ágora; que **cada captura de las guías abra en su rol y estado**; **Brisa** (reprogramación diaria derivada con los vectores V1–V10 y AC1–AC7 del inventario, reloj simulado, estados sin acceso/sin sesión/error); **Balance** (los casos dorados G01–G41 del inventario ejecutados contra el motor de dinero, la matriz de roles D3, el ciclo de vida D7, el bloqueo tras 5 intentos de ingreso y qué ve y qué NO ve cada rol).

**Contraste:** `contrast.py` mide 213 pares texto/fondo de las paletas (claro y oscuro) contra WCAG 2.x (≥ 4,5:1); al ampliarlo encontró defectos reales que se corrigieron (la última vez, el texto de las tarjetas pastel del tema oscuro de Brisa, entre 4,34 y 4,49:1).

**Reglas duras:** `check-hard-rules.js` revisa que ningún prototipo use morado ni símbolos de IA (AGENTS.md §7).

**Qué NO cubren:** apariencia (colores, tipografías, espaciados), animaciones y comportamiento en navegadores y dispositivos reales. Eso requiere abrir los prototipos y revisarlos a ojo (también en un teléfono). Las fuentes se cargan desde Google Fonts; sin Internet se verán las de respaldo.
