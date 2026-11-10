// Copy bundled ACL4SSR rule files into public/ so edge deployments serve
// them as static assets. The edge function then reads rules from its own
// origin (ASSETS binding) instead of fetching GitHub at request time,
// which is slow and gets the function killed (HTTP 545).
import { cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dst = join(root, 'public', 'ACL4SSR');
rmSync(dst, { recursive: true, force: true });
cpSync(join(root, 'ACL4SSR'), dst, {
  recursive: true,
  filter: (p) => {
    const base = p.split('/').pop();
    return !base.startsWith('._') && base !== '.DS_Store';
  },
});
