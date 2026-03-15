import { resolveApiUrl, resolveHttps } from './runtime-config';

export const environment = {
  production: true,
  apiUrl: resolveApiUrl('/api'),
  enforceHttps: resolveHttps(true),
};
