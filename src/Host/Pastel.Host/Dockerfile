# Contexto de compilación: la raíz del repositorio.
# PASTEL_MODULES: subconjunto de módulos a incluir ("*" = todos; Identity siempre). Ver docs/SPLIT_GUIDE.md.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG PASTEL_MODULES=*
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props global.json Pastel.slnx ./
COPY src/ src/
RUN dotnet restore src/Host/Pastel.Host/Pastel.Host.csproj "-p:PastelModules=${PASTEL_MODULES}"
RUN dotnet publish src/Host/Pastel.Host/Pastel.Host.csproj --configuration Release --no-restore --output /app/publish \
    /p:UseAppHost=false "-p:PastelModules=${PASTEL_MODULES}"

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Pastel.Host.dll"]
