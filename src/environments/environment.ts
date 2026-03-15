import { resolveApiUrl, resolveGroqApiKey, resolveHttps } from './runtime-config';

export const environment = {
  production: false,
  apiUrl: resolveApiUrl('/api'),
  enforceHttps: resolveHttps(false),
  groqApiKey: resolveGroqApiKey(''),
};
