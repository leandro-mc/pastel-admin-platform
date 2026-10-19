FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props global.json Pastel.slnx ./
COPY src/Pastel.Domain/Pastel.Domain.csproj src/Pastel.Domain/
COPY src/Pastel.Application/Pastel.Application.csproj src/Pastel.Application/
COPY src/Pastel.Infrastructure/Pastel.Infrastructure.csproj src/Pastel.Infrastructure/
COPY src/Pastel.Api/Pastel.Api.csproj src/Pastel.Api/
RUN dotnet restore src/Pastel.Api/Pastel.Api.csproj
COPY src/ src/
RUN dotnet publish src/Pastel.Api/Pastel.Api.csproj --configuration Release --no-restore --output /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Pastel.Api.dll"]
