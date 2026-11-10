import app from '../src/index';

export const onRequest: PagesFunction = ({ request, env, next }) => {
  // The admin page is the extensionless file /admin-page, so Pages'
  // clean-URL redirect (which 308s /admin.html) never triggers.
  const assets = (env as any).ASSETS ?? { fetch: next };
  const e: any = { ...env, ASSETS: assets };
  return app.fetch(request, e as never);
};
