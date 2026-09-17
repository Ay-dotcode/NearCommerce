import axios from 'axios';

/**
 * Shared Axios instance for all NearCommerce web clients.
 *
 * The base URL is read from the `VITE_API_URL` environment variable so that
 * each deployment environment (local, staging, production) can target the
 * correct backend without a code change.
 *
 * In browser (Vite) builds `import.meta.env.VITE_API_URL` is substituted at
 * build-time.  In Node / Jest environments the standard `process.env` fallback
 * is used instead.
 */
// Resolve the API base URL without referencing `process` (a Node global)
// so this module stays compatible with pure browser type configs.
// - In Vite builds, `import.meta.env.VITE_API_URL` is statically replaced.
// - In Jest/Node, `globalThis.process` is present and carries `process.env`.
const _env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

export const apiClient = axios.create({
  baseURL: _env?.VITE_API_URL ?? 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
