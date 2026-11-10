export interface Store {get(key:string):Promise<string|null>; put(key:string,value:string,expires?:number):Promise<void>; delete(key:string):Promise<void>; list(prefix:string):Promise<Array<{key:string,value:string}>>}

/** Keeps the application-facing key/value API while storing durable data in four collections. */
import { localSubconfigs } from './local-subconfigs.js';
export const BUILTIN_SUBAPI_ID='d66a2015-73d4-5a1d-981e-bc9300f22569';

export class StructuredStore implements Store {
 private ready?:Promise<void>;
 constructor(private raw:Store){}
 private ensure(){return this.ready??=(async()=>{
  if(await this.raw.get('schema:collections')==='5')return;
  const parse=(value:string|null):any[]=>{try{const data=JSON.parse(value||'[]');return Array.isArray(data)?data:[]}catch{return[]}};
  const oldSubs=parse(await this.raw.get('subs'));
  const oldApis=parse(await this.raw.get('subapis'));
  const oldConfigs=parse(await this.raw.get('subconfigs'));
  const oldSite=parse(await this.raw.get('site'));
  const records=oldSubs.map(({updateEnable,updateMinutes,url,...item})=>({...item,id:String(item.id||url||''),owner:item.owner===true,subapi:item.subapi==='builtin'?BUILTIN_SUBAPI_ID:String(item.subapi||BUILTIN_SUBAPI_ID),subconfig:String(item.subconfig||''),block:String(item.block||'')}));
  for(const row of await this.raw.list('aggregate:')){try{const item=JSON.parse(row.value),id=String(item.id||row.key.slice('aggregate:'.length));if(!records.some(x=>x.id===id))records.push({id,owner:item.owner===true||item.kind==='self',subapi:item.backendId&&item.backendId!=='builtin'?item.backendId:BUILTIN_SUBAPI_ID,subconfig:item.rulesUrl||'',block:item.noAds||'',sources:item.sources||item.urls||[],name:item.name||'',kind:item.kind||'public',createdAt:item.createdAt||''})}catch{}}
  for(const row of await this.raw.list('subscription:')){try{const {updateEnable,updateMinutes,url: _ou,...item}=JSON.parse(row.value),id=String(item.id||_ou||'');if(id&&!records.some(x=>x.id===id))records.push({...item,id,recordType:'profile'})}catch{}}
  const subapis=oldApis.map(item=>({...item,url:String(item.url||item.apiUrl||''),enable:item.enable!==false}));
  for(const item of parse(await this.raw.get('config:backends'))){if(!item||!item.id)continue;const found=subapis.findIndex(x=>x.id===item.id);const normalized={...item,url:String(item.url||item.apiUrl||''),enable:item.enable!==false};delete (normalized as any).apiUrl;if(found<0)subapis.push(normalized);else subapis[found]=normalized}
  if(!subapis.some(x=>x.id===BUILTIN_SUBAPI_ID))subapis.unshift({id:BUILTIN_SUBAPI_ID,name:'内置转换器',url:'builtin://',enable:true,builtin:true});
  const subconfigs=oldConfigs.map(item=>{const preset=localSubconfigs.find(x=>x.url===item.url||x.id===item.id||x.id===String(item.id||'').replace(/^acl4ssr-/,''));return preset?{...item,...preset,enable:item.enable!==false}:{...item,enable:item.enable!==false}});
  for(const item of parse(await this.raw.get('config:localSubconfigs'))){if(item?.url&&!subconfigs.some(x=>x.url===item.url)){const preset=localSubconfigs.find(x=>x.url===item.url);subconfigs.push({...item,...preset,enable:item.enable!==false})}}
  for(const preset of localSubconfigs)if(!subconfigs.some(x=>x.id===preset.id||x.url===preset.url))subconfigs.push({...preset,enable:true});
  for(const item of parse(await this.raw.get('config:subconfigs'))){if(!item?.url)continue;const preset=localSubconfigs.find(x=>x.url===item.url||x.id===item.id||x.id===String(item.id||'').replace(/^acl4ssr-/,''));const normalized={...item,...preset,enable:item.enable!==false},found=subconfigs.findIndex(x=>x.id===item.id||x.url===item.url);if(found<0)subconfigs.push(normalized);else subconfigs[found]={...subconfigs[found],...normalized,localPreset:subconfigs[found].localPreset||normalized.localPreset}}
  for(const item of records){const rule=subconfigs.find(x=>x.url===item.subconfig);if(rule)item.subconfig=rule.id}
  const site=[...oldSite];
  const authRaw=await this.raw.get('auth:admin');if(authRaw&&!site.some(x=>x?.id==='adminAuth')){try{site.push({id:'adminAuth',value:JSON.parse(authRaw)})}catch{}}
  for(const row of await this.raw.list('config:')){const key=row.key.slice('config:'.length);if(['backends','subconfigs','localSubconfigs'].includes(key))continue;try{const value=JSON.parse(row.value);const found=site.findIndex(x=>x.id===key);if(found<0)site.push({id:key,value});else site[found]={id:key,value}}catch{}}
  for(const item of records)if(item.recordType==='profile'){item.owner=false;item.subapi=String(item.subapi||'');item.subconfig=String(item.subconfig||'');item.block=String(item.block||'')}
  const defaultRule=site.find(x=>x?.id==='defaultSubconfigId');if(defaultRule){const legacy=String(defaultRule.value||''),file=legacy.replace(/^acl4ssr-/,'');const preset=localSubconfigs.find(x=>x.id===legacy||x.url.endsWith('/'+file+'.ini'));if(preset)defaultRule.value=preset.id}
  const defaultApi=site.find(x=>x?.id==='defaultBackendId');if(defaultApi&&String(defaultApi.value)==='builtin')defaultApi.value=BUILTIN_SUBAPI_ID;
  await this.raw.put('subs',JSON.stringify(records));await this.raw.put('subapis',JSON.stringify(subapis));await this.raw.put('subconfigs',JSON.stringify(subconfigs));await this.raw.put('site',JSON.stringify(site));
  for(const row of [...await this.raw.list('aggregate:'),...await this.raw.list('subscription:')])await this.raw.delete(row.key);
  for(const row of await this.raw.list('config:'))await this.raw.delete(row.key);
  await this.raw.delete('auth:admin');
  await this.raw.put('schema:collections','5');
 })()}
 private async collection(name:string):Promise<any[]>{try{const value=JSON.parse((await this.raw.get(name))||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
 private async siteValue(key:string):Promise<any>{return (await this.collection('site')).find(x=>x?.id===key)?.value}
 private async setSiteValue(key:string,value:any){const site=await this.collection('site'),index=site.findIndex(x=>x?.id===key);if(index<0)site.push({id:key,value});else site[index]={id:key,value};await this.raw.put('site',JSON.stringify(site))}
 private async getAlias(key:string):Promise<string|null>{
  if(key==='auth:admin'){const value=await this.siteValue('adminAuth');return value===undefined?null:JSON.stringify(value)}
  if(key==='config:backends'){const rows=await this.collection('subapis');return rows.length?JSON.stringify(rows.map(({url,...item})=>({...item,apiUrl:url}))):null}
  if(key==='config:subconfigs'){const rows=(await this.collection('subconfigs')).filter(x=>!x.localPreset);return rows.length?JSON.stringify(rows):null}
  if(key==='config:localSubconfigs'){const rows=(await this.collection('subconfigs')).filter(x=>x.localPreset);return rows.length?JSON.stringify(rows):null}
  if(key.startsWith('config:')){const value=await this.siteValue(key.slice(7));return value===undefined?null:JSON.stringify(value)}
  if(key.startsWith('aggregate:')){const id=key.slice('aggregate:'.length),item=(await this.collection('subs')).find(x=>(x.id===id||x.url===id)&&!x.recordType);if(!item)return null;const configs=await this.collection('subconfigs'),rule=configs.find(x=>x.id===item.subconfig||x.url===item.subconfig);return JSON.stringify({id:item.id||item.url,owner:item.owner===true,name:item.name||'',sources:item.sources||[],groups:Array.isArray(item.groups)?item.groups:[],kind:item.owner===true?'self':'public',backendId:item.subapi||BUILTIN_SUBAPI_ID,rulesUrl:rule?.url||item.subconfig||'',noAds:item.block||'',createdAt:item.createdAt||'',expiresAt:item.expiresAt||''})}
  if(key.startsWith('subscription:')){const id=key.slice('subscription:'.length),item=(await this.collection('subs')).find(x=>(x.id===id||x.url===id)&&x.recordType==='profile');if(!item)return null;const {id: _rid,url: _ou,recordType,...profile}=item;return JSON.stringify({...profile,id:_rid||_ou})}
  return undefined as any;
 }
 async get(key:string){await this.ensure();const value=await this.getAlias(key);return value===undefined?this.raw.get(key):value}
 async put(key:string,value:string,expires=Number.MAX_SAFE_INTEGER){await this.ensure();
  if(key==='auth:admin')return this.setSiteValue('adminAuth',JSON.parse(value));
  if(key==='schema:collections'||key==='subapis'||key==='subconfigs'||key==='site')return this.raw.put(key,value,expires);
  if(key==='subs'){const rows=JSON.parse(value),clean=Array.isArray(rows)?rows.map(({updateEnable,updateMinutes,url,...item}:any)=>({...item,id:String(item.id||url||'')})):[];return this.raw.put(key,JSON.stringify(clean),expires)}
  if(key==='config:backends'){const incoming=JSON.parse(value),rows=Array.isArray(incoming)?incoming:[],old=await this.collection('subapis');let builtin=old.find(x=>x.id===BUILTIN_SUBAPI_ID)||{id:BUILTIN_SUBAPI_ID,name:'内置转换器',url:'builtin://',enable:true,builtin:true};const incomingBuiltin=rows.find((x:any)=>x?.id===BUILTIN_SUBAPI_ID);if(incomingBuiltin&&typeof incomingBuiltin.enable==='boolean')builtin={...builtin,enable:incomingBuiltin.enable};return this.raw.put('subapis',JSON.stringify([builtin,...rows.filter(x=>x?.id&&x.id!==BUILTIN_SUBAPI_ID).map(({apiUrl,...item}:any)=>({...item,url:String(item.url||apiUrl||''),enable:item.enable!==false}))]))}
  if(key==='config:subconfigs'){const incoming=JSON.parse(value),rows=Array.isArray(incoming)?incoming:[],old=await this.collection('subconfigs');for(const item of rows){if(!item?.id||!item?.url)continue;item.enable=item.enable!==false}const merged=rows.map(item=>({...item,enable:item.enable!==false}));for(const item of old.filter(x=>x.localPreset&&!merged.some(y=>y.id===x.id)))merged.unshift(item);return this.raw.put('subconfigs',JSON.stringify(merged))}
  if(key==='config:localSubconfigs'){const incoming=JSON.parse(value),old=await this.collection('subconfigs').then(rows=>rows.filter(x=>!x.localPreset));const local=Array.isArray(incoming)?incoming.map(x=>({...x,enable:x.enable!==false})):[];return this.raw.put('subconfigs',JSON.stringify([...local,...old]))}
  if(key==='groups'){const rows=JSON.parse(value),clean=Array.isArray(rows)?rows.filter((x:any)=>x&&typeof x.id==='string'&&x.id).map((x:any)=>({id:String(x.id),name:String(x.name||'').trim().slice(0,80),sources:Array.isArray(x.sources)?x.sources.filter((y:any)=>typeof y==='string'):[]})):[];return this.raw.put(key,JSON.stringify(clean),expires)}
  if(key.startsWith('config:'))return this.setSiteValue(key.slice(7),JSON.parse(value));
  if(key.startsWith('aggregate:')){const id=key.slice('aggregate:'.length),item=JSON.parse(value),rows=await this.collection('subs'),index=rows.findIndex(x=>(x.id===id||x.url===id)&&!x.recordType),configs=await this.collection('subconfigs'),rule=configs.find(x=>x.url===item.rulesUrl||x.id===item.rulesUrl);const owner=item.owner===true||item.kind==='self',normalized={id,owner,subapi:item.backendId==='builtin'?BUILTIN_SUBAPI_ID:item.backendId||BUILTIN_SUBAPI_ID,subconfig:rule?.id||item.rulesUrl||'',block:item.noAds||'',sources:item.sources||item.urls||[],groups:Array.isArray(item.groups)?item.groups.filter((x:any)=>typeof x==='string'):[],name:item.name||'',kind:owner?'self':'public',createdAt:item.createdAt||'',expiresAt:item.expiresAt||''};if(index<0)rows.push(normalized);else rows[index]=normalized;return this.raw.put('subs',JSON.stringify(rows))}
  if(key.startsWith('subscription:')){const id=key.slice('subscription:'.length),{updateEnable,updateMinutes,...item}=JSON.parse(value),rows=await this.collection('subs'),index=rows.findIndex(x=>(x.id===id||x.url===id)&&x.recordType==='profile');const normalized={...item,id,owner:false,subapi:'',subconfig:'',block:'',recordType:'profile'};if(index<0)rows.push(normalized);else rows[index]=normalized;return this.raw.put('subs',JSON.stringify(rows))}
  return this.raw.put(key,value,expires)
 }
 async delete(key:string){await this.ensure();if(key.startsWith('config:')){const name=key.slice(7);if(['backends','subconfigs','localSubconfigs'].includes(name))return;const site=await this.collection('site');await this.raw.put('site',JSON.stringify(site.filter(x=>x?.id!==name)));return}
  if(key.startsWith('aggregate:')||key.startsWith('subscription:')){const prefix=key.startsWith('aggregate:')?'aggregate:':'subscription:',id=key.slice(prefix.length),rows=await this.collection('subs').then(items=>items.filter(x=>prefix==='aggregate:'?!((x.id===id||x.url===id)&&!x.recordType):!((x.id===id||x.url===id)&&x.recordType==='profile')));return this.raw.put('subs',JSON.stringify(rows))}
  return this.raw.delete(key)
 }
 async list(prefix:string){await this.ensure();if(prefix==='aggregate:'||prefix==='subscription:'){const type=prefix==='aggregate:'?'aggregate':'profile',rows=await this.collection('subs'),result:Array<{key:string,value:string}>=[];for(const item of rows.filter(x=>type==='profile'?x.recordType==='profile':!x.recordType))result.push({key:prefix+(item.id||item.url),value:await this.getAlias(prefix+(item.id||item.url))||'{}'});return result}
  if(prefix==='config:'){const result:Array<{key:string,value:string}>=[];for(const item of await this.raw.list('config:'))if(!['config:localSubconfigs','config:backends','config:subconfigs','config:defaultBackendId','config:defaultSubconfigId','config:adminPath'].includes(item.key))result.push(item);for(const key of ['backends','subconfigs','localSubconfigs']){const value=await this.getAlias('config:'+key);if(value!==null)result.push({key:'config:'+key,value})}for(const entry of await this.collection('site'))if(entry.id!=='adminAuth')result.push({key:'config:'+entry.id,value:JSON.stringify(entry.value)});return result}
  return this.raw.list(prefix)
 }
 async exportData(){await this.ensure();return{site:await this.collection('site'),groups:await this.collection('groups'),subs:await this.collection('subs'),subapis:await this.collection('subapis'),subconfigs:await this.collection('subconfigs')}}
 async importData(data:{site:any[];groups?:any[];subs:any[];subapis:any[];subconfigs:any[]}){await this.ensure();const subs=data.subs.map(({updateEnable,updateMinutes,updatedAt,url,...item})=>({...item,id:String(item.id||url||'')}));await this.raw.put('site',JSON.stringify(data.site));if(Array.isArray(data.groups)){const groups=data.groups.filter((x:any)=>x&&typeof x.id==='string'&&x.id).map((x:any)=>({id:String(x.id),name:String(x.name||'').trim().slice(0,80),sources:Array.isArray(x.sources)?x.sources.filter((y:any)=>typeof y==='string'):[]}));await this.raw.put('groups',JSON.stringify(groups))}await this.raw.put('subs',JSON.stringify(subs));await this.raw.put('subapis',JSON.stringify(data.subapis));await this.raw.put('subconfigs',JSON.stringify(data.subconfigs))}
}

export class D1Store implements Store {
 constructor(private db:D1Database){}
 private async init(){await this.db.prepare('CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT NOT NULL,expires INTEGER NOT NULL)').run()}
 async get(k:string){await this.init();const r=await this.db.prepare('SELECT value FROM kv WHERE key=? AND expires>?').bind(k,Date.now()).first<{value:string}>();return r?.value??null}
 async put(k:string,v:string,e=Number.MAX_SAFE_INTEGER){await this.init();await this.db.prepare('INSERT OR REPLACE INTO kv VALUES(?,?,?)').bind(k,v,e).run()}
 async delete(k:string){await this.init();await this.db.prepare('DELETE FROM kv WHERE key=?').bind(k).run()}
 async list(prefix:string){await this.init();const r=await this.db.prepare('SELECT key,value FROM kv WHERE key LIKE ? AND expires>? ORDER BY key').bind(`${prefix}%`,Date.now()).all<{key:string,value:string}>();return r.results||[]}
}
