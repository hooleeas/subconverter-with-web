import type { Node } from './types.js';
import type { RuleConfig } from './rules.js';

const clean = (value: string) => value.replace(/[\r\n,]/g, ' ').trim();
const quoted = (value: unknown) => `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const arg = (key: string, value: unknown) => value === undefined || value === null || value === '' ? '' : `${key}=${/[\s,"]/u.test(String(value)) ? quoted(value) : String(value)}`;
const pos = (value: unknown) => /[\s,"]/u.test(String(value ?? '')) ? quoted(value) : String(value ?? '');
const endpoint = (node: Node) => `${node.server.includes(':') ? `[${node.server}]` : node.server}:${node.port}`;
const ssCiphers = new Set('2022-blake3-aes-128-gcm 2022-blake3-aes-256-gcm aes-128-gcm aes-192-gcm aes-256-gcm chacha20-ietf-poly1305 xchacha20-ietf-poly1305 rc4 rc4-md5 aes-128-cfb aes-192-cfb aes-256-cfb aes-128-ctr aes-192-ctr aes-256-ctr bf-cfb camellia-128-cfb camellia-192-cfb camellia-256-cfb cast5-cfb des-cfb idea-cfb rc2-cfb seed-cfb salsa20 chacha20 chacha20-ietf'.split(' '));
const ssrCiphers = new Set('none rc4 rc4-md5-6 rc4-md5 aes-128-cfb aes-192-cfb aes-256-cfb aes-128-ctr aes-192-ctr aes-256-ctr bf-cfb camellia-128-cfb camellia-192-cfb camellia-256-cfb salsa20 chacha20 chacha20-ietf'.split(' '));
const ssrProtocols = new Set('origin auth_chain_a auth_chain_b auth_aes128_md5 auth_aes128_sha1 auth_sha1_v4 auth_sha1_v2 auth_sha1'.split(' '));
const ssrObfs = new Set('plain tls1.2_ticket_auth http_simple http_post'.split(' '));
const vmessCiphers = new Set(['none', 'auto', 'aes-128-cfb', 'aes-128-gcm', 'chacha20-ietf-poly1305']);
const shadowTlsPassword = (node: Node) => node.params?.['shadow-tls-password'] || node.params?.shadow_tls_password || '';
function shadowTlsOptions(node: Node): string[] {
  const password = shadowTlsPassword(node);
  if (!password) return [];
  return [
    ...(['vmess', 'vless'].includes(node.type) ? ['over-tls=false'] : []),
    arg('shadow-tls-password', password), arg('shadow-tls-sni', node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni),
    arg('shadow-tls-version', node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || '2'), arg('udp-port', node.params?.['udp-port']),
  ].filter(Boolean);
}

export const isLoonCompatible = (node: Node) => {
  if (!['shadowsocks', 'shadowsocksr', 'vmess', 'vless', 'trojan', 'hysteria2', 'anytls', 'wireguard', 'socks', 'http'].includes(node.type)) return false;
  if (node.type === 'shadowsocks' && !ssCiphers.has((node.cipher || 'aes-128-gcm').toLowerCase())) return false;
  if (node.type === 'shadowsocksr' && (!ssrCiphers.has((node.cipher || '').toLowerCase()) || !ssrProtocols.has((node.protocol || '').toLowerCase()) || !ssrObfs.has((node.obfs || '').toLowerCase()))) return false;
  if (node.type === 'vmess' && !vmessCiphers.has((node.cipher || 'auto').toLowerCase())) return false;
  if (shadowTlsPassword(node) && !['shadowsocks', 'shadowsocksr', 'vmess', 'vless', 'socks', 'http'].includes(node.type)) return false;
  if (shadowTlsPassword(node) && node.tls?.reality) return false;
  if (shadowTlsPassword(node) && !['2', '3'].includes(node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || '2')) return false;
  if (shadowTlsPassword(node) && (node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version) === '3' && !(node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni)) return false;
  if (node.type === 'vless' && node.params?.encryption && node.params.encryption !== 'none') return false;
  if (node.type === 'wireguard' && !(node.privateKey && node.params?.publickey && node.params?.ip)) return false;
  if (node.type === 'shadowsocks' && node.plugin && (!['obfs-local', 'simple-obfs'].includes(node.plugin) || !['http', 'tls'].includes(node.pluginOpts?.obfs || node.pluginOpts?.mode || 'http'))) return false;
  const transport = node.transport?.type;
  if (transport && !(['vmess', 'vless'].includes(node.type) && ['ws', 'http'].includes(transport)) && !(node.type === 'trojan' && transport === 'ws')) return false;
  return true;
};

function tlsOptions(node: Node, includeOverTls = true): string[] {
  if (!node.tls?.enabled) return [];
  return [
    ...(includeOverTls ? ['over-tls=true'] : []),
    ...[arg('sni', node.tls.server_name), node.tls.insecure ? 'skip-cert-verify=true' : 'skip-cert-verify=false'],
    ...(node.tls.reality?.public_key ? [arg('public-key', node.tls.reality.public_key)] : []),
    ...(node.tls.reality?.short_id ? [arg('short-id', node.tls.reality.short_id)] : []),
  ].filter(Boolean);
}

function proxyLine(node: Node): string | undefined {
  const options: string[] = [];
  const transport = node.transport?.type;
  let line: string;
  switch (node.type) {
    case 'shadowsocks': {
      options.push(...[
        node.plugin ? arg('obfs-name', node.pluginOpts?.obfs || node.pluginOpts?.mode) : '',
        node.plugin ? arg('obfs-host', node.pluginOpts?.obfs_host || node.pluginOpts?.host) : '',
        node.plugin ? arg('obfs-uri', node.pluginOpts?.obfs_uri || node.pluginOpts?.path) : '',
      ].filter(Boolean), ...shadowTlsOptions(node));
      line = `${clean(node.name)} = Shadowsocks,${node.server},${node.port},${node.cipher || 'aes-128-gcm'},${quoted(node.password)},${options.join(',')}`;
      break;
    }
    case 'shadowsocksr':
      line = `${clean(node.name)} = ShadowsocksR,${node.server},${node.port},${node.cipher || 'aes-256-cfb'},${quoted(node.password)},${[
        arg('protocol', node.protocol || 'origin'), arg('protocol-param', node.params?.protocolparam),
        arg('obfs', node.obfs || 'plain'), arg('obfs-param', node.params?.obfsparam),
        ...shadowTlsOptions(node),
      ].filter(Boolean).join(',')}`;
      break;
    case 'vmess':
      options.push(`transport=${transport === 'http' ? 'http' : transport === 'ws' ? 'ws' : 'tcp'}`, `alterId=${node.alterId || 0}`);
      if (transport === 'ws' || transport === 'http') options.push(arg('path', node.transport?.path || '/'), arg('host', node.transport?.headers?.Host || node.transport?.host));
      options.push(...tlsOptions(node, !shadowTlsPassword(node)), ...shadowTlsOptions(node));
      line = `${clean(node.name)} = VMess,${node.server},${node.port},${node.cipher || 'auto'},${quoted(node.uuid)},${options.filter(Boolean).join(',')}`;
      break;
    case 'vless':
      options.push(`transport=${transport === 'http' ? 'http' : transport === 'ws' ? 'ws' : 'tcp'}`);
      if (transport === 'ws' || transport === 'http') options.push(arg('path', node.transport?.path || '/'), arg('host', node.transport?.headers?.Host || node.transport?.host));
      if (node.flow) options.push(arg('flow', node.flow));
      options.push(...tlsOptions(node, !shadowTlsPassword(node)), ...shadowTlsOptions(node));
      line = `${clean(node.name)} = VLESS,${node.server},${node.port},${quoted(node.uuid)},${options.filter(Boolean).join(',')}`;
      break;
    case 'trojan':
      options.push(`transport=${transport === 'ws' ? 'ws' : 'tcp'}`);
      if (transport === 'ws') options.push(arg('path', node.transport?.path || '/'), arg('host', node.transport?.headers?.Host));
      options.push(...tlsOptions(node, false));
      if (node.tls?.alpn?.length) options.push(arg('alpn', node.tls.alpn.join(',')));
      line = `${clean(node.name)} = Trojan,${node.server},${node.port},${quoted(node.password)},${options.filter(Boolean).join(',')}`;
      break;
    case 'hysteria2':
      options.push(...tlsOptions(node, false), ...(node.tls?.alpn?.length ? [arg('alpn', node.tls.alpn.join(','))] : []));
      if (node.params?.obfs === 'salamander') options.push(arg('salamander-password', node.params.obfs_password));
      if (node.params?.ports) options.push(arg('server-ports', node.params.ports), arg('hop-interval', node.params['hop-interval'] || '30'));
      if (node.params?.down_mbps) options.push(arg('download-bandwidth', node.params.down_mbps));
      line = `${clean(node.name)} = Hysteria2,${node.server},${node.port},${quoted(node.password)},${options.filter(Boolean).join(',')}`;
      break;
    case 'anytls':
      options.push(...tlsOptions(node, false));
      line = `${clean(node.name)} = AnyTLS,${node.server},${node.port},${quoted(node.password)},${options.filter(Boolean).join(',')}`;
      break;
    case 'socks':
    case 'http': {
      const protocol = node.type === 'socks' ? 'socks5' : node.tls?.enabled ? 'https' : 'http';
      options.push(...(node.type === 'http' && node.tls?.enabled ? tlsOptions(node, false) : node.type === 'socks' ? tlsOptions(node) : []), ...shadowTlsOptions(node));
      const credentials = node.username || node.password ? `${pos(node.username)},${quoted(node.password)}` : '';
      line = `${clean(node.name)} = ${protocol},${node.server},${node.port}${credentials ? `,${credentials}` : ''}${options.length ? `,${options.join(',')}` : ''}`;
      break;
    }
    case 'wireguard': {
      const addresses = (node.params?.ip || '').split(',').map(value => value.trim()).filter(Boolean);
      const ipv4 = addresses.find(value => !value.includes(':'))?.split('/')[0];
      const ipv6 = addresses.find(value => value.includes(':'))?.split('/')[0];
      const peerEndpoint = `${node.server.includes(':') ? `[${node.server}]` : node.server}:${node.port}`;
      const peer = [
        arg('public-key', node.params?.publickey), arg('preshared-key', node.params?.presharedkey),
        ...(node.params?.reserved ? [`reserved=[${node.params.reserved}]`] : []),
        arg('allowed-ips', node.params?.allowedips || '0.0.0.0/0'), arg('endpoint', peerEndpoint),
      ].filter(Boolean).join(',');
      line = `${clean(node.name)} = WireGuard,${[
        arg('interface-ip', ipv4), arg('interface-ipv6', ipv6), arg('private-key', node.privateKey),
        arg('mtu', node.params?.mtu), arg('dns', node.params?.dns), arg('dnsv6', node.params?.dnsv6), arg('server-dns', node.params?.['server-dns']),
        arg('keepalive', node.params?.keepalive), `peers=[{${peer}}]`,
      ].filter(Boolean).join(',')}`;
      break;
    }
    default:
      return;
  }
  return line.replace(/,$/, '');
}

function groupMembers(group: RuleConfig['groups'][number], nodes: Node[], names: Set<string>): string[] {
  const result = group.proxies.flatMap(proxy => {
    const reference = proxy.match(/^!!GROUP=([^!]+)(?:!!\((.*)\))?$/);
    if (reference) return names.has(reference[1]) ? [reference[1]] : [];
    return ['DIRECT', 'REJECT', 'PASS'].includes(proxy) || names.has(proxy) || nodes.some(node => node.name === proxy) ? [proxy] : [];
  });
  for (const matcher of group.proxies) {
    const pattern = matcher === '.*' ? '.*' : matcher.match(/^!!\((.*)\)$/)?.[1] || matcher.match(/^!!GROUP=[^!]+!!\((.*)\)$/)?.[1];
    if (!pattern) continue;
    try { result.push(...nodes.filter(node => new RegExp(pattern).test(node.name)).map(node => node.name)); } catch { /* Ignore malformed patterns. */ }
  }
  return [...new Set(result)];
}

export function loon(nodes: Node[], ruleConfig?: RuleConfig): string {
  const compatible = nodes.filter(isLoonCompatible);
  const groupNames = new Set(ruleConfig?.groups.map(group => group.name) || []);
  const configuredGroups = ruleConfig?.groups.map(group => {
      const members = groupMembers(group, compatible, groupNames);
      const options = group.url ? [arg('url', group.url), arg('interval', group.interval || 300), ...(group.type === 'url-test' ? [arg('tolerance', group.tolerance || 50)] : [arg('max-timeout', group.tolerance || 5000)])] : [];
    return { line: `${clean(group.name)} = ${[group.type, ...members, ...options.filter(Boolean)].join(', ')}`, hasMembers: members.length > 0 };
    }) || [];
  const activeGroups = configuredGroups.filter(group => group.hasMembers);
  const groups = activeGroups.length
    ? activeGroups.map(group => group.line)
    : [`PROXY = select, ${[...compatible.map(node => clean(node.name)), 'DIRECT'].join(', ')}`];
  const rules = (ruleConfig?.rules || []).map(rule => rule.replace(/^MATCH,/i, 'FINAL,').replace(/^FINAL,/i, 'FINAL,'));
  if (!rules.some(rule => /^FINAL,/i.test(rule))) rules.push(`FINAL,${ruleConfig?.groups.find(group => /节点选择|proxy/i.test(group.name))?.name || ruleConfig?.groups[0]?.name || 'PROXY'}`);
  return ['[Proxy]', ...compatible.map(proxyLine).filter((line): line is string => Boolean(line)), '', '[Proxy Group]', ...groups, '', '[Rule]', ...rules, ''].join('\n');
}
