FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/Sirena.Api/Sirena.Api.csproj backend/Sirena.Api/
RUN dotnet restore backend/Sirena.Api/Sirena.Api.csproj
COPY backend/Sirena.Api backend/Sirena.Api
RUN dotnet publish backend/Sirena.Api/Sirena.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app/publish .
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Sirena.Api.dll"]
