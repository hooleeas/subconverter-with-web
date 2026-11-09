import app from '../src/index';
import { BlobStore } from '../src/lib/blob-store.js';

/**
 * Lazily-created Blob-backed store, used only when the runtime provides no
 * database binding (EdgeOne has no D1). On Cloudflare Pages env.DB exists,
 * so this is never constructed there — the static import is load-only.
 */
let blobStore: BlobStore | null = null;

export const onRequest: PagesFunction = ({ request, env, next }) => {
  // Prefer the real static-assets binding: next() routes /admin.html
  // through Pages routing, which 308-redirects it to /admin (clean-URL).
  const assets = (env as any).ASSETS ?? { fetch: next };
  const e: any = { ...env, ASSETS: assets };
  if (!e.STORE && !e.DB) {
    // EdgeOne: no D1 binding — back the store with EdgeOne Blob.
    if (!blobStore) blobStore = new BlobStore();
    e.STORE = blobStore;
  }
  return app.fetch(request, e as never);
};
