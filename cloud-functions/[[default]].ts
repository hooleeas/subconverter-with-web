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

export async function onRequest(context: any) {
  const request = context.request as Request;
  return app.fetch(request, { STORE: store, STATIC: assets } as never);
}
