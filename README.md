# Sirena Esentis — prototipo full stack

Prototipo funcional de la experiencia Sirena/Esentis: catálogo, carrito, asistente de productos, diagnóstico cosmético orientativo y colorimetría.

## Stack

- Web: React 19, TypeScript, Vinext/Vite y MediaPipe Tasks Vision.
- API: ASP.NET Core 8 Minimal API, Entity Framework Core y Npgsql.
- Datos: PostgreSQL 17 con migraciones EF Core.
- IA: Gemini Interactions API, invocada solo desde el backend.
- Infraestructura: Dockerfiles multi-stage y Docker Compose.

## Configuración

```bash
cp .env.example .env
```

Completa los secretos en `.env`:

- `GEMINI_API_KEY`: clave de Google AI Studio para el chatbot.
- `GOOGLE_MAPS_API_KEY`: clave separada de Google Maps Platform/Places API para autocompletar direcciones.
- `POSTGRES_PASSWORD`: usa una contraseña distinta y segura antes de publicar.

`.env` está excluido de Git. Nunca coloques estas claves en código del navegador ni en el repositorio.

## Ejecutar todo con Docker

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:5080/api/health
- PostgreSQL: localhost:5432

La API espera a que PostgreSQL esté saludable y aplica automáticamente las migraciones pendientes al iniciar.

## Ejecutar en desarrollo sin Compose

Requiere Node.js 22+, .NET SDK 8 y PostgreSQL accesible en `localhost:5432` con los valores de `.env`.

Terminal 1:

```bash
set -a
source .env
set +a
dotnet tool restore
dotnet run --project backend/Sirena.Api/Sirena.Api.csproj --urls http://localhost:5080
```

Terminal 2:

```bash
npm install
npm run dev
```

## API principal

- `GET /api/health`: salud de API y conexión a PostgreSQL.
- `GET /api/products`: catálogo y base de conocimiento.
- `POST /api/chat/answer`: chat delimitado a productos Sirena; guarda la conversación.
- `POST /api/skin-analyses`: guarda puntuaciones y colorimetría, no la fotografía.
- `POST /api/orders`: valida productos y recalcula totales en el servidor.
- `GET /api/maps/autocomplete`: proxy protegido para Places API.

Al iniciar, la API sincroniza desde las fichas públicas oficiales de Sirena.do exactamente 25 productos Esentis y las cinco referencias de maquillaje usadas en colorimetría. Los datos normalizados se guardan en PostgreSQL; el frontend y el motor de recomendaciones no contienen un catálogo alterno ni productos mock.

## Verificación

```bash
npm run lint
npm test
dotnet build backend/Sirena.Api/Sirena.Api.csproj
```

## Preparación para producción

Antes del despliegue cambia la contraseña de PostgreSQL, configura `ALLOWED_ORIGINS` con el dominio público, registra los secretos en el proveedor de hosting y habilita HTTPS. La fotografía del análisis facial se procesa localmente en el navegador y no se almacena en el backend.

## Cloudflare

El frontend Vinext está configurado como el Worker `sirena-esentis`:

```bash
npm run deploy:check
npm run deploy
```

La rama de producción del repositorio es `prod`. Cloudflare Workers Builds debe observar esa rama y ejecutar `npm run deploy`; `main` y `dev` conservan el mismo monorepo como ramas de integración y desarrollo.

Cloudflare Workers Free puede alojar la web, pero no ejecuta el contenedor ASP.NET. Cloudflare Containers requiere Workers Paid; por eso la API .NET y PostgreSQL deben desplegarse en un proveedor de contenedores/PostgreSQL o cambiar explícitamente la arquitectura de producción.

`render.yaml` describe la API ASP.NET y PostgreSQL para un Blueprint de Render. Después de crear el servicio, configura `NEXT_PUBLIC_API_URL` en Cloudflare con la URL pública de la API y mantén `prod` como rama de despliegue.
