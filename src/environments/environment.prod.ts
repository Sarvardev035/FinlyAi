import { resolveApiUrl, resolveHttps } from './runtime-config';

export const environment = {
  production: true,
  // Use relative /api so Vercel's proxy rewrite forwards requests to the
  // backend server-side — this eliminates browser CORS entirely.
  apiUrl: resolveApiUrl('/api'),
  enforceHttps: resolveHttps(true),
};
