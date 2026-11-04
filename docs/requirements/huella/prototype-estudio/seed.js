/* Contenido de EJEMPLO del banco (persona ficticia). Todo esto es PRIVADO: nunca se publica; la IA lo usa para derivar CV. */
window.HUELLA_SEED = {
  contacto: { name: "Marta Solís Araya", headline: "QA Engineer / Desarrolladora Fullstack", city: "Heredia, Costa Rica", email: "marta.ejemplo@correo.test", phone: "+506 8888-0000", linkedin: "linkedin.com/in/marta-ejemplo", github: "github.com/marta-ejemplo" },
  historia: "Estudié informática y descubrí que lo que más me gusta es encontrar por qué algo falla antes de que le falle a una persona. Empecé como practicante haciendo reportes, pasé a desarrollar sistemas a la medida y hoy me dedico a automatizar pruebas. Busco un equipo donde la calidad sea de todos y no solo de quien prueba, idealmente en remoto o híbrido desde Heredia. Lo que mejor hago es explicar un error de forma que el equipo lo entienda y lo arregle rápido.",
  exps: [
    { id: "e1", role: "QA Automation Engineer", company: "Empresa Ejemplo S.A.", loc: "San José, CR", from: "Mar 2022", to: "Presente", text:
      "Entré a Empresa Ejemplo en marzo de 2022 como la primera persona dedicada a pruebas automáticas. El equipo era de 7 personas y todo se probaba a mano antes de cada versión.\n\nAutomaticé 140 pruebas end-to-end con Playwright y reduje la regresión manual de 2 días a 3 horas antes de cada versión. Integré las pruebas a GitHub Actions como puerta de despliegue; los fallos por despliegue bajaron 35 % en seis meses. Diseñé pruebas de carga con k6 sobre 12 endpoints críticos de la API antes del lanzamiento de la versión 3.\n\nDefiní la estrategia de pruebas de regresión de 3 equipos y un tablero de calidad semanal que producto usa en su revisión. Acompañé como mentora a 2 personas junior en automatización de pruebas; ambas pasaron a mantener sus propias suites. Reduje 40 % el tiempo de ejecución de la suite al paralelizarla en CI, de 25 a 15 minutos por cambio.\n\nTambién ayudé a soporte a reproducir errores de clientes, aunque nunca medí cuánto tiempo ahorró eso." },
    { id: "e2", role: "Desarrolladora Fullstack", company: "Estudio Demo", loc: "Heredia, CR", from: "Jun 2020", to: "Feb 2022", text:
      "Trabajé en Estudio Demo de junio de 2020 a febrero de 2022, en un equipo pequeño que hacía sistemas a la medida para negocios locales.\n\nConstruí un módulo de reservas en C# y React que hoy usan 8 clientes, con confirmación automática por correo. Elevé la cobertura de pruebas del 38 % al 71 % escribiendo pruebas unitarias y de integración en C# y TypeScript. Diseñé una API REST con 20 endpoints documentados con OpenAPI, consumida por la aplicación web y la móvil." },
    { id: "e3", role: "Practicante de desarrollo", company: "Startup Piloto", loc: "Heredia, CR", from: "Ene 2019", to: "Dic 2019", text:
      "Fui practicante durante todo 2019 mientras terminaba la carrera. Automaticé reportes semanales en Python que ahorraban 4 horas de trabajo manual al equipo de operaciones. Corregí 30 defectos del backlog y escribí mis primeros casos de prueba manuales para el equipo." },
  ],
  skills: [
    { n: "Playwright", c: "Pruebas", since: 2022, why: "Es mi herramienta principal desde 2022: construí y mantengo la suite end-to-end de mi equipo actual y enseñé a otras dos personas a usarla." },
    { n: "Cypress", c: "Pruebas", since: 2020, why: "La usé en Estudio Demo para pruebas de interfaz antes de pasar a Playwright. Hoy la leo sin problema pero no la uso a diario." },
    { n: "k6", c: "Pruebas", since: 2023, why: "Diseñé las pruebas de carga de la versión 3 con k6; sé leer resultados de percentiles y encontrar cuellos de botella." },
    { n: "Postman", c: "Pruebas", since: 2020, why: "Desde la práctica para probar APIs a mano y documentar colecciones." },
    { n: "TypeScript", c: "Lenguajes", since: 2020, why: "Escribo mis pruebas y mi proyecto abierto en TypeScript; lo uso a diario." },
    { n: "C#", c: "Lenguajes", since: 2020, why: "Fue mi lenguaje en Estudio Demo (backend de reservas y API REST)." },
    { n: "Python", c: "Lenguajes", since: 2019, why: "Lo uso para scripts y reportes desde la práctica." },
    { n: "SQL", c: "Lenguajes", since: 2019, why: "Consultas para validar datos en pruebas y reportes." },
    { n: "React", c: "Frameworks y herramientas", since: 2020, why: "Interfaz del módulo de reservas en Estudio Demo." },
    { n: "GitHub Actions", c: "Frameworks y herramientas", since: 2022, why: "Configuré el flujo que ejecuta las pruebas y bloquea los despliegues con fallos." },
    { n: "Docker", c: "Frameworks y herramientas", since: 2021, why: "Lo uso para levantar entornos de prueba locales; no he operado servicios en producción con Docker." },
    { n: "Mentoría", c: "Prácticas", since: 2023, why: "Acompaño a personas junior en automatización." },
  ],
  projects: [
    { id: "p1", name: "Bitácora de calidad", link: "github.com/marta-ejemplo/bitacora", what: "Panel open source que agrupa fallos de pruebas por causa raíz; alcanzó 120 estrellas en GitHub y 4 contribuciones externas.", how: "TypeScript, Playwright y GitHub Actions. Lee los reportes JUnit del CI, calcula una firma del error y agrupa los fallos repetidos." },
    { id: "p2", name: "Reportero de pruebas", link: "", what: "Script que genera cada semana el reporte de calidad en PDF a partir de los resultados de las pruebas del equipo.", how: "Python y una plantilla PDF; se ejecuta desde el CI cada lunes." },
  ],
  edu: [{ degree: "Bachillerato en Ingeniería Informática", school: "Universidad Ejemplo", from: "2016", to: "2020", note: "Énfasis en ingeniería de software." }],
  certs: [{ name: "ISTQB Foundation Level", issuer: "ISTQB", date: "2023", exp: "" }],
  langs: [{ lang: "Español", level: "Nativo", ev: "" }, { lang: "Inglés", level: "B2", ev: "Lectura técnica avanzada; reuniones en inglés una vez por semana." }],
  otros: [],
  privado: { ubicacion: "Heredia, Costa Rica", modalidad: "Remoto o híbrido", disponibilidad: "Desde diciembre de 2026", autorizacion: "Ciudadana costarricense", pretension: "(privada: nunca se envía)", evitar: "Trabajo 100 % presencial fuera de Heredia." },
  voz: "Escribo directo y en primera persona; prefiero verbos concretos («automaticé», «reduje») y cifras. No me gustan las frases como «apasionada por» o «orientada a resultados».",
};
window.HUELLA_OFFER = "QA Automation Engineer — Fintech Ejemplo (remoto, Costa Rica)\nBuscamos una persona con experiencia en automatización de pruebas end-to-end con Playwright o Cypress, integración en CI/CD con GitHub Actions, pruebas de API y de carga (k6 o JMeter) y conocimientos de Docker y Kubernetes. Inglés técnico (B2).\nRequisitos: 3 años de experiencia en automatización de pruebas; trabajo remoto desde Costa Rica; bachillerato universitario.\nValoramos: mentoría a personas junior, estrategia de pruebas de regresión y experiencia con TypeScript.";
window.HUELLA_GUIDES = {
  historia: ["¿Quién es usted profesionalmente, en dos o tres frases, como se lo contaría a un amigo?", "¿Qué busca ahora y qué NO quiere hacer?", "¿Qué hace mejor que la mayoría de las personas que conoce?"],
  exps: ["Contexto: ¿cómo era la empresa, el equipo, el problema cuando llegó?", "¿Qué hizo USTED (no el equipo)? Una cosa por frase, empezando por un verbo en pasado: «automaticé», «reduje», «diseñé»…", "¿Cuánto? Cifras, porcentajes, personas, tiempo, dinero. Si no las sabe, escriba una estimación honesta y márquela con «aprox.».", "¿Con qué herramientas? Nómbrelas tal como aparecen en las ofertas.", "¿Qué cambió gracias a lo que hizo y quién se benefició?", "Cosas que NO sabe medir: cuéntelas igual; el sistema le preguntará después."],
  skills: ["¿Por qué puede decir que tiene esta habilidad? Un proyecto, un cargo, un curso, cuánto tiempo.", "¿Desde cuándo y con qué frecuencia la usa? Sea honesta con el nivel: el sistema no lo publica como barra, lo usa para no prometer de más."],
  projects: ["¿Qué hace el proyecto y para quién?", "¿Cómo está hecho? Tecnologías, decisiones y algo difícil que resolvió.", "¿Qué resultado tuvo (usuarios, estrellas, ahorro)?"],
};
