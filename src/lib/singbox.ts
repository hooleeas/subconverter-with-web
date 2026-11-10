import type { Node } from './types.js';
import type { RuleConfig } from './rules.js';

export const isSingboxCompatible = (node: Node) =>
  !['shadowsocksr', 'mieru'].includes(node.type) &&
  node.transport?.type !== 'xhttp' &&
  (node.type !== 'snell' || ['4', '5', '6'].includes(node.params?.version || '4')) &&
  (node.type !== 'snell' || node.params?.version !== '6' || (node.password?.length || 0) >= 12 && (node.password?.length || 0) <= 255) &&
  (node.type !== 'tuic' || node.params?.version !== '4') &&
  (!node.transport || ['ws', 'grpc', 'httpupgrade', 'http', 'h2'].includes(node.transport.type)) &&
  (node.type !== 'wireguard' || Boolean(node.privateKey && node.params?.publickey && node.params?.ip)) &&
  !(node.type === 'vless' && node.params?.encryption && node.params.encryption !== 'none');

function singboxTransport(node: Node): Record<string, unknown> | undefined {
  const transport = node.transport;
  if (!transport || transport.type === 'xhttp') return;
  if (transport.type === 'ws') return { type: 'ws', path: transport.path || '/', ...(transport.headers ? { headers: transport.headers } : {}) };
  if (transport.type === 'grpc') return { type: 'grpc', service_name: transport.service_name || '' };
  if (transport.type === 'httpupgrade') return { type: 'httpupgrade', host: transport.headers?.Host ? [transport.headers.Host] : [], path: transport.path || '/' };
  if (transport.type === 'http' || transport.type === 'h2') return { type: 'http', host: transport.host ? [transport.host] : [], path: transport.path || '/' };
  return;
}

function outbound(node: Node): Record<string, unknown> {
  return {
    type: node.type === 'shadowsocks' ? 'shadowsocks' : node.type === 'socks' ? 'socks' : node.type,
    tag: node.name,
    server: node.server,
    server_port: node.port,
    ...(node.uuid ? { uuid: node.uuid } : {}),
    ...(node.username ? { username: node.username } : {}),
    ...(node.password && !['hysteria', 'snell'].includes(node.type) ? { password: node.password } : {}),
    ...(node.type === 'hysteria' && node.password ? { auth_str: node.password } : {}),
    ...(node.type === 'snell' && node.password ? { psk: node.password } : {}),
    ...(node.type === 'shadowsocks' && node.cipher ? { method: node.cipher } : {}),
    ...(node.plugin ? { plugin: node.plugin } : {}),
    ...(node.pluginOpts ? { plugin_opts: node.pluginOpts } : {}),
    ...(node.type === 'vless' && node.flow ? { flow: node.flow } : {}),
    ...(node.type === 'vmess' ? { security: node.cipher || 'auto', alter_id: node.alterId || 0 } : {}),
    ...(node.type === 'tuic' ? {
      congestion_control: node.params?.congestion_control || 'bbr',
      udp_relay_mode: node.params?.udp_relay_mode || 'native',
      ...(node.params?.zero_rtt_handshake === 'true' ? { zero_rtt_handshake: true } : {}),
      ...(node.params?.heartbeat ? { heartbeat: node.params.heartbeat } : {}),
    } : {}),
    ...(node.type === 'hysteria' ? {
      up_mbps: Number(node.params?.up_mbps || 100), down_mbps: Number(node.params?.down_mbps || 100),
      ...(node.params?.obfs ? { obfs: { type: node.params.obfs, ...(node.params.obfs_password ? { password: node.params.obfs_password } : {}) } } : {}),
    } : {}),
    ...(node.type === 'hysteria2' && node.params?.obfs ? { obfs: { type: node.params.obfs, ...(node.params.obfs_password ? { password: node.params.obfs_password } : {}) } } : {}),
    ...(node.type === 'shadowtls' ? { version: Number(node.params?.version || 3) } : {}),
    ...(node.type === 'snell' ? {
      // Snell v5's non-QUIC wire protocol is the same as v4; sing-box
      // deliberately accepts only v4 and v6 in its outbound schema.
      version: node.params?.version === '6' ? 6 : 4,
      ...(node.params?.version === '6' ? { mode: node.params?.mode || 'default' } : {
        obfs_mode: node.obfs || 'none',
        ...(node.params?.host || node.params?.obfsparam ? { obfs_host: node.params?.host || node.params?.obfsparam } : {}),
      }),
    } : {}),
    ...(node.tls ? { tls: node.tls } : {}),
    ...(singboxTransport(node) ? { transport: singboxTransport(node) } : {}),
  };
}

function wireguardEndpoint(node: Node): Record<string, unknown> {
  return {
    type: 'wireguard', tag: node.name,
    address: (node.params?.ip || '').split(',').map(value => value.trim()).filter(Boolean),
    private_key: node.privateKey,
    peers: [{
      address: node.server,
      port: node.port,
      public_key: node.params?.publickey,
      allowed_ips: (node.params?.allowedips || '0.0.0.0/0').split(',').map(value => value.trim()).filter(Boolean),
      ...(node.params?.presharedkey ? { pre_shared_key: node.params.presharedkey } : {}),
      ...(node.params?.keepalive ? { persistent_keepalive_interval: Number(node.params.keepalive) } : {}),
      ...(node.params?.reserved ? { reserved: node.params.reserved.split(',').map(Number) } : {}),
    }],
    ...(node.params?.mtu ? { mtu: Number(node.params.mtu) } : {}),
  };
}

function groupMembers(group: RuleConfig['groups'][number], nodes: Node[], groupNames: Set<string>): string[] {
  const members = group.proxies.flatMap(item => {
    const reference = item.match(/^!!GROUP=([^!]+)(?:!!\((.*)\))?$/);
    if (reference) return groupNames.has(reference[1]) ? [reference[1]] : [];
    if (['DIRECT', 'REJECT', 'PASS', 'direct'].includes(item) || groupNames.has(item) || nodes.some(node => node.name === item)) return [item === 'DIRECT' ? 'direct' : item];
    return [];
  });
  for (const matcher of group.proxies) {
    const pattern = matcher === '.*' ? '.*' : matcher.match(/^!!\((.*)\)$/)?.[1] || matcher.match(/^!!GROUP=[^!]+!!\((.*)\)$/)?.[1];
    if (!pattern) continue;
    try { members.push(...nodes.filter(node => new RegExp(pattern).test(node.name)).map(node => node.name)); } catch { /* Ignore malformed user patterns. */ }
  }
  return [...new Set(members)];
}

function routeRule(rule: string, outboundTags: Set<string>): Record<string, unknown> | undefined {
  const parts = rule.split(',');
  const kind = parts.shift()?.toUpperCase();
  const aliases: Record<string, string> = { DIRECT: 'direct', REJECT: 'REJECT' };
  let targetIndex = -1;
  for (let index = parts.length - 1; index >= 0; index--) if (outboundTags.has(aliases[parts[index]!.trim()] || parts[index]!.trim())) { targetIndex = index; break; }
  const rawTarget = targetIndex >= 0 ? parts.splice(targetIndex, 1)[0]?.trim() : undefined;
  const target = rawTarget ? aliases[rawTarget] || rawTarget : undefined;
  if (!kind || !target || !outboundTags.has(target)) return;
  const values = parts.map(value => value.trim()).filter(value => value && value.toLowerCase() !== 'no-resolve');
  if (kind === 'MATCH' || kind === 'FINAL') return;
  if (kind === 'GEOIP' && values[0]) {
    return { rule_set: [`geoip-${values[0].toLowerCase()}`], action: 'route', outbound: target };
  }
  const keys: Record<string, string> = {
    'DOMAIN': 'domain', 'DOMAIN-SUFFIX': 'domain_suffix', 'DOMAIN-KEYWORD': 'domain_keyword',
    'IP-CIDR': 'ip_cidr', 'IP-CIDR6': 'ip_cidr',
    'PROCESS-NAME': 'process_name', 'PROCESS-PATH': 'process_path', 'NETWORK': 'network',
  };
  const key = keys[kind];
  if (!key || !values.length) return;
  const result: Record<string, unknown> = { [key]: values, action: 'route', outbound: target };
  if ((kind === 'IP-CIDR' || kind === 'IP-CIDR6') && parts.some(value => value.trim().toLowerCase() === 'no-resolve')) result.ip_cidr = values;
  return result;
}

export function singbox(nodes: Node[], ruleConfig?: RuleConfig, ruleSetBase?: string) {
  const compatibleNodes = nodes.filter(isSingboxCompatible);
  const wireguardNodes = compatibleNodes.filter(node => node.type === 'wireguard');
  const proxyNodes = compatibleNodes.filter(node => node.type !== 'wireguard');
  const nodeTags = new Set(compatibleNodes.map(node => node.name));
  const configuredGroups = ruleConfig?.groups || [];
  const groupNames = new Set(configuredGroups.map(group => group.name));
  const groups = configuredGroups.map(group => ({ group, members: groupMembers(group, compatibleNodes, groupNames) })).filter(entry => entry.members.length > 0);
  const defaultMembers = compatibleNodes.map(node => node.name);
  const hasConfiguredGroups = groups.length > 0;
  const outbounds = [
    ...proxyNodes.map(outbound),
    ...(hasConfiguredGroups ? groups.map(({ group, members }) => ({
      type: group.type === 'url-test' ? 'urltest' : 'selector', tag: group.name, outbounds: members,
      ...(group.type === 'url-test' ? { url: group.url, interval: `${group.interval || 300}s`, tolerance: group.tolerance || 50 } : {}),
    })) : [{ type: 'selector', tag: 'PROXY', outbounds: [...defaultMembers, 'direct'] }]),
    { type: 'selector', tag: 'GLOBAL', outbounds: ['direct', ...defaultMembers] },
    { type: 'direct', tag: 'direct' },
    { type: 'block', tag: 'REJECT' },
  ];
  const groupTags = new Set([...nodeTags, ...groups.map(({ group }) => group.name), ...(!hasConfiguredGroups ? ['PROXY'] : []), 'direct', 'REJECT', 'GLOBAL']);
  const rules = [
    { action: 'sniff' },
    { protocol: 'dns', action: 'hijack-dns' },
    { clash_mode: 'Global', outbound: 'GLOBAL' },
    { clash_mode: 'Direct', outbound: 'direct' },
    ...(ruleConfig?.rules || []).map(rule => routeRule(rule, groupTags)).filter((rule): rule is Record<string, unknown> => Boolean(rule)),
  ];
  const geoipTags = [...new Set(rules.flatMap(rule => Array.isArray(rule.rule_set) ? rule.rule_set.filter((tag): tag is string => typeof tag === 'string' && tag.startsWith('geoip-')) : []))];
  const finalGroup = configuredGroups.find(group => /节点选择|proxy/i.test(group.name))?.name || groups[0]?.group.name || 'PROXY';
  const final = groupTags.has(finalGroup) ? finalGroup : 'PROXY';
  const finalRule = (ruleConfig?.rules || []).find(rule => /^(MATCH|FINAL),/i.test(rule));
  const requestedFinal = finalRule?.split(',').at(-1)?.trim();
  const routeFinal = requestedFinal && groupTags.has(requestedFinal) ? requestedFinal : final;
  return {
    $schema: 'https://sing-box.sagernet.org/schema.json',
    log: { level: 'warn' },
    dns: {
      servers: [
        { type: 'https', tag: 'dns_cn', server: '223.5.5.5', server_port: 443, path: '/dns-query', tls: { enabled: true, server_name: 'dns.alidns.com' } },
        { type: 'https', tag: 'dns_global', server: '1.1.1.1', server_port: 443, path: '/dns-query', tls: { enabled: true, server_name: 'cloudflare-dns.com' }, detour: final },
        { type: 'fakeip', tag: 'dns_fakeip', inet4_range: '198.18.0.0/15' },
        { type: 'udp', tag: 'dns_resolver', server: '223.5.5.5' },
      ],
      rules: [],
      final: 'dns_global',
      strategy: 'prefer_ipv4',
      reverse_mapping: true,
    },
    inbounds: [
      { type: 'mixed', tag: 'mixed-in', listen: '0.0.0.0', listen_port: 2080 },
      { type: 'tun', tag: 'tun-in', address: ['172.19.0.1/30'], auto_route: true, strict_route: true, dns_mode: 'hijack', stack: 'mixed' },
    ],
    ...(wireguardNodes.length ? { endpoints: wireguardNodes.map(wireguardEndpoint) } : {}),
    outbounds,
    // sing-box 1.14 deprecates the implicit default HTTP client for
    // remote rule-sets (removed in 1.16.0): define an explicit
    // client detouring through the proxy, and select it below.
    // Do NOT use download_detour on the rule-sets: it is deprecated
    // in 1.14.0 as well.
    ...(geoipTags.length ? { http_clients: [{ tag: 'rule-set-http', detour: final }] } : {}),
    route: {
      auto_detect_interface: true,
      default_domain_resolver: 'dns_resolver',
      rules,
      ...(geoipTags.length ? { rule_set: geoipTags.map(tag => ({ type: 'remote', tag, format: 'binary', url: `${ruleSetBase || 'https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set'}/${tag}.srs`, update_interval: '1d' })) } : {}),
      final: routeFinal,
      ...(geoipTags.length ? { default_http_client: 'rule-set-http' } : {}),
    },
    ntp: { enabled: true, server: 'time.apple.com', server_port: 123, interval: '30m' },
    experimental: {
      cache_file: { enabled: true, store_fakeip: true },
      clash_api: { external_controller: '127.0.0.1:9090', external_ui: 'dashboard' },
    },
  };
}
