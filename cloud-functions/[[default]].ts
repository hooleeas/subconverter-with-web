import app from '../src/index.js';
import { BlobStore } from '../src/lib/blob-store.js';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

/** EdgeOne Makers Cloud Function (catch-all): Hono app backed by EdgeOne Blob. */
const store = new BlobStore();
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const assets = {
  async fetch(request: Request) {
    const url = new URL(request.url);
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    if (path.includes('..') || path.includes('\\')) return new Response('404 Not found', { status: 404 });
    try {
      const body = await readFile(resolve('public', `.${path}`));
      return new Response(body, { headers: { 'content-type': mime[extname(path)] || 'application/octet-stream', 'cache-control': (path.endsWith('.html') ? 'no-store' : (url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400')) } });
    } catch {
      return new Response('404 Not found', { status: 404 });
    }
  }
};

/**
 * EdgeOne's node-function runtime invokes the module's fetch() directly with
 * plain env vars, bypassing onRequest — so c.env.STORE would be missing and
 * every DB-backed route returns "Database binding is missing" (503).
 * Inject STORE at the fetch boundary so it works no matter how the app is
 * invoked. STATIC is intentionally NOT injected: static files are already
 * served correctly by the edge layer from .edgeone/assets/.
 */
const fetchWithStore = (request: Request, env?: any) =>
  app.fetch(request, { ...(env || {}), STORE: store } as never);

// Belt and braces: also inject via middleware in case the runtime calls the
// raw Hono app's fetch instead of the default export.
app.use('*', async (c, next) => {
  (c.env as any).STORE = store;
  await next();
});

export async function onRequest(context: any) {
  const request = context.request as Request;
  return fetchWithStore(request, (context as any).env);
}

export default { fetch: fetchWithStore };
