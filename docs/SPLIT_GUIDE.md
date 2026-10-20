# Guía de compilación y despliegue por subconjunto de módulos

Pastel es un monolito modular. `PASTEL_MODULES` selecciona los módulos de negocio incluidos en las imágenes, mientras que Identity siempre forma parte del backend. Este parámetro es una decisión de empaquetado, **no** un control de autorización: cada endpoint sigue requiriendo permisos en el servidor.

## Convención

- `*`: todas las aplicaciones.
- Códigos de aplicación en minúsculas, separados por comas: `brisa,balance`, `agora`, `cosecha` o `huella`.
- Identity siempre se compila y queda disponible; no se requiere añadirlo a una lista de apps.
- En el build del frontend se conservan los códigos en minúsculas. El Dockerfile backend transforma el código inicial a PascalCase para que coincida con la carpeta del proyecto .NET.

## Docker Compose (Windows PowerShell)

Desde la raíz del repositorio, con Docker Desktop iniciado y `.env` configurado:

```powershell
# Todas las apps (valor habitual)
$env:PASTEL_MODULES = "*"
docker compose build api web
docker compose up -d api web

# Solo Brisa y Balance, además de Identity
$env:PASTEL_MODULES = "brisa,balance"
docker compose build api web
docker compose up -d api web

# Verificar los módulos compilados por el API a través de los logs/endpoint de catálogo correspondiente
docker compose logs --tail 100 api
```

Las variables de entorno de la sesión de PowerShell tienen precedencia sobre los valores de `.env`. Para volver al comportamiento normal, use `$env:PASTEL_MODULES = "*"`. Compose carga `compose.override.yaml` por defecto para la base local de desarrollo. Para una base externa, configure `POSTGRES_HOST` y ejecute la configuración base explícitamente con `docker compose -f compose.yaml ...`.

## Build backend directo

La propiedad de MSBuild `PastelModules` utiliza los nombres de las carpetas con mayúscula inicial y separados por punto y coma; Identity se agrega por referencia explícita:

```powershell
dotnet build src/Host/Pastel.Host/Pastel.Host.csproj "-p:PastelModules=Brisa;Balance"
dotnet build src/Host/Pastel.Host/Pastel.Host.csproj "-p:PastelModules=Identity"
```

Para build de todas las apps, omita la propiedad o use `-p:PastelModules=*`. No pase una lista minúscula directamente a la propiedad MSBuild: la normalización a PascalCase se hace en `src/Host/Pastel.Host/Dockerfile` para los argumentos del build Docker.

## Precauciones

- No retire Identity: es necesario para identidad, sesiones, catálogo y permisos.
- Excluir una app de la imagen oculta sus endpoints y páginas porque no se empaquetan sus ensamblados/manifiestos; no elimina sus tablas ni migra datos.
- No interprete un subconjunto como aislamiento de seguridad. Los módulos incluidos deben seguir aplicando autorización backend con denegación por defecto.
- Antes de construir un subconjunto para despliegue, valide la API y el frontend que correspondan. Build debe comprobar al menos una compilación completa y una por subconjunto sobre el SHA que se quiera desplegar.
- No se eliminan datos persistidos por cambiar `PASTEL_MODULES`. La limpieza de datos requiere una migración/procedimiento separado revisado por la persona responsable.
