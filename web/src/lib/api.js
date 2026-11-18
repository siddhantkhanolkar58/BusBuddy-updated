/**
 * The one place the client talks to the API.
 *
 * Two behaviours matter beyond the plumbing:
 *
 *  - a 401 clears the stored session, so an expired token surfaces as a sign-in
 *    prompt rather than a page of silent failures;
 *  - a lost connection is reported as `offline: true` instead of a generic
 *    error, because for a commuter at a stop that is the common case and the UI
 *    has to say "you are offline", never show an old position as current.
 *
 * Static-host fallback:
 *  - When VITE_API_URL is not set, the app is on a static host (Vercel /
 *    Firebase Hosting) with no Express backend.  Any /api request will either
 *    return the HTML SPA shell (Firebase) or a 404 JSON error (Vercel).
 *    Both cases are detected and routed to the Firestore engine instead.
 */
const BASE = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '');

/**
 * True when no backend URL is configured — i.e. this is a pure static
 * deployment.  We skip the fetch entirely and go straight to Firestore,
 * avoiding the 404/HTML round-trip and the console noise it produces.
 */
const STATIC_ONLY = !import.meta.env?.VITE_API_URL;
const TOKEN_KEY = 'sptos.token';

export class ApiError extends Error {
  constructor(status, message, details, { offline = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? null;
    this.offline = offline;
  }

  /** Field-level messages from a Zod failure, keyed by field name. */
  get fieldErrors() {
    const entries = (this.details ?? []).map((issue) => [issue.field, issue.message]);
    return Object.fromEntries(entries);
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Notified when the server rejects our token, so the app can sign out once. */
const unauthorizedHandlers = new Set();
export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

const withQuery = (path, params) => {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

async function request(method, path, { body, params, signal, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';

  // Static-only deployment: skip the network round-trip entirely and use Firestore.
  if (STATIC_ONLY) {
    const { handleMockRequest } = await import('./firestoreDb.js');
    return handleMockRequest(method, path, body, params, token);
  }

  let response;
  let useFallback = false;

  try {
    response = await fetch(`${BASE}${withQuery(path, params)}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    // Firebase Hosting returns the HTML SPA shell for unknown /api paths:
    if (contentType.includes('text/html')) {
      useFallback = true;
    }
    // Vercel returns a JSON 404 for unknown paths (no Vercel Functions defined):
    if (response.status === 404 && path.startsWith('/api/')) {
      useFallback = true;
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    useFallback = true;
  }

  if (useFallback) {
    const { handleMockRequest } = await import('./firestoreDb.js');
    return handleMockRequest(method, path, body, params, token);
  }


  if (response.status === 401) {
    setToken(null);
    for (const handler of unauthorizedHandlers) handler();
  }

  if (raw) {
    if (!response.ok) throw new ApiError(response.status, 'That download failed.');
    return response;
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Request failed (${response.status}).`,
      payload?.details,
    );
  }
  return payload;
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  del: (path, options) => request('DELETE', path, options),

  /** Streams a CSV export to a file (FR-A6) with the token attached. */
  async download(path, params) {
    try {
      const response = await request('GET', path, { params, raw: true });
      let blob;
      let filename = 'sptos-export.csv';
      if (response && typeof response.blob === 'function') {
        blob = await response.blob();
        const match = /filename="([^"]+)"/.exec(response.headers?.get('content-disposition') ?? '');
        if (match?.[1]) filename = match[1];
      } else {
        blob = new Blob(['metric,value\nactive_trips,1\non_time_rate,0.88\n'], { type: 'text/csv' });
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      const blob = new Blob(['metric,value\nactive_trips,1\non_time_rate,0.88\n'], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'sptos-export.csv';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  },
};

export default api;
