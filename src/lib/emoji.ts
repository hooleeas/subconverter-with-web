/**
 * 国旗 emoji：按节点名（及服务器地址）检测国家/地区，自动在节点名前加国旗。
 * 对齐 C++ subconverter 的 emoji=true 行为：只加旗子，不改原名；已有旗子不重复加。
 */

/** ISO 3166-1 二字母代码 → 国旗 emoji（区域指示符对）。 */
export function flagForCode(code: string): string {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  return String.fromCodePoint(0x1f1e6 + (c.charCodeAt(0) - 65), 0x1f1e6 + (c.charCodeAt(1) - 65));
}

/** 名称是否已以国旗 emoji（两个区域指示符）开头。 */
export function startsWithFlag(name: string): boolean {
  const chars = Array.from(String(name || ''));
  if (chars.length < 2) return false;
  const isRegional = (ch: string): boolean => {
    const cp = ch.codePointAt(0) || 0;
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  };
  return isRegional(chars[0]!) && isRegional(chars[1]!);
}

/** [ISO 代码, 匹配关键词]：英文名/中文名/常用别名/代码本身。按先长后短排序，避免短码误撞。 */
const ENTRIES: Array<[string, string[]]> = [
  ['US', ['united states', 'america', 'usa', 'us', '美国', '美利坚', '美西', '美东', '美中', '洛杉矶', '纽约', '旧金山', '西雅图', '芝加哥', '达拉斯', '凤凰城', '亚特兰大', '迈阿密', '硅谷', '圣何塞', '拉斯维加斯', '波特兰', '丹佛', '休斯顿']],
  ['JP', ['japan', 'jp', '日本', '东京', '大阪', '名古屋']],
  ['HK', ['hong kong', 'hongkong', 'hk', '香港', '港']],
  ['TW', ['taiwan', 'tw', '台湾', '台北']],
  ['SG', ['singapore', 'sg', '新加坡', '狮城']],
  ['KR', ['korea', 'south korea', 'kr', '韩国', '首尔']],
  ['GB', ['united kingdom', 'great britain', 'britain', 'england', 'uk', 'gb', '英国', '伦敦']],
  ['DE', ['germany', 'de', '德国', '法兰克福', '柏林']],
  ['FR', ['france', 'fr', '法国', '巴黎']],
  ['NL', ['netherlands', 'holland', 'nl', '荷兰', '阿姆斯特丹']],
  ['CA', ['canada', 'ca', '加拿大', '多伦多', '温哥华', '蒙特利尔']],
  ['AU', ['australia', 'au', '澳大利亚', '澳洲', '悉尼', '墨尔本']],
  ['RU', ['russia', 'ru', '俄罗斯', '莫斯科']],
  ['IN', ['india', 'in', '印度', '孟买', '新德里']],
  ['BR', ['brazil', 'br', '巴西', '圣保罗']],
  ['TR', ['turkey', 'turkiye', 'tr', '土耳其', '伊斯坦布尔']],
  ['ID', ['indonesia', 'id', '印度尼西亚', '印尼', '雅加达']],
  ['MY', ['malaysia', 'my', '马来西亚', '吉隆坡']],
  ['TH', ['thailand', 'th', '泰国', '曼谷']],
  ['VN', ['vietnam', 'vn', '越南', '胡志明', '河内']],
  ['PH', ['philippines', 'ph', '菲律宾', '马尼拉']],
  ['MX', ['mexico', 'mx', '墨西哥']],
  ['AR', ['argentina', 'ar', '阿根廷', '布宜诺斯艾利斯']],
  ['CL', ['chile', 'cl', '智利']],
  ['CO', ['colombia', 'co', '哥伦比亚']],
  ['PE', ['peru', 'pe', '秘鲁']],
  ['ZA', ['south africa', 'za', '南非']],
  ['EG', ['egypt', 'eg', '埃及', '开罗']],
  ['NG', ['nigeria', 'ng', '尼日利亚']],
  ['KE', ['kenya', 'ke', '肯尼亚']],
  ['IL', ['israel', 'il', '以色列', '特拉维夫']],
  ['AE', ['united arab emirates', 'uae', 'ae', '阿联酋', '迪拜', '阿布扎比']],
  ['SA', ['saudi arabia', 'sa', '沙特阿拉伯', '沙特', '利雅得']],
  ['IR', ['iran', 'ir', '伊朗']],
  ['IQ', ['iraq', 'iq', '伊拉克']],
  ['PL', ['poland', 'pl', '波兰', '华沙']],
  ['CZ', ['czech', 'czechia', 'cz', '捷克', '布拉格']],
  ['AT', ['austria', 'at', '奥地利', '维也纳']],
  ['CH', ['switzerland', 'ch', '瑞士', '苏黎世', '日内瓦']],
  ['SE', ['sweden', 'se', '瑞典', '斯德哥尔摩']],
  ['NO', ['norway', 'no', '挪威', '奥斯陆']],
  ['DK', ['denmark', 'dk', '丹麦', '哥本哈根']],
  ['FI', ['finland', 'fi', '芬兰', '赫尔辛基']],
  ['IE', ['ireland', 'ie', '爱尔兰', '都柏林']],
  ['PT', ['portugal', 'pt', '葡萄牙', '里斯本']],
  ['ES', ['spain', 'es', '西班牙', '马德里', '巴塞罗那']],
  ['IT', ['italy', 'it', '意大利', '罗马', '米兰']],
  ['GR', ['greece', 'gr', '希腊', '雅典']],
  ['HU', ['hungary', 'hu', '匈牙利', '布达佩斯']],
  ['RO', ['romania', 'ro', '罗马尼亚']],
  ['UA', ['ukraine', 'ua', '乌克兰', '基辅']],
  ['BY', ['belarus', 'by', '白俄罗斯']],
  ['KZ', ['kazakhstan', 'kz', '哈萨克斯坦']],
  ['UZ', ['uzbekistan', 'uz', '乌兹别克斯坦']],
  ['MN', ['mongolia', 'mn', '蒙古']],
  ['NP', ['nepal', 'np', '尼泊尔']],
  ['LK', ['sri lanka', 'lk', '斯里兰卡']],
  ['BD', ['bangladesh', 'bd', '孟加拉国']],
  ['PK', ['pakistan', 'pk', '巴基斯坦']],
  ['MM', ['myanmar', 'burma', 'mm', '缅甸']],
  ['KH', ['cambodia', 'kh', '柬埔寨']],
  ['LA', ['laos', 'la', '老挝']],
  ['BN', ['brunei', 'bn', '文莱']],
  ['MO', ['macau', 'macao', 'mo', '澳门']],
  ['NZ', ['new zealand', 'nz', '新西兰', '奥克兰']],
  ['IS', ['iceland', 'is', '冰岛']],
  ['LU', ['luxembourg', 'lu', '卢森堡']],
  ['BE', ['belgium', 'be', '比利时', '布鲁塞尔']],
  ['BG', ['bulgaria', 'bg', '保加利亚']],
  ['HR', ['croatia', 'hr', '克罗地亚']],
  ['SI', ['slovenia', 'si', '斯洛文尼亚']],
  ['SK', ['slovakia', 'sk', '斯洛伐克']],
  ['EE', ['estonia', 'ee', '爱沙尼亚']],
  ['LV', ['latvia', 'lv', '拉脱维亚']],
  ['LT', ['lithuania', 'lt', '立陶宛']],
  ['GE', ['georgia', 'ge', '格鲁吉亚']],
  ['AM', ['armenia', 'am', '亚美尼亚']],
  ['AZ', ['azerbaijan', 'az', '阿塞拜疆']],
  ['CY', ['cyprus', 'cy', '塞浦路斯']],
  ['MT', ['malta', 'mt', '马耳他']],
  ['AL', ['albania', 'al', '阿尔巴尼亚']],
  ['RS', ['serbia', 'rs', '塞尔维亚']],
  ['BA', ['bosnia', 'ba', '波黑', '波斯尼亚']],
  ['MD', ['moldova', 'md', '摩尔多瓦']],
  ['KW', ['kuwait', 'kw', '科威特']],
  ['QA', ['qatar', 'qa', '卡塔尔', '多哈']],
  ['BH', ['bahrain', 'bh', '巴林']],
  ['OM', ['oman', 'om', '阿曼']],
  ['JO', ['jordan', 'jo', '约旦']],
  ['LB', ['lebanon', 'lb', '黎巴嫩']],
  ['YE', ['yemen', 'ye', '也门']],
  ['AF', ['afghanistan', 'af', '阿富汗']],
  ['TM', ['turkmenistan', 'tm', '土库曼斯坦']],
  ['TJ', ['tajikistan', 'tj', '塔吉克斯坦']],
  ['KG', ['kyrgyzstan', 'kg', '吉尔吉斯斯坦']],
  ['VE', ['venezuela', 've', '委内瑞拉']],
  ['EC', ['ecuador', 'ec', '厄瓜多尔']],
  ['BO', ['bolivia', 'bo', '玻利维亚']],
  ['PY', ['paraguay', 'py', '巴拉圭']],
  ['UY', ['uruguay', 'uy', '乌拉圭']],
  ['CU', ['cuba', 'cu', '古巴']],
  ['DO', ['dominican', 'do', '多米尼加']],
  ['PR', ['puerto rico', 'pr', '波多黎各']],
  ['JM', ['jamaica', 'jm', '牙买加']],
  ['CR', ['costa rica', 'cr', '哥斯达黎加']],
  ['PA', ['panama', 'pa', '巴拿马']],
  ['GT', ['guatemala', 'gt', '危地马拉']],
  ['HN', ['honduras', 'hn', '洪都拉斯']],
  ['SV', ['el salvador', 'sv', '萨尔瓦多']],
  ['NI', ['nicaragua', 'ni', '尼加拉瓜']],
  ['BZ', ['belize', 'bz', '伯利兹']],
  ['BS', ['bahamas', 'bs', '巴哈马']],
  ['TT', ['trinidad', 'tt', '特立尼达']],
  ['BB', ['barbados', 'bb', '巴巴多斯']],
  ['GH', ['ghana', 'gh', '加纳']],
  ['CI', ['cote divoire', 'ivory coast', 'ci', '科特迪瓦']],
  ['SN', ['senegal', 'sn', '塞内加尔']],
  ['CM', ['cameroon', 'cm', '喀麦隆']],
  ['AO', ['angola', 'ao', '安哥拉']],
  ['ZM', ['zambia', 'zm', '赞比亚']],
  ['ZW', ['zimbabwe', 'zw', '津巴布韦']],
  ['MZ', ['mozambique', 'mz', '莫桑比克']],
  ['MG', ['madagascar', 'mg', '马达加斯加']],
  ['MU', ['mauritius', 'mu', '毛里求斯']],
  ['ET', ['ethiopia', 'et', '埃塞俄比亚']],
  ['TZ', ['tanzania', 'tz', '坦桑尼亚']],
  ['UG', ['uganda', 'ug', '乌干达']],
  ['DZ', ['algeria', 'dz', '阿尔及利亚']],
  ['MA', ['morocco', 'ma', '摩洛哥']],
  ['TN', ['tunisia', 'tn', '突尼斯']],
  ['LY', ['libya', 'ly', '利比亚']],
  ['SD', ['sudan', 'sd', '苏丹']],
  ['SO', ['somalia', 'so', '索马里']],
];

/** 两字母 ISO 代码须按独立词匹配，避免 US 撞上 BUS、NO 撞上 NODE 这类误判。 */
function matchesKeyword(text: string, lower: string, keyword: string): boolean {
  if (/^[a-z]{2}$/.test(keyword)) {
    const re = new RegExp(`(^|[^a-z])${keyword}([^a-z]|$)`, 'i');
    return re.test(text);
  }
  return lower.includes(keyword.toLowerCase());
}

/** 从节点名（回退到服务器地址）检测国家/地区代码，未命中返回空。 */
export function detectCountryCode(name: string, server = ''): string {
  const text = String(name || '');
  const lower = text.toLowerCase();
  for (const [code, keywords] of ENTRIES) {
    for (const keyword of keywords) {
      if (matchesKeyword(text, lower, keyword)) return code;
    }
  }
  const host = String(server || '').toLowerCase();
  if (host) {
    for (const [code, keywords] of ENTRIES) {
      for (const keyword of keywords) {
        if (matchesKeyword(host, host, keyword)) return code;
      }
    }
  }
  return '';
}

/** 给节点名加国旗：已有旗子、或检测不到国家时原样返回。 */
export function withFlagEmoji(name: string, server = ''): string {
  const original = String(name || '');
  if (!original || startsWithFlag(original)) return original;
  const code = detectCountryCode(original, server);
  if (!code) return original;
  const flag = flagForCode(code);
  return flag ? `${flag} ${original}` : original;
}
