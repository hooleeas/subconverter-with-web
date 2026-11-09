import type { Node } from './types.js';
import type { RuleConfig } from './rules.js';

const clean = (input: string) => input.replace(/[\r\n,]/g, ' ').trim();
const opt = (key: string, value: unknown) => {
  if (value === undefined || value === null || value === '') return [];
  const text = String(value);
  const formatted = /[,"\s]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
  return [`${key}=${formatted}`];
};
const alpnOption = (value: unknown) => {
  const list = Array.isArray(value) ? value.join(',') : String(value || '');
  return list ? opt('alpn', list) : [];
};
const shadowTlsPassword = (node: Node) => node.params?.['shadow-tls-password'] || node.params?.shadow_tls_password || '';
function shadowTlsOptions(node: Node): string[] {
  const password = shadowTlsPassword(node);
  if (!password) return [];
  return [
    ...opt('shadow-tls-password', password),
    ...opt('shadow-tls-sni', node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni),
    ...opt('shadow-tls-version', node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || '2'),
    ...opt('udp-port', node.params?.['udp-port']),
  ];
}
function tlsOptions(node: Node): string[] {
  if (!node.tls?.enabled) return [];
  return [...opt('sni', node.tls.server_name), ...(node.tls.insecure ? ['skip-cert-verify=true'] : []), ...alpnOption(node.tls.alpn)];
}

export const isSurgeCompatible = (node: Node) => {
  if (['shadowsocksr', 'hysteria', 'mieru', 'naive', 'shadowtls'].includes(node.type)) return false;
  if (node.type === 'vless' && node.params?.encryption && node.params.encryption !== 'none') return false;
  if (node.type === 'wireguard' && !(node.privateKey && node.params?.publickey && node.params?.ip)) return false;
  if (shadowTlsPassword(node) && ['tuic', 'hysteria2', 'anytls', 'wireguard'].includes(node.type)) return false;
  if (shadowTlsPassword(node) && !['2', '3'].includes(node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || '2')) return false;
  if (shadowTlsPassword(node) && (node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version) === '3' && !(node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni)) return false;
  if (node.type === 'snell' && node.obfs === 'shadow-tls' && !shadowTlsPassword(node)) return false;
  if (node.type === 'snell' && node.params?.version === '6' && node.obfs) return false;
  if (node.type === 'snell' && node.params?.version === '6' && ((node.password?.length || 0) < 12 || (node.password?.length || 0) > 255)) return false;
  if (node.transport && !['ws'].includes(node.transport.type)) return false;
  if (node.type === 'shadowsocks' && node.plugin && (!['obfs-local', 'simple-obfs'].includes(node.plugin) || !['http', 'tls'].includes(node.pluginOpts?.obfs || node.pluginOpts?.mode || 'http'))) return false;
  return ['vless', 'vmess', 'trojan', 'shadowsocks', 'snell', 'hysteria2', 'anytls', 'tuic', 'socks', 'http', 'wireguard'].includes(node.type);
};

function proxyLine(node: Node, index = 0): string | undefined {
  const options: string[] = [];
  let protocol: string;
  switch (node.type) {
    case 'vless':
      protocol = 'vless';
      options.push(...opt('username', node.uuid), ...(node.tls?.enabled ? ['tls=true'] : []), ...tlsOptions(node), ...shadowTlsOptions(node), ...opt('flow', node.flow));
      if (node.transport?.type === 'ws') options.push('ws=true', ...opt('ws-path', node.transport.path || '/'), ...opt('ws-headers', node.transport.headers?.Host ? `Host:${node.transport.headers.Host}` : undefined));
      break;
    case 'vmess':
      protocol = 'vmess';
      options.push(...opt('username', node.uuid), ...opt('encrypt-method', node.cipher === 'auto' ? 'chacha20-ietf-poly1305' : node.cipher), ...(node.alterId === 0 ? ['vmess-aead=true'] : []), ...(node.tls?.enabled ? ['tls=true'] : []), ...tlsOptions(node), ...shadowTlsOptions(node));
      if (node.transport?.type === 'ws') options.push('ws=true', ...opt('ws-path', node.transport.path || '/'), ...opt('ws-headers', node.transport.headers?.Host ? `Host:${node.transport.headers.Host}` : undefined));
      break;
    case 'trojan':
      protocol = 'trojan';
      options.push(...opt('password', node.password), ...tlsOptions(node), ...shadowTlsOptions(node));
      if (node.transport?.type === 'ws') options.push('ws=true', ...opt('ws-path', node.transport.path || '/'), ...opt('ws-headers', node.transport.headers?.Host ? `Host:${node.transport.headers.Host}` : undefined));
      break;
    case 'shadowsocks':
      protocol = 'ss';
      options.push(...opt('encrypt-method', node.cipher), ...opt('password', node.password));
      if (node.plugin === 'obfs-local' || node.plugin === 'simple-obfs') {
        options.push(...opt('obfs', node.pluginOpts?.obfs || node.pluginOpts?.mode), ...opt('obfs-host', node.pluginOpts?.obfs_host));
      }
      options.push(...shadowTlsOptions(node));
      break;
    case 'snell':
      protocol = 'snell';
      options.push(...opt('psk', node.password), ...opt('version', Number(node.params?.version) || 3));
      if (node.params?.version === '6') options.push(...opt('mode', node.params.mode || 'default'));
      else if (node.obfs && node.obfs !== 'shadow-tls') options.push(...opt('obfs', node.obfs), ...opt('obfs-host', node.params?.host));
      options.push(...shadowTlsOptions(node));
      break;
    case 'hysteria2':
      protocol = 'hysteria2';
      options.push(...opt('password', node.password), ...tlsOptions(node));
      if (node.params?.obfs === 'salamander') options.push(...opt('salamander-password', node.params.obfs_password));
      if (node.params?.obfs === 'gecko') options.push(...opt('gecko-password', node.params.obfs_password));
      if (node.params?.down_mbps) options.push(...opt('download-bandwidth', Number(node.params.down_mbps)));
      if (node.params?.ports) options.push(...opt('port-hopping', node.params.ports), ...opt('port-hopping-interval', Number(node.params['hop-interval']) || 30));
      break;
    case 'anytls':
      protocol = 'anytls';
      options.push(...opt('password', node.password), ...tlsOptions(node));
      break;
    case 'tuic':
      if (node.params?.version === '4') {
        protocol = 'tuic';
        options.push(...opt('token', node.params?.token || node.password || node.uuid));
      } else {
        protocol = 'tuic-v5';
        options.push(...opt('uuid', node.uuid), ...opt('password', node.password));
      }
      options.push(...alpnOption(node.params?.alpn || node.tls?.alpn || 'h3'), ...tlsOptions(node).filter(option => !option.startsWith('alpn=')));
      break;
    case 'socks':
      protocol = node.tls?.enabled ? 'socks5-tls' : 'socks5';
      options.push(...opt('username', node.username), ...opt('password', node.password), ...tlsOptions(node), ...shadowTlsOptions(node));
      break;
    case 'http':
      protocol = node.tls?.enabled ? 'https' : 'http';
      options.push(...tlsOptions(node));
      options.push(...shadowTlsOptions(node));
      break;
    case 'wireguard':
      protocol = 'wireguard';
      options.push(`section-name=wg-${index + 1}`);
      break;
    default:
      return;
  }
  const credentials = node.type === 'http' && (node.username || node.password)
    ? [node.username || '', node.password || '']
    : [];
  const args = [protocol, node.server, String(node.port), ...credentials, ...options];
  return `${clean(node.name)} = ${args.join(', ')}`;
}

function wireguardSection(node: Node, index: number): string {
  const addresses = (node.params?.ip || '').split(',').map(value => value.trim()).filter(Boolean);
  const ipv4 = addresses.find(value => !value.includes(':'))?.split('/')[0];
  const ipv6 = addresses.find(value => value.includes(':'))?.split('/')[0];
  const peerEndpoint = `${node.server.includes(':') ? `[${node.server}]` : node.server}:${node.port}`;
  const reserved = node.params?.reserved?.split(',').map(value => Number(value.trim()));
  const peerFields = [
    ...opt('public-key', node.params?.publickey),
    ...opt('allowed-ips', (node.params?.allowedips || '0.0.0.0/0').split(',').map(value => value.trim()).join(', ')),
    ...opt('endpoint', peerEndpoint),
    ...opt('preshared-key', node.params?.presharedkey),
    ...opt('keepalive', node.params?.keepalive),
    ...(reserved?.length === 3 && reserved.every(value => Number.isInteger(value) && value >= 0 && value <= 255) ? opt('client-id', reserved.join('/')) : []),
  ].filter(Boolean).map(value => value.replace('=', ' = '));
  return [
    `[WireGuard wg-${index + 1}]`,
    `private-key = ${node.privateKey}`,
    ...(ipv4 ? [`self-ip = ${ipv4}`] : []),
    ...(ipv6 ? [`self-ip-v6 = ${ipv6}`] : []),
    ...(node.params?.mtu ? [`mtu = ${node.params.mtu}`] : []),
    ...(node.params?.dns ? [`dns-server = ${node.params.dns}`] : []),
    `peer = (${peerFields.join(', ')})`,
  ].join('\n');
}

function members(group: RuleConfig['groups'][number], nodes: Node[], groupNames: Set<string>): string[] {
  const choices = group.proxies.flatMap(item => {
    const groupRef = item.match(/^!!GROUP=([^!]+)(?:!!\((.*)\))?$/);
    if (groupRef) return groupNames.has(groupRef[1]) ? [groupRef[1]] : [];
    if (['DIRECT', 'REJECT', 'PASS'].includes(item) || nodes.some(node => node.name === item) || groupNames.has(item)) return [item];
    return [];
  });
  for (const pattern of group.proxies) {
    const source = pattern === '.*' ? '.*' : pattern.match(/^!!\((.*)\)$/)?.[1] || pattern.match(/^!!GROUP=[^!]+!!\((.*)\)$/)?.[1];
    if (!source) continue;
    try { choices.push(...nodes.filter(node => new RegExp(source).test(node.name)).map(node => node.name)); } catch { /* Ignore invalid matcher */ }
  }
  return [...new Set(choices)];
}

function surgeRule(rule: string): string {
  return rule.replace(/^MATCH,/i, 'FINAL,').replace(/^FINAL,/i, 'FINAL,');
}

export function surge(nodes: Node[], ruleConfig?: RuleConfig): string {
  const compatible = nodes.filter(isSurgeCompatible);
  const proxyLines = compatible.map((node, index) => proxyLine(node, index)).filter((line): line is string => Boolean(line));
  const wireguardSections = compatible.flatMap((node, index) => node.type === 'wireguard' ? [wireguardSection(node, index)] : []);
  const groupNames = new Set(ruleConfig?.groups.map(group => group.name) || []);
  const proxyTestUrl = ruleConfig?.groups.find(group => group.type === 'url-test' && group.url)?.url;
  const configuredGroups = ruleConfig?.groups.map(group => {
      const choices = members(group, compatible, groupNames);
      const params = [
        ...(group.url ? opt('interval', group.interval || 300) : []),
        ...(group.url && group.tolerance ? opt('tolerance', group.tolerance) : []),
      ];
      return { line: `${clean(group.name)} = ${[group.type, ...choices, ...params].join(', ')}`, hasMembers: choices.length > 0 };
    }) || [];
  const activeGroups = configuredGroups.filter(group => group.hasMembers);
  const groups = activeGroups.length
    ? activeGroups.map(group => group.line)
    : [`PROXY = select, ${[...compatible.map(node => clean(node.name)), 'DIRECT'].join(', ')}`];
  const rules = (ruleConfig?.rules || []).map(surgeRule);
  if (!rules.some(rule => /^FINAL,/i.test(rule))) rules.push(`FINAL,${ruleConfig?.groups.find(group => /节点选择|proxy/i.test(group.name))?.name || ruleConfig?.groups[0]?.name || 'PROXY'}`);
  return [
    '[General]',
    ...(proxyTestUrl ? [`proxy-test-url = ${proxyTestUrl}`] : []),
    '', '[Proxy]', ...proxyLines, ...(wireguardSections.length ? ['', ...wireguardSections] : []), '', '[Proxy Group]', ...groups, '', '[Rule]', ...rules, '',
  ].join('\n');
}
