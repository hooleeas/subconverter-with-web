import app from '../../src/index';
export const onRequest: PagesFunction = ({ request, env, next }) => {
  // Prefer the real static-assets binding: next() routes /admin.html
  // through Pages routing, which 308-redirects it to /admin (clean-URL).
  const assets = (env as any).ASSETS ?? { fetch: next };
  return app.fetch(request, { ...env, ASSETS: assets } as never);
};
