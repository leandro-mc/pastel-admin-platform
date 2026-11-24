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
      modules="$(printf '%s' "$modules" | awk -F',' 'BEGIN { OFS="," } { for (i = 1; i <= NF; i++) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i); $i = toupper(substr($i, 1, 1)) substr($i, 2) } print }')"; \
    fi; \
    dotnet restore src/Host/Pastel.Host/Pastel.Host.csproj "-p:PastelModules=$modules" && \
    dotnet publish src/Host/Pastel.Host/Pastel.Host.csproj --configuration Release --no-restore --output /app/publish /p:UseAppHost=false "-p:PastelModules=$modules"

# Motor documental (CCR-2): Typst con versión fijada y suma de control verificada. Mantener la versión y las sumas
# iguales en scripts/test-backend.ps1. Fuente: https://github.com/typst/typst/releases (licencia Apache-2.0).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS typst
ARG TARGETARCH
ARG TYPST_VERSION=0.15.1
ARG TYPST_SHA256_AMD64=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c
ARG TYPST_SHA256_ARM64=5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee
RUN set -eu; \
    case "${TARGETARCH:-amd64}" in \
      amd64) arch=x86_64; sum="$TYPST_SHA256_AMD64" ;; \
      arm64) arch=aarch64; sum="$TYPST_SHA256_ARM64" ;; \
      *) echo "Arquitectura no soportada para Typst: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    apt-get update; \
    apt-get install -y --no-install-recommends xz-utils; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fsSL -o /tmp/typst.tar.xz "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${arch}-unknown-linux-musl.tar.xz"; \
    echo "$sum  /tmp/typst.tar.xz" | sha256sum -c -; \
    tar -xJf /tmp/typst.tar.xz -C /tmp; \
    install -m 0755 "/tmp/typst-${arch}-unknown-linux-musl/typst" /usr/local/bin/typst; \
    /usr/local/bin/typst --version

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
# curl se usa exclusivamente para consultar /health/ready en el healthcheck de Compose.
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0 \
    Documents__TypstPath=/usr/local/bin/typst
COPY --from=typst /usr/local/bin/typst /usr/local/bin/typst
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Pastel.Host.dll"]
