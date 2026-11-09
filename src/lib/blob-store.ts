import { getStore } from '@edgeone/pages-blob';
import type { Store } from './db.js';

/**
 * EdgeOne Blob backend for the Store interface.
 * One Blob object per key; expiry is stored in a JSON envelope
 * ({"v": value, "e": expires}) because Blob has no built-in TTL.
 * Strong-consistency reads so a write is visible immediately after.
 */
export class BlobStore implements Store {
  private store: ReturnType<typeof getStore>;
  constructor(name = 'subconverter') {
    this.store = getStore(name);
  }
  private encode(value: string, expires: number): string {
    return JSON.stringify({ v: value, e: expires });
  }
  private decode(raw: string | null): string | null {
    if (raw === null) return null;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && 'v' in data && 'e' in data) {
        if (typeof data.e === 'number' && data.e <= Date.now()) return null;
        return String(data.v);
      }
    } catch { /* not an envelope: treat as a plain value */ }
    return raw;
  }
  async get(k: string): Promise<string | null> {
    const raw = await this.store.get(k, { type: 'text', consistency: 'strong' });
    return this.decode(raw);
  }
  async put(k: string, v: string, e = Number.MAX_SAFE_INTEGER): Promise<void> {
    await this.store.set(k, this.encode(v, e));
  }
  async delete(k: string): Promise<void> {
    await this.store.delete(k);
  }
  async list(prefix: string): Promise<Array<{ key: string; value: string }>> {
    const { blobs } = await this.store.list({ prefix, consistency: 'strong' });
    const out: Array<{ key: string; value: string }> = [];
    for (const b of blobs || []) {
      const value = await this.get(b.key);
      if (value !== null) out.push({ key: b.key, value });
    }
    return out;
  }
}
