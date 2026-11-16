import type { CorsOptions } from "cors";

// Browsers may only call the API from the origins listed in CORS_ORIGINS (comma separated),
// plus FRONTEND_URL. Requests with no Origin header (the mobile app, curl, server to server)
// are not browser cross-site requests and are always allowed.
//
// When CORS_ORIGINS is not set the API keeps its previous behaviour (any origin is echoed
// back) so an existing deployment does not break; set it in production to lock this down.
const normalise = (origin: string) => origin.trim().replace(/\/+$/, "");

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map(normalise)
    .filter(Boolean);
  if (!configured.length) return [];
  const frontend = env.FRONTEND_URL ? [normalise(env.FRONTEND_URL)] : [];
  return [...new Set([...configured, ...frontend])];
}

export function buildCorsOptions(
  env: NodeJS.ProcessEnv = process.env,
): CorsOptions {
  const allowed = allowedOrigins(env);
  if (!allowed.length) return { origin: true, credentials: true };
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowed.includes(normalise(origin))) callback(null, true);
      else callback(null, false);
    },
  };
}
