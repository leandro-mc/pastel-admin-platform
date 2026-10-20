# Contexto de compilación: la raíz del repositorio.
# PASTEL_MODULES usa códigos de aplicación en minúsculas (p. ej. brisa,balance).
# Se convierten a nombres de carpeta PascalCase para MSBuild; Identity siempre se incluye.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG PASTEL_MODULES=*
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props global.json Pastel.slnx ./
COPY src/ src/
RUN set -eu; \
    modules="$PASTEL_MODULES"; \
    if [ "$modules" != "*" ]; then \
      modules="$(printf '%s' "$modules" | awk -F',' '{ for (i = 1; i <= NF; i++) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i); $i = toupper(substr($i, 1, 1)) substr($i, 2) } print }')"; \
    fi; \
    dotnet restore src/Host/Pastel.Host/Pastel.Host.csproj "-p:PastelModules=$modules" && \
    dotnet publish src/Host/Pastel.Host/Pastel.Host.csproj --configuration Release --no-restore --output /app/publish /p:UseAppHost=false "-p:PastelModules=$modules"

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
# curl se usa exclusivamente para consultar /health/ready en el healthcheck de Compose.
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Pastel.Host.dll"]
