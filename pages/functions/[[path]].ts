import app from '../../src/index';
export const onRequest: PagesFunction = ({ request, env, next }) => {
  const url = new URL(request.url);
  if (url.pathname === '/__debug-assets') {
    return new Response(JSON.stringify({
      hasAssets: !!(env as any).ASSETS,
      assetsType: typeof (env as any).ASSETS,
      envKeys: Object.keys(env as any),
    }), { headers: { 'content-type': 'application/json' } });
  }
  const assets = (env as any).ASSETS ?? { fetch: next };
  return app.fetch(request, { ...env, ASSETS: assets } as never);
};
