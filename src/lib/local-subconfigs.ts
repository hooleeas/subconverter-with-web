export interface LocalSubconfig {
  id: string;
  name: string;
  url: string;
  localPreset: true;
}

const presets: Array<[string, string, string]> = [
  ['https://raw.githubusercontent.com/hooleeas/ACL4SSR/refs/heads/master/Clash/config/ACL4SSR_WithChinaIp_WithGFW.ini', '增强中国 IP GFW 自动测速', '1d0993fc-7485-5d16-b091-6af33a94b292'],
];

export const LOCAL_RULE_PREFIX = 'local://acl4ssr/Clash/';
export const localSubconfigs: LocalSubconfig[] = presets.map(([url, name, id]) => ({
  id,
  name,
  url,
  localPreset: true,
}));

/** 默认 SUBCONFIG：「标准」(ACL4SSR.ini)。初次部署未配置默认时使用。 */
export const DEFAULT_SUBCONFIG_ID = '1d0993fc-7485-5d16-b091-6af33a94b292';

export function isLocalSubconfigUrl(value: unknown): value is string {
  return typeof value === 'string' && localSubconfigs.some(item => item.url === value);
}

export function mergeSubconfigs(local: LocalSubconfig[], configured: unknown): Array<LocalSubconfig | Record<string, unknown>> {
  const custom = Array.isArray(configured) ? configured.filter((item: any) => item && item.id && item.name && item.url && !local.some(preset => preset.id === item.id)) : [];
  return [...local, ...custom];
}
