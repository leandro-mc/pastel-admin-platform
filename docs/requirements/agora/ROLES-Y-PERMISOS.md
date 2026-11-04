# Ágora · roles y permisos

> Complementa `REQUERIMIENTOS-AGORA.md`. Lo que se describe aquí **está implementado en el prototipo** (`prototype/`, selector «Ver como» de la barra de desarrollo) y **verificado por pruebas** (`prototype-tests/t-agora.js`, incluida la lectura de la matriz de permisos).
> Se conserva la decisión del repositorio: **solo el Owner concede roles** y existen sus cuatro roles base (visitante, registrada, autor/a, revisor/a, administrador); aquí se **amplían** los roles de operación editorial y de comunidad.

## 1. Principios
1. **Mínimo privilegio:** cada rol ve y hace solo lo que necesita.
2. **Separación de funciones:** *quien escribe no verifica; quien cura no verifica; quien modera no edita; quien administra cuentas no publica ni verifica.* Así ningún sello, destaque o moderación depende de una sola persona.
3. **Lo que no corresponde no se muestra**, y si alguien llega por enlace directo recibe un **«Sin permiso» que explica por qué** y a qué rol corresponde (no un error críptico).
4. **Todo lo sensible se audita** (sellos, roles, curaduría, resolución de errores, cambios de ajustes), también las acciones del propietario.
5. **Acceso temporal y revocable:** los accesos de equipo pueden **vencer** y se **revocan al instante**.
6. **Neutralidad por diseño:** ningún rol puede promover contenido por motivos partidarios; la curaduría tiene tope y criterios públicos (ver `INVESTIGACION-AGORA.md` §6).

## 2. Roles
| Rol | Quién es | Qué hace |
|---|---|---|
| **Visitante** (sin cuenta) | Cualquier persona | Lee, busca y **comparte** con contexto. Para guardar, reaccionar, preguntar o votar se le invita a crear una cuenta gratuita |
| **Persona registrada** | Lectora con cuenta | Guarda, reacciona (*Me ayudó a entender / Quiero más fuentes*), **pregunta al especialista**, **señala errores**, participa en la **escucha ciudadana** y propone afirmaciones |
| **Colaboradora (autora)** | Redactora | Escribe con la plantilla guiada y envía a revisión. **No** otorga sellos |
| **Revisora especialista** | Persona con formación en el tema | Comprueba fuentes y afirmaciones; **otorga el sello con alcance por escrito** o devuelve con comentarios. **No** revisa lo que escribió ni decide qué se destaca |
| **Editora (curaduría)** | Responsable de «Hoy en 5 minutos» y series | Elige qué se destaca (**tope de 5 minutos** y un solo tema duro por día). **No** otorga sellos |
| **Moderadora de comunidad** | Cuida la convivencia | Atiende **errores señalados, preguntas y propuestas** de la escucha; rechaza ataques personales. **No** edita contenido |
| **Administrador** | Soporte | Gestiona cuentas y roles; ve la auditoría. **No** publica ni verifica |
| **Propietario (superusuario)** | Dueño de la plataforma | Todo lo anterior + **ajustes de la plataforma** y concesión del rol de propietario. Sus acciones también se auditan |

## 3. Matriz de capacidades
| Capacidad | Visit. | Reg. | Colab. | Revisora | Editora | Moderadora | Admin | Propiet. |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Leer y buscar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Compartir con contexto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Guardar · Reaccionar · Preguntar · Señalar error · Votar en escucha | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Redactar y enviar a revisión | — | — | ✓ | — | — | — | — | ✓ |
| **Otorgar sello** | — | — | — | ✓ | — | — | — | ✓ |
| **Curar «Hoy en 5 minutos»** | — | — | — | — | ✓ | — | — | ✓ |
| **Moderar la bandeja** | — | — | — | — | — | ✓ | — | ✓ |
| **Gestionar cuentas y roles** | — | — | — | — | — | — | ✓ | ✓ |
| Ajustes de la plataforma | — | — | — | — | — | — | — | ✓ |

> El propietario tiene todas las capacidades, **pero la separación de funciones se mantiene para sus propias piezas** (no puede revisar lo que escribió) y todo queda en la auditoría.

## 4. Ciclo de vida de una pieza
```
Borrador ──(autora)──▶ En revisión ──(revisora: sello + alcance)──▶ Verificada ──(editora: opcional)──▶ Destacada
                          │                                            │
                          └──(revisora: devolver con comentarios)──▶ Borrador   └─(error señalado / corrección)──▶ Modificada tras la verificación
```
- **Modificada tras la verificación:** si se corrige algo después del sello, la pieza lo declara y **vuelve a la cola** de revisión; la corrección queda **visible con fecha**.
- **Sin sello no se oculta:** una pieza puede publicarse como *Pendiente de verificación* (decisión del MVP), siempre con el estado a la vista.

## 5. Ciclo de vida de una cuenta
**Invitación** (con rol y **vencimiento**) → **activa** → **cambio de rol** (auditado) → **revocación inmediata** o vencimiento. El administrador no puede asignar «propietario»; solo el propietario.

## 6. Qué se audita
Sellos otorgados/devueltos · cambios de rol e invitaciones · actualización de «Hoy en 5 minutos» · resolución de errores, preguntas y propuestas · cambios de ajustes · accesos denegados reiterados. La auditoría guarda **quién, qué, cuándo**; **no** contenido personal.

## 7. «Sin permiso» (patrón de interfaz)
Mensaje que dice **para quién es la sección**, **por qué** existe esa regla («la revisión la hace una persona distinta de quien escribe») y ofrece **volver** (o **crear cuenta** si es visitante). El motivo **cambia según quién** intenta entrar (a la editora no se le dice lo mismo que al visitante).

## 8. Reglas especiales
- **Neutralidad electoral:** en periodos electorales, el equipo editorial publica **guías para comparar propuestas** y **verificaciones**; **no** recomienda candidaturas ni partidos. La curaduría registra en su acta cómo equilibró temas.
- **Conflictos de interés:** quien tenga vínculo con el tema o la fuente **se declara** y no revisa esa pieza.
- **Menores:** sin funciones de interacción pública; solo lectura (cuenta con consentimiento del adulto responsable, a definir con asesoría legal).
- **Datos personales:** el sistema guarda lo mínimo (correo, preferencias); el anónimo guarda sus preferencias **solo en su navegador**.

## 9. Preguntas abiertas
¿Cuántas revisoras tendrá el equipo al inicio (y cuántas por tema)? ¿Se pagará la revisión o es voluntaria? ¿Quién decide la **política de correcciones** y su difusión? ¿A qué edad se permite crear cuenta propia? ¿Qué proceso de **apelación** existe para una propuesta rechazada por moderación?
