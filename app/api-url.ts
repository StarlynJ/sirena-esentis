const PRODUCTION_API_URL = "https://sirena-esentis-api.onrender.com";
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_API_URL;

// `.env` points local development to the .NET API on port 5080. Cloudflare
// builds run in production mode, so they must never bake that localhost URL
// into the browser bundle.
export const API_URL = (
  process.env.NODE_ENV === "development" ? configuredApiUrl : PRODUCTION_API_URL
).replace(/\/$/, "");
