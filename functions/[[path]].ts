import app from '../src/index';
export const onRequest: PagesFunction = ({ request, env, next }) =>
  app.fetch(request, { ...env, ASSETS: { fetch: next } } as never);
