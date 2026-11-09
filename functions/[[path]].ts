import app from '../src/index';
export const onRequest: PagesFunction = ({ request, env, next }) => {
  // Use the real static-assets binding when available: next() routes
  // /admin.html back through Pages routing, which 308-redirects it to
  // /admin (clean-URL), looping forever. env.ASSETS fetches the file
  // content directly without that redirect.
  const assets = (env as any).ASSETS ?? { fetch: next };
  return app.fetch(request, { ...env, ASSETS: assets } as never);
};
