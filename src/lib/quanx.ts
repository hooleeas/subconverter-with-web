import type { Node } from './types.js';
import type { RuleConfig } from './rules.js';

const clean = (value: string) => value.replace(/[\r\n,]/g, ' ').trim();
const endpoint = (node: Node) => `${node.server.includes(':') ? `[${node.server}]` : node.server}:${node.port}`;
const value = (input: unknown) => {
  if (input === undefined || input === null || input === '') return '';
  const text = String(input);
  return /[,\s"]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
};
const option = (key: string, input: unknown) => input === undefined || input === null || input === '' ? '' : `${key}=${value(input)}`;

export const isQuanxCompatible = (node: Node) => {
  if (!['vmess', 'vless', 'trojan', 'shadowsocks', 'shadowsocksr', 'socks', 'http', 'anytls'].includes(node.type)) return false;
  if (node.transport && !['ws', 'http'].includes(node.transport.type)) return false;
  if (node.transport?.type === 'http' && !['vmess', 'vless'].includes(node.type)) return false;
  if (node.transport?.type === 'ws' && node.tls?.enabled && node.transport.headers?.Host && node.tls.server_name && node.transport.headers.Host.toLowerCase() !== node.tls.server_name.toLowerCase()) return false;
  if (node.type === 'vless' && node.params?.encryption && node.params.encryption !== 'none') return false;
  if (node.type === 'shadowsocks' && node.plugin && !['obfs-local', 'simple-obfs'].includes(node.plugin)) return false;
  return true;
};

function tlsOptions(node: Node, includeOverTls = true, includeTlsHost = true): string[] {
  if (!node.tls?.enabled) return [];
  const result = [...(includeOverTls ? ['over-tls=true'] : []), 'tls-verification=' + (node.tls.insecure ? 'false' : 'true')];
  if (includeTlsHost && node.tls.server_name) result.push(`tls-host=${value(node.tls.server_name)}`);
  if (node.tls.reality?.public_key) {
    result.push(`reality-base64-pubkey=${value(node.tls.reality.public_key)}`);
    if (node.tls.reality.short_id) result.push(`reality-hex-shortid=${value(node.tls.reality.short_id)}`);
  }
  return result;
}

function ruleForQuanx(rule: string): string | undefined {
  const parts = rule.split(',');
  const kind = parts[0]?.toUpperCase();
  const mapping: Record<string, string> = {
    'DOMAIN-SUFFIX': 'host-suffix', 'DOMAIN': 'host', 'DOMAIN-KEYWORD': 'host-keyword',
    'IP-CIDR': 'ip-cidr', 'IP-CIDR6': 'ip6-cidr', 'GEOIP': 'geoip', 'MATCH': 'final', 'FINAL': 'final',
  };
  if (!mapping[kind]) return;
  for (let index = parts.length - 1; index > 0; index--) {
    if (parts[index]?.toUpperCase() === 'DIRECT') parts[index] = 'direct';
    if (parts[index]?.toUpperCase() === 'REJECT') parts[index] = 'reject';
    if (parts[index]?.toUpperCase() === 'PASS') parts[index] = 'pass';
  }
  return [mapping[kind], ...parts.slice(1)].join(',');
}

function policyMembers(group: RuleConfig['groups'][number], nodes: Node[], groupNames: Set<string>): string[] {
  const members = group.proxies.flatMap(proxy => {
    const reference = proxy.match(/^!!GROUP=([^!]+)(?:!!\((.*)\))?$/);
    if (reference) return groupNames.has(reference[1]) ? [reference[1]] : [];
    if (['DIRECT', 'REJECT', 'PASS'].includes(proxy)) return [proxy.toLowerCase()];
    return groupNames.has(proxy) || nodes.some(node => node.name === proxy) ? [proxy] : [];
  });
  for (const matcher of group.proxies) {
    const pattern = matcher === '.*' ? '.*' : matcher.match(/^!!\((.*)\)$/)?.[1] || matcher.match(/^!!GROUP=[^!]+!!\((.*)\)$/)?.[1];
    if (!pattern) continue;
    try { members.push(...nodes.filter(node => new RegExp(pattern).test(node.name)).map(node => node.name)); } catch { /* Ignore invalid filters */ }
  }
  return [...new Set(members)];
}

export function quanx(nodes: Node[], ruleConfig?: RuleConfig): string {
  const compatible = nodes.filter(isQuanxCompatible);
  const output = ['[server_local]'];
  for (const node of compatible) {
    const opts: string[] = [];
    let line: string | undefined;
    switch (node.type) {
      case 'vmess': {
        const method = node.cipher === 'auto' ? 'none' : (node.cipher || 'none').replace('chacha20-ietf-poly1305', 'chacha20-poly1305');
        opts.push(`method=${method}`, `password=${value(node.uuid)}`, ...(node.alterId ? ['aead=false'] : []));
        if (node.transport?.type === 'ws' || node.transport?.type === 'http') {
          const obfs = node.transport.type === 'http' ? 'http' : node.tls?.enabled ? 'wss' : 'ws';
          opts.push(`obfs=${obfs}`, `obfs-uri=${value(node.transport.path || '/')}`, `obfs-host=${value(node.transport.headers?.Host || node.transport.host || node.server)}`);
          opts.push(...tlsOptions(node, obfs !== 'wss', obfs !== 'wss'));
        } else if (node.transport?.type) continue;
        else opts.push(...tlsOptions(node));
        line = `vmess=${endpoint(node)}, ${opts.join(', ')}, tag=${clean(node.name)}`;
        break;
      }
      case 'vless': {
        opts.push('method=none', `password=${value(node.uuid)}`);
        if (node.transport?.type === 'ws' || node.transport?.type === 'http') {
          const obfs = node.transport.type === 'http' ? 'http' : node.tls?.enabled ? 'wss' : 'ws';
          opts.push(`obfs=${obfs}`, `obfs-host=${value(node.transport.headers?.Host || node.transport.host || node.server)}`, `obfs-uri=${value(node.transport.path || '/')}`);
          opts.push(...tlsOptions(node, obfs !== 'wss', obfs !== 'wss').filter(item => !item.startsWith('reality-')));
        } else if (node.transport?.type) continue;
        else if (node.tls?.enabled) opts.push(...tlsOptions(node));
        if (node.flow) opts.push(`vless-flow=${value(node.flow)}`);
        if (node.tls?.reality?.public_key && !opts.some(item => item.startsWith('reality-base64-pubkey='))) {
          opts.push(`reality-base64-pubkey=${value(node.tls.reality.public_key)}`);
          if (node.tls.reality.short_id) opts.push(`reality-hex-shortid=${value(node.tls.reality.short_id)}`);
        }
        line = `vless=${endpoint(node)}, ${opts.join(', ')}, tag=${clean(node.name)}`;
        break;
      }
      case 'trojan': {
        opts.push(`password=${value(node.password)}`);
        if (node.transport?.type === 'ws') opts.push(`obfs=${node.tls?.enabled ? 'wss' : 'ws'}`, `obfs-host=${value(node.transport.headers?.Host || node.server)}`, `obfs-uri=${value(node.transport.path || '/')}`);
        else if (node.transport?.type) continue;
        else opts.push(...tlsOptions(node));
        line = `trojan=${endpoint(node)}, ${opts.join(', ')}, tag=${clean(node.name)}`;
        break;
      }
      case 'anytls':
        opts.push(`password=${value(node.password)}`, ...tlsOptions(node));
        line = `anytls=${endpoint(node)}, ${opts.join(', ')}, tag=${clean(node.name)}`;
        break;
      case 'shadowsocks':
        if (node.plugin && !['obfs-local', 'simple-obfs'].includes(node.plugin)) continue;
        opts.push(`method=${value(node.cipher || 'aes-128-gcm')}`, `password=${value(node.password)}`);
        if (node.plugin === 'obfs-local' || node.plugin === 'simple-obfs') {
          const mode = node.pluginOpts?.obfs || node.pluginOpts?.mode;
          if (mode) opts.push(`obfs=${value(mode)}`);
          if (node.pluginOpts?.obfs_host) opts.push(`obfs-host=${value(node.pluginOpts.obfs_host)}`);
        }
        if (node.tls?.enabled) opts.push('obfs=over-tls', `obfs-host=${value(node.tls.server_name || node.server)}`, `tls-verification=${node.tls.insecure ? 'false' : 'true'}`);
        line = `shadowsocks=${endpoint(node)}, ${opts.join(', ')}, tag=${clean(node.name)}`;
        break;
      case 'shadowsocksr':
        opts.push(`method=${value(node.cipher)}`, `password=${value(node.password)}`, `ssr-protocol=${value(node.protocol)}`, `ssr-protocol-param=${value(node.params?.protocolparam)}`, `obfs=${value(node.obfs)}`, `obfs-host=${value(node.params?.obfsparam)}`);
        line = `shadowsocks=${endpoint(node)}, ${opts.filter(Boolean).join(', ')}, tag=${clean(node.name)}`;
        break;
      case 'socks':
        opts.push(option('username', node.username), option('password', node.password), ...tlsOptions(node));
        line = `socks5=${endpoint(node)}${opts.filter(Boolean).length ? `, ${opts.filter(Boolean).join(', ')}` : ''}, tag=${clean(node.name)}`;
        break;
      case 'http':
        opts.push(option('username', node.username), option('password', node.password), ...tlsOptions(node));
        line = `http=${endpoint(node)}${opts.filter(Boolean).length ? `, ${opts.filter(Boolean).join(', ')}` : ''}, tag=${clean(node.name)}`;
        break;
      default:
        break;
    }
    if (line) output.push(line);
  }
  const groupNames = new Set(ruleConfig?.groups.map(group => group.name) || []);
  const configuredGroups = ruleConfig?.groups.map(group => {
      const policyType = group.type === 'url-test' ? 'url-latency-benchmark' : group.type === 'fallback' ? 'available' : group.type === 'load-balance' ? 'round-robin' : 'static';
      const members = policyMembers(group, compatible, groupNames);
      const options = group.type === 'url-test' ? [`check-interval=${group.interval || 300}`, `tolerance=${group.tolerance || 50}`] : [];
      return { line: `${policyType} = ${[clean(group.name), ...members, ...options].join(', ')}`, hasMembers: members.length > 0 };
    }) || [];
  const activeGroups = configuredGroups.filter(group => group.hasMembers);
  const groups = activeGroups.length
    ? activeGroups.map(group => group.line)
    : [`static = PROXY, ${[...compatible.map(node => clean(node.name)), 'direct'].join(', ')}`];
  const rules = (ruleConfig?.rules || []).map(ruleForQuanx).filter((rule): rule is string => Boolean(rule));
  if (!rules.some(rule => /^final,/i.test(rule))) rules.push(`final,${clean(ruleConfig?.groups.find(group => /节点选择|proxy/i.test(group.name))?.name || ruleConfig?.groups[0]?.name || 'PROXY')}`);
  output.push('', '[policy]', ...groups, '', '[filter_local]', ...rules);
  return `${output.join('\n')}\n`;
}
