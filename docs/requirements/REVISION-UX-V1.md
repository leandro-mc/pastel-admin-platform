# Revisión de UX de la v1 (a partir de las capturas reales del propietario)

> Fuente: 23 capturas del navegador (`Imagenes_Prototipos.zip`). Se revisaron en detalle las de Ágora (inicio, oscuro), Cosecha (hoy, envío, recepción, pipeline, secuencia, ruta, dinero, modo campo), Huella (banco, resultado, perfil, CV en PDF). La verificación visual solo se puede hacer así: **ninguna prueba automática ve esto**.

## Qué funciona (se conserva)
- **Ágora**: familiar, limpia, con jerarquía clara (título serif, resumen en caja, sello con icono + texto, columnas con función). Es la referencia de calidad para las otras. Su modo oscuro está bien resuelto.
- Huella (perfil público): identidad propia (huella generativa, resaltador) y buena lectura del encabezado.

## Hallazgos y qué se hace en v2
| # | App / pantalla | Hallazgo (evidencia en la captura) | Sev. | Corrección v2 |
|---|---|---|---|---|
| 1 | **Todas** | Todas se ven en oscuro: dependen de la preferencia del sistema; no hay interruptor | Alta | Interruptor Auto/Claro/Oscuro en la barra de desarrollo y en la app; tokens con `light-dark()` |
| 2 | **Todas** | No hay forma de ver la app **desde cada rol** | Alta | Barra de desarrollo con selector de rol; navegación, datos y acciones cambian |
| 3 | **Cosecha** (todas) | Diseño móvil estirado en escritorio: columna angosta de ~46 rem en una pantalla de 1900 px, barra inferior de pestañas abarcando todo el ancho, mucho vacío | Alta | Diseño de escritorio real (barra lateral, tablas, paneles) y diseño móvil real (pestañas inferiores) |
| 4 | Cosecha · Pipeline | Solo se ven 3 de 6 etapas; el resto queda cortado (el contenedor tiene ancho de columna de formulario) | Alta | Tablero a todo el ancho con desplazamiento claro |
| 5 | Cosecha · Envío | La barra resumen (pedido / solicitado) **se superpone** a la barra de pestañas; casillas azules nativas; reparto en lista larga | Alta | Tabla de reparto de escritorio con columnas; resumen fijo sin colisión; controles propios |
| 6 | Cosecha · Hoy | Enlace "Mercado" en **morado** (visitado por defecto del navegador); poca información de un vistazo | Media | Estilos de enlace propios; "Hoy" como centro de mando (agenda del día, números, siguiente acción) |
| 7 | Cosecha · Operación y Mercado | Son dos aplicaciones separadas: se salta de una a otra con un botón | Media | **Una sola app** con módulos; el rol decide qué módulos ve |
| 8 | Cosecha · Recepción | Muestra **precio y monto** al rol de acopio, que no debería verlos | Media | Vista de Acopio sin precios; recepción en pasos |
| 9 | Cosecha · Dinero / Secuencia | Pantallas largas de una sola columna; lectura cansada | Media | Dos columnas en escritorio; secciones plegables; resumen arriba |
| 10 | **Huella · Banco** | Es una lista de frases cortas con contadores. **No** permite escribir "contando" la experiencia, ni explicar habilidades ni proyectos | Alta | Banco como **cuaderno privado**: texto libre largo por sección + secciones estructuradas; la IA deriva los logros |
| 11 | Huella · Resultado | Estado vacío "Aún no hay un CV generado. Vaya a «Generar»" = callejón sin salida | Alta | Flujo guiado de una sola pantalla (Objetivo → Evidencia → Resultado) con vista previa viva |
| 12 | Huella · CV (PDF) | Parece plantilla de Word por defecto: fuente tipo Arial en un solo peso, sin acento, espaciado apretado entre encabezado y contenido, contacto partido en dos líneas con separadores dobles | Alta | Tipografía y espaciado diseñados, acento sobrio en nombre y títulos, contacto en dos líneas controladas |
| 13 | Huella · CV (PDF) | **Defecto**: en Educación la fecha y el detalle quedan en la misma línea ("2016 - 2020 Énfasis en ingeniería…") | Alta | Detalle en su propia línea; prueba automática para evitar la regresión |
| 14 | Huella · Perfil | Dos huellas generativas (riel y encabezado): redundante | Baja | Una sola huella; más jerarquía en el encabezado |
| 15 | Ágora · Series | Los círculos muestran letras sueltas ("E, V, E, H, A") sin significado | Media | Iconos propios por serie y etiqueta clara |
| 16 | Ágora · Inicio | Enlaces de "Hoy en 5 minutos" subrayados en bloque, pesados | Baja | Títulos como enlaces sobrios con subrayado al pasar el cursor/foco |
| 17 | Ágora (todas) | Sin vista por rol (anónimo, lectora, colaboradora, revisor, editor, moderador, administrador) | Alta | Vistas y paneles por rol; matriz de permisos documentada |

## Principio que sale de esta revisión
La v1 demostró **lógica**; faltó demostrar **uso**. En v2 cada pantalla se diseña para el dispositivo y la persona reales, y se revisa con sus capturas antes de darla por buena.
