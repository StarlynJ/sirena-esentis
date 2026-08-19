export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "https://sirena-esentis-api.onrender.com"
).replace(/\/$/, "");
