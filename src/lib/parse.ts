import type { Node, Protocol } from './types.js';

const supported = new Set<Protocol>([
  'vless', 'vmess', 'trojan', 'shadowsocks', 'shadowsocksr', 'snell',
  'hysteria', 'hysteria2', 'tuic', 'anytls', 'mieru', 'wireguard',
  'socks', 'http', 'naive', 'shadowtls',
]);

const decodeURIComponentSafe = (value: string): string => {
  try { return decodeURIComponent(value); } catch { return value; }
};

function decode64(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

function decodeIfBase64(input: string): string {
  try { return decode64(input); } catch { return input; }
}

function decodeQueryParams(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = /^(?:obfsparam|protoparam|remarks|group)$/i.test(key) ? decodeIfBase64(value) : value;
  });
  return params;
}

function vmessNode(raw: string): Node | undefined {
  const encoded = raw.slice(raw.indexOf('://') + 3).split('#', 1)[0];
  const payload = JSON.parse(decode64(encoded)) as Record<string, unknown>;
  const server = String(payload.add ?? '');
  const port = Number(payload.port);
  const network = String(payload.net ?? 'tcp').toLowerCase();
  if (!server || !Number.isInteger(port) || port < 1 || port > 65535 || !payload.id) return;

  const node: Node = {
    type: 'vmess',
    name: String(payload.ps || `${server}:${port}`),
    server,
    port,
    uuid: String(payload.id),
    alterId: Number(payload.aid || 0),
    cipher: String(payload.scy || 'auto'),
    network,
    raw,
  };
  addVmessTransport(node, network, String(payload.path || ''), String(payload.host || ''), undefined, payload as Record<string, unknown>);
  const security = String(payload.tls || '').toLowerCase();
  if (security === 'tls' || security === 'reality') {
    node.tls = {
      enabled: true,
      server_name: String(payload.sni || payload.host || server),
      ...(security === 'reality' ? {
        reality: { enabled: true, public_key: payload.pbk ? String(payload.pbk) : undefined, short_id: String(payload.sid || '') },
        utls: { enabled: true, fingerprint: String(payload.fp || 'chrome') },
      } : {}),
    };
  }
  return node;
}

function ssrNode(raw: string): Node | undefined {
  const body = raw.slice(raw.indexOf('://') + 3);
  const [encodedPart, query = ''] = body.split('?', 2);
  const encoded = encodedPart.split('#', 1)[0]!.replace(/\/$/, '');
  const decoded = decode64(encoded).replace(/\/$/, '');
  const match = decoded.match(/^(.+):(\d+):([^:]+):([^:]+):([^:]+):(.+)$/);
  if (!match) return;
  const [, rawServer, portText, protocol, cipher, obfs, encodedPassword] = match;
  const server = rawServer!.replace(/^\[|\]$/g, '');
  const port = Number(portText);
  if (!server || !Number.isInteger(port) || port < 1 || port > 65535) return;
  const params = decodeQueryParams(query);
  const fragment = body.split('#', 2)[1];
  const name = fragment ? decodeURIComponentSafe(decodeIfBase64(fragment)) : params.remarks || `${server}:${port}`;
  return {
    type: 'shadowsocksr', name, server, port, protocol, obfs, cipher,
    password: decode64(encodedPassword),
    params: { ...params, protocolparam: params.protoparam || '', obfsparam: params.obfsparam || '' },
    raw,
  };
}

function shadowsocksCredentials(uri: string, url: URL): { cipher?: string; password?: string } {
  let auth = decodeURIComponentSafe(url.username);
  if (auth && !auth.includes(':')) {
    const decoded = decodeIfBase64(auth);
    if (decoded.includes(':')) auth = decoded;
  }
  if (!auth && url.href.includes('@')) {
    const authority = uri.slice(uri.indexOf('://') + 3, uri.lastIndexOf('@'));
    auth = decodeIfBase64(authority);
  }
  const delimiter = auth.indexOf(':');
  if (delimiter >= 0) return { cipher: auth.slice(0, delimiter), password: auth.slice(delimiter + 1) };
  return { cipher: auth || undefined, password: decodeURIComponentSafe(url.password) || undefined };
}

const xhttpOptionNames = new Set([
  'mode', 'headers', 'reuse-settings', 'download-settings', 'no-grpc-header', 'x-padding-bytes', 'x-padding-obfs-mode', 'x-padding-key',
  'x-padding-header', 'x-padding-placement', 'x-padding-method', 'uplink-http-method',
  'session-placement', 'session-key', 'session-table', 'session-length', 'seq-placement',
  'seq-key', 'uplink-data-placement', 'uplink-data-key', 'uplink-chunk-size',
  'sc-max-each-post-bytes', 'sc-min-posts-interval-ms',
]);

function normalizeXhttpOptions(source: Record<string, unknown>): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  const normalizeKey = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
  const add = (key: string, value: unknown) => {
    const normalized = normalizeKey(key);
    if (!xhttpOptionNames.has(normalized)) return;
    if (['string', 'number', 'boolean'].includes(typeof value)) options[normalized] = value;
    else if (['headers', 'reuse-settings', 'download-settings'].includes(normalized) && value && typeof value === 'object' && !Array.isArray(value)) options[normalized] = value;
  };
  for (const [key, value] of Object.entries(source)) {
    if (key.toLowerCase() === 'extra' && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [extraKey, extraValue] of Object.entries(value)) add(extraKey, extraValue);
    } else if (key.toLowerCase() === 'extra' && typeof value === 'string') {
      try {
        const extra = JSON.parse(value) as unknown;
        if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
          for (const [extraKey, extraValue] of Object.entries(extra)) add(extraKey, extraValue);
        }
      } catch { /* Ignore malformed optional XHTTP extras. */ }
    } else add(key, value);
  }
  return options;
}

function addVmessTransport(node: Node, network: string, path: string, host: string, mode?: string, options: Record<string, unknown> = {}): void {
  if (network === 'ws' || network === 'httpupgrade' || network === 'xhttp') {
    node.transport = {
      type: network, path: path || '/', ...(host ? { headers: { Host: host } } : {}),
      ...(mode ? { mode } : {}), ...(network === 'xhttp' ? { xhttpOptions: normalizeXhttpOptions(options) } : {}),
    };
  } else if (network === 'grpc') {
    node.transport = { type: 'grpc', service_name: path };
  } else if (network === 'http' || network === 'h2') {
    node.transport = { type: network, path: path || '/', host: host || undefined };
  } else if (network && network !== 'tcp') {
    node.transport = { type: network };
  }
}

export function parseNodes(text: string): Node[] {
  const nodes: Node[] = [];
  for (const original of text.split(/[\r\n]+/)) {
    const raw = original.trim();
    if (!raw) continue;
    try {
      if (/^vmess:\/\//i.test(raw)) {
        const node = vmessNode(raw);
        if (node) nodes.push(node);
        continue;
      }
      if (/^ssr:\/\//i.test(raw)) {
        const node = ssrNode(raw);
        if (node) nodes.push(node);
        continue;
      }

      const forceHttpTls = /^https:\/\//i.test(raw);
      const forceSocksTls = /^socks(?:5)?(?:\+|-)tls:\/\//i.test(raw);
      let uri = raw
        .replace(/^https:\/\//i, 'http://')
        .replace(/^socks5h?:\/\//i, 'socks://')
        .replace(/^socks(?:5)?(?:\+|-)tls:\/\//i, 'socks://')
        .replace(/^hy2:\/\//i, 'hysteria2://')
        .replace(/^naive\+https:\/\//i, 'naive://')
        .replace(/^naiveproxy:\/\//i, 'naive://')
        .replace(/^socks5:\/\//i, 'socks://')
        .replace(/^ss:\/\//i, 'shadowsocks://');
      if (/^shadowsocks:\/\//i.test(uri)) {
        const body = uri.slice(uri.indexOf('://') + 3);
        const authority = body.split(/[?#]/, 1)[0];
        if (!authority.includes('@')) {
          const decoded = decodeIfBase64(authority);
          if (decoded.includes('@')) uri = `shadowsocks://${decoded}${body.slice(authority.length)}`;
        }
      }
      const url = new URL(uri);
      const type = url.protocol.slice(0, -1).toLowerCase() as Protocol;
      if (!supported.has(type)) continue;

      const server = url.hostname.replace(/^\[|\]$/g, '');
      const port = Number(url.port || (type === 'naive' ? '443' : '0'));
      if (!server || !Number.isInteger(port) || port < 1 || port > 65535) continue;
      const query = url.searchParams;
      const params: Record<string, string> = {};
      query.forEach((value, key) => { params[key] = value; });
      const username = decodeURIComponentSafe(url.username);
      const password = decodeURIComponentSafe(url.password);
      const network = (query.get('type') || query.get('network') || query.get('transport') || '').toLowerCase();
      const name = decodeURIComponentSafe(url.hash.slice(1)) || `${type}-${server}:${port}`;
      const node: Node = { type, name, server, port, network: network || undefined, raw, params };

      if (type === 'shadowsocks') Object.assign(node, shadowsocksCredentials(uri, url));
      else if (type === 'wireguard') {
        node.privateKey = query.get('privatekey') || query.get('private_key') || username;
        node.params = {
          ...params,
          publickey: query.get('publickey') || query.get('publicKey') || query.get('public_key') || '',
          ip: query.get('address') || query.get('ip') || '',
          presharedkey: query.get('presharedkey') || query.get('preSharedKey') || query.get('pre_shared_key') || '',
          allowedips: query.get('allowedips') || query.get('allowedIPs') || query.get('allowed_ips') || '0.0.0.0/0',
        };
      } else {
        if (type === 'vless') node.uuid = username;
        else if (type === 'tuic') {
          const version = query.get('version') || (password ? '5' : '4');
          node.params!.version = version;
          if (version === '4') node.params!.token = query.get('token') || username;
          else { node.uuid = username; node.password = password; }
        }
        else if (['socks', 'http', 'naive', 'mieru'].includes(type)) node.username = username;
        else if (['trojan', 'hysteria', 'hysteria2', 'anytls', 'snell', 'shadowtls'].includes(type)) node.password = password || username;
        if (['socks', 'http', 'mieru', 'naive'].includes(type) && password) node.password = password;
      }

      node.cipher = query.get('cipher') || node.cipher;
      node.plugin = query.get('plugin') || undefined;
      if (node.plugin) {
        const [, ...options] = node.plugin.split(';');
        node.plugin = node.plugin.split(';', 1)[0];
        node.pluginOpts = Object.fromEntries(options.map(option => {
          const [key, value = 'true'] = option.split('=', 2);
          return [key, value];
        }));
      }
      node.protocol = query.get('protocol') || undefined;
      node.obfs = query.get('obfs') || undefined;
      node.flow = query.get('flow') || undefined;
      if (type === 'vless' || type === 'vmess' || type === 'trojan') {
        addVmessTransport(node, network, query.get('path') || '', query.get('host') || '', query.get('mode') || query.get('xhttpMode') || undefined, params);
      }
      if (type === 'hysteria' && query.has('auth')) node.password = query.get('auth') || undefined;
      if (type === 'hysteria') {
        node.params!.up_mbps = query.get('upmbps') || query.get('up_mbps') || query.get('up') || '100';
        node.params!.down_mbps = query.get('downmbps') || query.get('down_mbps') || query.get('down') || '100';
      }
      if (type === 'hysteria2' && query.has('obfs-password')) node.params!.obfs_password = query.get('obfs-password') || '';
      if (type === 'shadowtls') node.params!.version = query.get('version') || '3';
      if (type === 'snell') node.params!.version = query.get('version') || '3';
      if (type === 'vless') {
        node.params!.encryption = query.get('encryption') || 'none';
        if (query.get('security') === 'reality') node.params!.security = 'reality';
      }

      const security = (query.get('security') || ((forceHttpTls || forceSocksTls || query.get('tls') === 'true') ? 'tls' : '')).toLowerCase();
      const tlsEnabled = ['tls', 'reality'].includes(security) || query.has('sni') ||
        ['trojan', 'hysteria', 'hysteria2', 'tuic', 'anytls', 'naive', 'shadowtls'].includes(type);
      if (tlsEnabled) {
        node.tls = {
          enabled: true,
          server_name: query.get('sni') || query.get('peer') || query.get('servername') || query.get('host') || server,
          insecure: query.get('allowInsecure') === '1' || query.get('insecure') === '1',
          ...(query.has('alpn') ? { alpn: query.get('alpn')!.split(',') } : {}),
          ...(security === 'reality' ? {
            reality: { enabled: true, public_key: query.get('pbk') || undefined, short_id: query.get('sid') || '' },
            utls: { enabled: true, fingerprint: query.get('fp') || 'chrome' },
          } : query.has('fp') ? { utls: { enabled: true, fingerprint: query.get('fp') } } : {}),
        };
      }
      if (type === 'vless' && !node.uuid) continue;
      if (type === 'shadowsocks' && (!node.cipher || !node.password)) continue;
      if (['trojan', 'snell', 'hysteria2', 'anytls', 'naive'].includes(type) && !node.password) continue;
      if (type === 'tuic' && (node.params?.version === '4' ? !node.params.token : !(node.uuid && node.password))) continue;
      if (type === 'mieru' && !(node.username && node.password)) continue;
      if (type === 'wireguard' && !(node.privateKey && node.params?.publickey && node.params?.ip)) continue;
      if (type === 'hysteria2' && node.params?.obfs === 'salamander' && !node.params.obfs_password) continue;
      if (type === 'shadowtls' && Number(node.params?.version) > 1 && !node.password) continue;
      nodes.push(node);
    } catch {
      // Ignore malformed lines; one bad subscription item should not discard its peers.
    }
  }
  const uniqueNodes = [...new Map(nodes.map(node => [node.raw || `${node.type}|${node.server}|${node.port}|${node.name}`, node])).values()];
  const names = new Map<string, number>();
  for (const node of uniqueNodes) {
    const original = node.name;
    const next = (names.get(original) || 0) + 1;
    names.set(original, next);
    if (next > 1) node.name = `${original} (${next})`;
  }
  return uniqueNodes;
}
