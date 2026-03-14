import { resolveApiUrl, resolveHttps } from './runtime-config';

export const environment = {
  production: true,
  apiUrl: resolveApiUrl('https://finly.uyqidir.uz/api'),
  enforceHttps: resolveHttps(true),
};
