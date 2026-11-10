import { serve } from '@hono/node-server';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import app from './index.js';
import { localStore } from './lib/local-db.js';
import { StructuredStore } from './lib/db.js';
import { LOCAL_RULE_PREFIX } from './lib/local-subconfigs.js';
const store=localStore();
const structuredStore=new StructuredStore(store);
async function purgeExpiredLinks(){try{const now=Date.now();for(const item of await structuredStore.list('aggregate:')){try{const v=JSON.parse(item.value);if(!v.expiresAt)continue;const t=new Date(v.expiresAt).getTime();if(!isNaN(t)&&t<=now)await structuredStore.delete(item.key)}catch{}}}catch{}}
setInterval(()=>{purgeExpiredLinks()},60*60*1000);
purgeExpiredLinks();
async function cacheLocalRuleFiles(directory:string,relative=''):Promise<void>{
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const child=resolve(directory,entry.name),path=relative?`${relative}/${entry.name}`:entry.name;
  if(entry.isDirectory()){await cacheLocalRuleFiles(child,path);continue}
  if(!entry.isFile()||!(/\.ini$/i.test(entry.name)&&path.startsWith('config/'))&&!/\.list$/i.test(entry.name))continue;
  const url=`${LOCAL_RULE_PREFIX}${path}`;
  await store.put(`cache:${url}`,await readFile(child,'utf8'));
 }
}
try { await cacheLocalRuleFiles(resolve('ACL4SSR/Clash')); } catch { /* ACL4SSR source removed; rules come from GitHub now. */ }
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const assets={async fetch(request:Request){const url=new URL(request.url);let path=decodeURIComponent(url.pathname);if(path==='/')path='/index.html';if(path.includes('..')||path.includes('\\'))return new Response('404 Not found',{status:404});try{const body=await readFile(resolve('public',`.${path}`));return new Response(body,{headers:{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':(path.endsWith('.html')?'no-store':(url.searchParams.has('v')?'public, max-age=31536000, immutable':'public, max-age=86400'))}})}catch{return new Response('404 Not found',{status:404})}}};
serve({fetch:(request,env)=>app.fetch(request,{...env,STORE:store,STATIC:assets,ADMIN_USERNAME:process.env.ADMIN_USERNAME,ADMIN_PASSWORD:process.env.ADMIN_PASSWORD} as never),port:Number(process.env.PORT||25501)},info=>console.log(`Listening on http://localhost:${info.port}`));
