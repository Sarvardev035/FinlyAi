type FinecoRuntimeConfig = {
  apiBaseUrl?: string;
  enforceHttps?: boolean;
};

function getRuntimeConfig(): FinecoRuntimeConfig {
  const config = (globalThis as { __FINECO_CONFIG__?: FinecoRuntimeConfig }).__FINECO_CONFIG__;
  return config ?? {};
}

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveApiUrl(fallback: string): string {
  const configured = getRuntimeConfig().apiBaseUrl?.trim();
  return configured ? normalizeUrl(configured) : fallback;
}

export function resolveHttps(fallback: boolean): boolean {
  const configured = getRuntimeConfig().enforceHttps;
  return typeof configured === 'boolean' ? configured : fallback;
}
