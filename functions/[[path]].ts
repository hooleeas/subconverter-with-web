import app from '../src/index';
export const onRequest: PagesFunction = async ({ request, env, next }) => {
  const url = new URL(request.url);
  if (url.pathname === '/__debug-assets') {
    const assets = (env as any).ASSETS;
    const results: any = {};
    for (const p of ['/admin.html', '/admin.html?x=1', '/admin.html?__v=1', '/index.html', '/index.html?x=1']) {
      try {
        const r = await assets.fetch(new Request(new URL(p, url.origin), request));
        results[p] = { status: r.status, location: r.headers.get('location'), type: r.headers.get('content-type') };
      } catch (e: any) {
        results[p] = { error: String(e?.message || e) };
      }
    }
    return new Response(JSON.stringify(results), { headers: { 'content-type': 'application/json' } });
  }
  const assets = (env as any).ASSETS ?? { fetch: next };
  return app.fetch(request, { ...env, ASSETS: assets } as never);
};
