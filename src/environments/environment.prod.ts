import { resolveApiUrl, resolveGroqApiKey, resolveHttps } from './runtime-config';

export const environment = {
  production: true,
  apiUrl: resolveApiUrl('/api'),
  enforceHttps: resolveHttps(true),
  groqApiKey: resolveGroqApiKey(''),
};
