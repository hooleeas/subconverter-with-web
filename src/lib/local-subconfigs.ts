export interface LocalSubconfig {
  id: string;
  name: string;
  url: string;
  localPreset: true;
}

const presets: Array<[string, string, string]> = [
  ['ACL4SSR.ini', '标准', '749486b3-042f-5ec5-ab10-19daaebf532a'],
  ['ACL4SSR_AdblockPlus.ini', '标准·广告拦截', 'd5dab995-b5cb-5a3e-bf6d-c0d58551d449'],
  ['ACL4SSR_BackCN.ini', '标准·回国节点', 'a8b35374-7777-551f-b710-9356bbc5bb55'],
  ['ACL4SSR_Mini.ini', '精简', '914dad5f-728f-58c8-a656-ef567d387af9'],
  ['ACL4SSR_Mini_Fallback.ini', '精简·故障转移', '5520744b-7420-5db1-ad7b-e418bbb502b3'],
  ['ACL4SSR_Mini_MultiMode.ini', '精简·多模式', 'ee838327-1928-5901-96d5-98e3cdbf70bd'],
  ['ACL4SSR_Mini_NoAuto.ini', '精简·无自动测速', '89803e05-782a-5f29-8ef1-6efea5bb572c'],
  ['ACL4SSR_NoApple.ini', '标准·无苹果分组', 'da6a0389-6fe5-5cde-9f90-a6d9ce9af8c1'],
  ['ACL4SSR_NoAuto.ini', '标准·无自动测速', '7224f787-ad8d-524f-bfc2-c7da5a1b0d60'],
  ['ACL4SSR_NoAuto_NoApple.ini', '标准·无自动测速、无苹果分组', '0adbc15f-f29e-51e1-85cf-1fad9632e610'],
  ['ACL4SSR_NoAuto_NoApple_NoMicrosoft.ini', '标准·无自动测速、无苹果和微软分组', '3ee7d4d3-b267-546c-bf68-d04201f31369'],
  ['ACL4SSR_NoMicrosoft.ini', '标准·无微软分组', '2a7f4265-ef93-5010-b9cd-4a1b494fa90b'],
  ['ACL4SSR_Online.ini', '标准·扩展规则', 'c2eef287-82b3-5574-a633-c2d023e596f7'],
  ['ACL4SSR_Online_AdblockPlus.ini', '标准·扩展规则、广告拦截', 'cc861552-d772-5ebe-a3f1-abbf36837a5e'],
  ['ACL4SSR_Online_Full.ini', '全功能·自动测速', '53a00111-4b40-5f47-923f-d7ed368a3cfa'],
  ['ACL4SSR_Online_Full_AdblockPlus.ini', '全功能·广告拦截', '1f595c52-b09d-5d23-9b7c-e4498cd9bc4a'],
  ['ACL4SSR_Online_Full_Google.ini', '全功能·谷歌增强', '6a272585-892d-5a67-8a95-dbabba16ec69'],
  ['ACL4SSR_Online_Full_MultiMode.ini', '全功能·多模式', '870d6e88-857a-5572-b8bf-533d00569470'],
  ['ACL4SSR_Online_Full_Netflix.ini', '全功能·奈飞增强', 'ece7fe2f-732d-540a-9e82-f7614cf51693'],
  ['ACL4SSR_Online_Full_NoAuto.ini', '全功能·无自动测速', 'd0ec5244-c47b-51ae-ba22-e666f75bcc31'],
  ['ACL4SSR_Online_Mini.ini', '精简·扩展规则', '76ea8fb1-4bbc-54b1-bb09-501b6d5e3aee'],
  ['ACL4SSR_Online_Mini_AdblockPlus.ini', '精简·扩展规则、广告拦截', 'd8cb95a1-d252-5a39-a210-c7b08818a84f'],
  ['ACL4SSR_Online_Mini_Ai.ini', '精简·AI 增强', 'd7d2f92a-067f-578a-9e00-8f6a2ce376ea'],
  ['ACL4SSR_Online_Mini_Fallback.ini', '精简·故障转移', 'd04fe405-6d74-573d-bea3-18ed9896ee9a'],
  ['ACL4SSR_Online_Mini_MultiCountry.ini', '精简·多国家节点', '5ad11894-cd72-59ca-9e8d-f5e05de0bdb1'],
  ['ACL4SSR_Online_Mini_MultiMode.ini', '精简·多模式', '9e086a05-0eb3-515c-b04f-0b3359ea2500'],
  ['ACL4SSR_Online_Mini_NoAuto.ini', '精简·无自动测速', '0e154bf6-c31e-52d0-9b84-04e95ab5c97c'],
  ['ACL4SSR_Online_MultiCountry.ini', '标准·多国家节点', '83c06d1a-9f40-5a2c-a339-bfed3be50056'],
  ['ACL4SSR_Online_NoAuto.ini', '标准·无自动测速', 'aae678b1-239a-564d-98d4-2fb32564edc6'],
  ['ACL4SSR_Online_NoReject.ini', '标准·不过滤节点', 'fa821d7a-9628-507b-9750-3b8e0408cd40'],
  ['ACL4SSR_WithChinaIp.ini', '增强中国 IP', '495373e1-00bc-5800-8d6c-60d4914e258d'],
  ['ACL4SSR_WithChinaIp_WithGFW.ini', '增强中国 IP GFW 自动测速', '1d0993fc-7485-5d16-b091-6af33a94b292'],
  ['ACL4SSR_WithGFW.ini', 'GFW 增强', 'bc7b4e0f-ba70-58ce-b23b-982af8f4325f'],
];

export const LOCAL_RULE_PREFIX = 'local://acl4ssr/Clash/';
export const localSubconfigs: LocalSubconfig[] = presets.map(([file, name, id]) => ({
  id,
  name,
  url: `${LOCAL_RULE_PREFIX}config/${file}`,
  localPreset: true,
}));

export function isLocalSubconfigUrl(value: unknown): value is string {
  return typeof value === 'string' && localSubconfigs.some(item => item.url === value);
}

export function mergeSubconfigs(local: LocalSubconfig[], configured: unknown): Array<LocalSubconfig | Record<string, unknown>> {
  const custom = Array.isArray(configured) ? configured.filter((item: any) => item && item.id && item.name && item.url && !local.some(preset => preset.id === item.id)) : [];
  return [...local, ...custom];
}
