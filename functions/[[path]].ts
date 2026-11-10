import app from '../src/index';

export const onRequest: PagesFunction = ({ request, env, next }) => {
  // Prefer the real static-assets binding: next() routes /admin.html
  // through Pages routing, which 308-redirects it to /admin (clean-URL).
  const assets = (env as any).ASSETS ?? { fetch: next };
  const e: any = { ...env, ASSETS: assets };
  return app.fetch(request, e as never);
};
