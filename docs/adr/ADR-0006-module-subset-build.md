# ADR-0006 — Compilación por subconjunto de módulos

- Estado: contrato definido; Build debe verificar artefactos con subconjuntos.
- Contexto: la plataforma debe poder generar despliegues que incluyan solo determinadas apps.

## Decisión
`PASTEL_MODULES` controla el subconjunto durante el build Docker. `*` incluye todas las apps; en Docker, los códigos se escriben en minúsculas y separados por comas, por ejemplo `brisa,balance`. Identity se incluye siempre. El frontend consume los códigos originales; el Dockerfile del backend normaliza el código a nombre de carpeta PascalCase para MSBuild. En compilación manual de .NET, `PastelModules` usa nombres de carpeta como `Brisa;Balance`.

## Consecuencias
El subconjunto se determina al construir la imagen, no al esconder navegación. La compilación de un subconjunto comprueba referencias y ensamblados presentes, pero no constituye control de autorización: todos los endpoints incluidos deben seguir aplicando permisos del backend.

## Referencias
`docs/SPLIT_GUIDE.md`, `src/Host/Pastel.Host/Pastel.Host.csproj` y los Dockerfiles.
