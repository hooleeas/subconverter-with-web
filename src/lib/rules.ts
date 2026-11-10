import type {Store} from './db.js';
import {LOCAL_RULE_PREFIX} from './local-subconfigs.js';
export interface RuleConfig {groups:Array<{name:string,type:string,proxies:string[];url?:string;interval?:number;tolerance?:number}>;rules:string[]}
// Parsed rule sets are deterministic per template. Keep them in memory so
// a warm isolate does not re-fetch and re-parse 17k rules on every
// request (that CPU burst is what gets the edge function killed).
const ruleCache=new Map<string,RuleConfig>();
export async function loadRules(store:Store|null, templateUrl:string|undefined, fetcher:typeof fetch=fetch, assets?:{fetch:(req:Request)=>Promise<Response>}, assetBase?:string):Promise<RuleConfig>{
 if(!templateUrl)throw new Error('No SUBCONFIG selected');
 const cached=ruleCache.get(templateUrl);if(cached)return cached;
 const ini=await cachedText(store,templateUrl,fetcher,assets,assetBase);const entries:Array<{group:string,url:string}>=[];const groups:Array<{name:string,type:string,proxies:string[]}>=[];
 for(const line of ini.split(/\r?\n/)){const s=line.trim();if(!s||s.startsWith(';')||s.startsWith('#'))continue;
  if(s.startsWith('ruleset=')){const v=s.slice(8),comma=v.indexOf(',');if(comma<0)continue;const group=v.slice(0,comma).trim(),resource=v.slice(comma+1).trim();const url=resource.startsWith('[]')?resource:resource.replace(/,\s*\d+\s*$/,'');entries.push({group,url});}
  if(s.startsWith('custom_proxy_group=')){const parts=s.slice(19).split('`').map(x=>x.trim());const name=parts.shift();const rawType=parts.shift()||'select';if(name){const type=rawType==='url-test'?'url-test':rawType==='fallback'?'fallback':rawType==='load-balance'?'load-balance':'select';const optionIndex=parts.findIndex(x=>/^https?:\/\//i.test(x));const optionParts=optionIndex<0?[]:parts.slice(optionIndex);const option=optionParts.length?optionParts.join(','):undefined;const params=option?.split(',')||[];const proxyParts=optionIndex<0?parts:parts.slice(0,optionIndex);const proxies=proxyParts.filter(Boolean).map(x=>x.startsWith('[]')?x.slice(2):x);groups.push({name,type,proxies,...(option?{url:params[0],interval:Number(params[1])||300,tolerance:Number(params[3])||50}:{})});}}
 }
 const loadOne=async (entry:{group:string,url:string}):Promise<string[]>=>{
  if(entry.url.startsWith('[]')){const directive=entry.url.slice(2).trim();if(/^FINAL$/i.test(directive)||/^MATCH$/i.test(directive))return [`MATCH,${entry.group}`];const comma=directive.indexOf(',');const type=comma<0?directive:directive.slice(0,comma);const value=comma<0?'':directive.slice(comma+1);return type?[`${type}${value?`,${value}`:''},${entry.group}`]:[];}
  const url=resolveRuleUrl(entry.url,templateUrl);const contents=await cachedText(store,url,fetcher,assets,assetBase);const rules:string[]=[];for(const raw of contents.split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#')||line.startsWith(';'))continue;const parts=line.split(',').map(value=>value.trim());let rule:string;if(parts.length===1){const value=parts[0]!;rule=/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d+)?$/.test(value)?`IP-CIDR,${value},${entry.group},no-resolve`:`DOMAIN-SUFFIX,${value},${entry.group}`;}else{const flags=parts.slice(2).filter(value=>/^(?:no-resolve|no-resolve-via-proxy)$/i.test(value));const match=parts.slice(0,2).join(',');rule=`${match},${entry.group}${flags.length?`,${flags.join(',')}`:''}`;}rules.push(rule);}return rules;
 };
 // Fetch rule lists in small batches: firing all 15 ASSETS subrequests
 // at once intermittently kills the edge function (HTTP 545), so cap
 // concurrency at 5.
 const ruleLists:string[][]=[];for(let i=0;i<entries.length;i+=5){ruleLists.push(...await Promise.all(entries.slice(i,i+5).map(loadOne)));}
 const rules=ruleLists.flat();
 if(!groups.length)groups.push({name:'PROXY',type:'select',proxies:[]});if(!rules.some(rule=>/^(?:MATCH|FINAL),/i.test(rule)))rules.push(`MATCH,${groups.find(g=>/节点选择|proxy/i.test(g.name))?.name||groups[0].name}`);const out={groups,rules};ruleCache.set(templateUrl,out);return out;
}

function resolveRuleUrl(resource: string, templateUrl: string): string {
 if (templateUrl.startsWith(LOCAL_RULE_PREFIX)) {
  const officialBase = 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/';
  if (resource.startsWith(officialBase)) return `${LOCAL_RULE_PREFIX}${resource.slice(officialBase.length)}`;
  const localPath = 'rules/ACL4SSR/Clash/';
  if (resource.startsWith(localPath)) return `${LOCAL_RULE_PREFIX}${resource.slice(localPath.length)}`;
 }
 return new URL(resource, templateUrl).toString();
}

/**
 * AbortSignal.timeout() doesn't exist in some runtimes (EdgeOne edge
 * isolates). Fall back to an AbortController + setTimeout.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export async function fetchRuleText(url:string,fetcher:typeof fetch=fetch,assets?:{fetch:(req:Request)=>Promise<Response>},assetBase?:string):Promise<string>{
 // Bundled rule files ship as static assets (public/ACL4SSR). On edge
 // runtimes read them from the ASSETS binding instead of GitHub: fetching
 // 15 lists from raw.githubusercontent.com at request time is slow and
 // gets the function killed (HTTP 545). The asset URL must use the real
 // request origin (assetBase): a synthetic host makes the binding miss.
 // Fall back to GitHub if the binding is absent or the file is not deployed.
 if(url.startsWith(LOCAL_RULE_PREFIX)&&assets){
  try{
   const res=await assets.fetch(new Request((assetBase||'https://assets.local/ACL4SSR/Clash/')+url.slice(LOCAL_RULE_PREFIX.length)));
   if(res.ok)return res.text();
  }catch{}
 }
 let fetchUrl=url;
 if(url.startsWith(LOCAL_RULE_PREFIX))fetchUrl='https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/'+url.slice(LOCAL_RULE_PREFIX.length);
 const parsed=new URL(fetchUrl);if(!['http:','https:'].includes(parsed.protocol))throw new Error('Only HTTP(S) rule URLs are allowed');
 let response:Response;
 try{response=await fetcher(fetchUrl,{signal:timeoutSignal(15000)})}
 catch(error){throw new Error(`Could not fetch rule resource ${parsed.host}: ${errorMessage(error)}`)}
 if(!response.ok)throw new Error(`Could not fetch rule resource ${parsed.host}: HTTP ${response.status}`);
 return response.text();
}

function errorMessage(error:unknown):string{return error instanceof Error?error.message:String(error)}
async function cachedText(store:Store|null,url:string,fetcher:typeof fetch,assets?:{fetch:(req:Request)=>Promise<Response>},assetBase?:string){
 // Bundled rules are read from ASSETS (fast, local) on edge runtimes, so
 // skip the BlobStore cache for local:// files entirely: one Blob get
 // already takes 0.8-3.5s, and 16 of them (1 sequential + 15 parallel)
 // exceed the platform's kill threshold even on a cache hit. The store
 // cache is only for the GitHub path (no ASSETS binding, e.g. Node).
 if(url.startsWith(LOCAL_RULE_PREFIX)&&assets)return fetchRuleText(url,fetcher,assets,assetBase);
 const key=`cache:${url}`;const cached=await store?.get(key);if(cached!==null&&cached!==undefined)return cached;const body=await fetchRuleText(url,fetcher,assets,assetBase);await store?.put(key,body,Date.now()+3600000);return body;}
