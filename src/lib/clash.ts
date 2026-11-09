import { stringify } from 'yaml';
import type { Node } from './types.js';
import type { RuleConfig } from './rules.js';

const shadowTlsPassword = (node: Node) => node.params?.['shadow-tls-password'] || node.params?.shadow_tls_password || '';

export const isMihomoCompatible = (node: Node) =>
  node.type !== 'naive' && node.type !== 'shadowtls' &&
  (!shadowTlsPassword(node) || ['vless', 'vmess', 'trojan', 'anytls', 'snell'].includes(node.type)) &&
  (!shadowTlsPassword(node) || !node.tls?.reality) &&
  (!shadowTlsPassword(node) || ['2', '3'].includes(node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || '2')) &&
  (!shadowTlsPassword(node) || (node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version) !== '3' || Boolean(node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni)) &&
  (!node.transport || ['ws', 'httpupgrade', 'grpc', 'http', 'h2', 'xhttp'].includes(node.transport.type)) &&
  (node.transport?.type !== 'xhttp' || node.type === 'vless') &&
  (node.transport?.type !== 'h2' || ['vless', 'vmess'].includes(node.type)) &&
  (node.transport?.type !== 'httpupgrade' || ['vless', 'vmess', 'trojan'].includes(node.type)) &&
  (node.type !== 'snell' || Number(node.params?.version || 3) <= 5) &&
  (node.type !== 'snell' || node.params?.version !== '6' || (node.password?.length || 0) >= 12 && (node.password?.length || 0) <= 255);

function proxyConfig(node: Node): Record<string, unknown> {
  const type = node.type === 'shadowsocks' ? 'ss'
    : node.type === 'shadowsocksr' ? 'ssr'
      : node.type === 'socks' ? 'socks5' : node.type;
  return {
    name: node.name,
    type,
    server: node.server,
    port: node.port,
    ...(node.type === 'tuic' && node.params?.version === '4'
      ? { token: node.params.token || node.uuid }
      : ['socks', 'http', 'naive', 'mieru'].includes(node.type) && node.username
      ? { username: node.username }
      : node.uuid ? { uuid: node.uuid } : {}),
    ...(node.type === 'tuic' && node.params?.version === '4' || node.type === 'snell' ? {} : node.type === 'hysteria' && node.password ? { 'auth-str': node.password } : node.password ? { password: node.password } : {}),
    ...(node.type === 'snell' && node.password ? { psk: node.password } : {}),
    ...(node.type === 'vmess' ? { alterId: node.alterId || 0 } : {}),
    ...(node.cipher ? { cipher: node.cipher } : {}),
    ...(node.protocol ? { protocol: node.protocol } : {}),
    ...(node.type === 'shadowsocksr' ? {
      'protocol-param': node.params?.protocolparam || '',
      'obfs-param': node.params?.obfsparam || '',
    } : {}),
    ...(node.type === 'hysteria2' ? {
      ...(node.params?.obfs ? { obfs: node.params.obfs } : {}),
      ...(node.params?.obfs_password ? { 'obfs-password': node.params.obfs_password } : {}),
    } : node.type !== 'snell' && node.obfs ? { obfs: node.obfs } : {}),
    ...(node.type === 'snell' ? {
      version: Number(node.params?.version || 3),
      ...(node.obfs || shadowTlsPassword(node) ? {
        'obfs-opts': {
          mode: node.obfs || 'shadow-tls',
          ...((node.params?.host || node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni) ? { host: node.params?.host || node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni } : {}),
          ...(shadowTlsPassword(node) ? { password: shadowTlsPassword(node), version: Number(node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || 2) } : {}),
        },
      } : {}),
    } : {}),
    ...(node.type === 'wireguard' ? {
      'private-key': node.privateKey,
      'public-key': node.params?.publickey,
      ...(node.params?.ip ? { ip: node.params.ip.split(',')[0].trim() } : {}),
      ...(node.params?.presharedkey ? { 'pre-shared-key': node.params.presharedkey } : {}),
      'allowed-ips': (node.params?.allowedips || '0.0.0.0/0').split(',').map(value => value.trim()),
      ...(node.params?.reserved ? { reserved: node.params.reserved.split(',').map(Number) } : {}),
      ...(node.params?.mtu ? { mtu: Number(node.params.mtu) } : {}),
    } : {}),
    ...(node.type === 'mieru' ? {
      transport: (node.params?.transport || 'TCP').toUpperCase(),
      multiplexing: node.params?.multiplexing || 'MULTIPLEXING_LOW',
      ...(node.params?.handshake_mode ? { 'handshake-mode': node.params.handshake_mode } : {}),
      ...(node.params?.traffic_pattern ? { 'traffic-pattern': node.params.traffic_pattern } : {}),
    } : {}),
    ...(node.type === 'hysteria' ? {
      up: `${node.params?.up_mbps || 100} Mbps`,
      down: `${node.params?.down_mbps || 100} Mbps`,
    } : {}),
    ...(node.flow ? { flow: node.flow } : {}),
    ...(node.params?.encryption ? { encryption: node.params.encryption } : {}),
    ...(node.tls || (shadowTlsPassword(node) && ['vless', 'vmess', 'trojan', 'anytls'].includes(node.type)) ? {
      tls: true,
      servername: node.tls?.server_name || node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni || node.server,
      ...(node.tls?.insecure ? { 'skip-cert-verify': true } : {}),
      ...(node.tls?.alpn ? { alpn: node.tls.alpn } : {}),
      ...(node.tls?.utls?.fingerprint ? { 'client-fingerprint': node.tls.utls.fingerprint } : {}),
      ...(node.tls?.reality ? {
        'reality-opts': {
          'public-key': node.tls.reality.public_key,
          'short-id': node.tls.reality.short_id,
          ...(['true', '1'].includes(node.params?.['support-x25519mlkem768'] || node.params?.support_x25519mlkem768 || '')
            ? { 'support-x25519mlkem768': true }
            : {}),
        },
      } : {}),
      ...(shadowTlsPassword(node) ? {
        'shadow-tls-opts': {
          version: Number(node.params?.['shadow-tls-version'] || node.params?.shadow_tls_version || 2),
          password: shadowTlsPassword(node),
          ...(node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni ? { sni: node.params?.['shadow-tls-sni'] || node.params?.shadow_tls_sni } : {}),
        },
      } : {}),
    } : {}),
    ...(node.transport?.type === 'ws' ? {
      network: 'ws',
      'ws-opts': { path: node.transport.path, headers: node.transport.headers },
    } : node.transport?.type === 'httpupgrade' ? {
      network: 'ws',
      'ws-opts': { path: node.transport.path, headers: node.transport.headers, 'v2ray-http-upgrade': true },
    } : node.transport?.type === 'grpc' ? {
      network: 'grpc',
      'grpc-opts': { 'grpc-service-name': node.transport.service_name },
    } : node.transport?.type === 'http' ? {
      network: 'http',
      'http-opts': {
        path: node.transport.path,
        ...(node.transport.host ? { headers: { Host: node.transport.host } } : {}),
      },
    } : node.transport?.type === 'h2' ? {
      network: 'h2',
      'h2-opts': { path: node.transport.path, host: node.transport.host ? [node.transport.host] : [] },
    } : node.transport?.type === 'xhttp' ? {
      network: 'xhttp',
      'xhttp-opts': {
        path: node.transport.path,
        host: node.transport.headers?.Host || node.server,
        mode: node.transport.mode || 'auto',
        ...node.transport.xhttpOptions,
      },
    } : {}),
  };
}

export function clash(nodes: Node[], ruleConfig?: RuleConfig): string {
  const compatibleNodes = nodes.filter(isMihomoCompatible);
  const names = new Set(compatibleNodes.map(node => node.name));
  const configuredGroups = ruleConfig?.groups?.map(group => {
      const groupNames = new Set(ruleConfig.groups.map(candidate => candidate.name));
      const selectors = group.proxies.flatMap(proxy => {
        const groupRef = proxy.match(/^!!GROUP=([^!]+)(?:!!\((.*)\))?$/);
        if (groupRef) return groupNames.has(groupRef[1]) ? [groupRef[1]] : [];
        return ['DIRECT', 'REJECT', 'PASS'].includes(proxy) || names.has(proxy) || groupNames.has(proxy) ? [proxy] : [];
      });
      const patterns = group.proxies.flatMap(proxy => {
        if (proxy === '.*') return ['.*'];
        const combined = proxy.match(/^!!GROUP=[^!]+!!\((.*)\)$/);
        if (combined) return [combined[1]];
        const regex = proxy.match(/^!!\((.*)\)$/);
        if (regex) return [regex[1]];
        return proxy.startsWith('(') && proxy.endsWith(')') ? [proxy.slice(1, -1)] : [];
      });
      const matched = compatibleNodes.filter(node => patterns.some(pattern => {
        try { return new RegExp(pattern).test(node.name); } catch { return false; }
      })).map(node => node.name);
      return {
        name: group.name,
        type: group.type,
        proxies: [...new Set([...selectors, ...matched])],
        ...(group.url ? { url: group.url, interval: group.interval || 300, tolerance: group.tolerance || 50 } : {}),
      };
    }) || [];
  const groups = configuredGroups.some(group => group.proxies.length > 0)
    ? configuredGroups.filter(group => group.proxies.length > 0)
    : [{ name: 'PROXY', type: 'select', proxies: [...compatibleNodes.map(node => node.name), 'DIRECT'] }];
  const fallbackGroup = groups[0]?.name || 'PROXY';
  // Mihomo has no USER-AGENT or URL-REGEX rule types. Passing those through
  // from common ACL4SSR lists makes the entire profile fail to load.
  const supportedRuleTypes = new Set([
    'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-WILDCARD', 'DOMAIN-REGEX',
    'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'SRC-GEOIP', 'SRC-IP-CIDR', 'DST-PORT', 'SRC-PORT',
    'PROCESS-NAME', 'PROCESS-PATH', 'NETWORK', 'MATCH', 'FINAL',
  ]);
  const rules = (ruleConfig?.rules || [])
    .filter(rule => supportedRuleTypes.has(rule.split(',', 1)[0]!.toUpperCase()));
  if (!rules.some(rule => /^(?:MATCH|FINAL),/i.test(rule))) rules.push(`MATCH,${fallbackGroup}`);

  return stringify({
    'mixed-port': 7890,
    proxies: compatibleNodes.map(proxyConfig),
    'proxy-groups': groups,
    rules,
  });
}
