'use strict';

const DEFAULT_BACKEND_BASE = 'https://finly.uyqidir.uz/api';

function getBackendBase() {
  const raw = process.env.BACKEND_API_BASE || DEFAULT_BACKEND_BASE;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function sanitizeHeaders(incoming) {
  const headers = new Headers();
  const blocked = new Set([
    'host',
    'connection',
    'content-length',
    'origin',
    'referer',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-vercel-id',
  ]);

  for (const [key, value] of Object.entries(incoming || {})) {
    const k = key.toLowerCase();
    if (!blocked.has(k) && value != null) {
      headers.set(k, String(value));
    }
  }

  return headers;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    // Handle preflight at the edge so the browser never reaches backend CORS policy.
    res.status(204)
      .setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
      .setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      .setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-XSRF-TOKEN')
      .setHeader('Access-Control-Max-Age', '86400')
      .end();
    return;
  }

  const rawPath = req.query.path;
  const pathFromQuery = Array.isArray(rawPath)
    ? rawPath
    : (typeof rawPath === 'string' && rawPath.length
      ? rawPath.split('/').filter(Boolean)
      : []);

  const pathFromUrl = (() => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      return url.pathname.replace(/^\/api\/?/i, '').split('/').filter(Boolean);
    } catch {
      return [];
    }
  })();

  const parts = pathFromQuery.length ? pathFromQuery : pathFromUrl;

  const upstreamPath = parts.map((p) => encodeURIComponent(String(p))).join('/');
  const backendBase = getBackendBase();

  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    if (Array.isArray(val)) {
      for (const item of val) query.append(key, String(item));
    } else if (val != null) {
      query.append(key, String(val));
    }
  }

  const upstreamUrl = `${backendBase}/${upstreamPath}${query.toString() ? `?${query.toString()}` : ''}`;
  const headers = sanitizeHeaders(req.headers);

  const init = {
    method: req.method,
    headers,
    body: undefined,
  };

  if (!/^(GET|HEAD)$/i.test(req.method || '')) {
    if (typeof req.body === 'string') {
      init.body = req.body;
    } else if (req.body != null) {
      init.body = JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);

    // Keep CORS permissive for robustness if this endpoint is ever called cross-origin.
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Vary', 'Origin');

    res.send(text);
  } catch (error) {
    res.status(502).json({
      success: false,
      error: 'BAD_GATEWAY',
      message: 'Upstream API is temporarily unavailable.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};
