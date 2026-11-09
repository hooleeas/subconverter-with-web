import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Store } from './db.js';
export function localStore():Store {
 const filename=process.env.DB_PATH||'data/app.db';
 mkdirSync(dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec('CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT NOT NULL,expires INTEGER NOT NULL)');
 return {
  async get(key){return db.prepare('SELECT value FROM kv WHERE key=? AND expires>?').get(key,Date.now())?.value as string||null},
  async put(key,value,expires=Number.MAX_SAFE_INTEGER){db.prepare('INSERT OR REPLACE INTO kv VALUES(?,?,?)').run(key,value,expires)},
  async delete(key){db.prepare('DELETE FROM kv WHERE key=?').run(key)},
  async list(prefix){return db.prepare('SELECT key,value FROM kv WHERE key LIKE ? AND expires>? ORDER BY key').all(`${prefix}%`,Date.now()) as Array<{key:string,value:string}>}
 };
}
