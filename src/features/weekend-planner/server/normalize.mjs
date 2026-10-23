// ─────────────────────────────────────────────────────────────────────
// 活动归一化：把各信源抓到的原始条目统一成 WEvent（与 events.data.ts 同构）
// 纯函数，无网络请求
// ─────────────────────────────────────────────────────────────────────

// ── 文本工具 ─
export function decodeHtml(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function stripTags(s) {
  return decodeHtml(String(s ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** 找第一个命中的关键词（kw 均为小写匹配） */
function hit(text, kws) {
  return kws.some((k) => text.includes(k));
}

// ── 日期工具 ─
export const pad2 = (n) => String(n).padStart(2, '0');
export const toISO = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;

// ── 分类规则 ─
const CAT_RULES = [
  ['show', [
    '演唱会', '音乐会', '音乐节', '乐队', '巡演', 'livehouse', 'live house',
    '脱口秀', '话剧', '戏剧', '歌剧', '音乐剧', '曲艺', '相声', '京剧',
    '戏曲', '芭蕾', '舞蹈', '演唱', '独奏', '交响乐', '合唱团', '民乐',
  ]],
  ['exhibition', [
    '艺术展', '双年展', '画展', '特展', '美术馆', '摄影展', '雕塑展',
    '艺术双年展', '设计展', '书法展', '美术展',
  ]],
  ['market', [
    '市集', '集市', '嘉年华', '庙会', '博览会', '展览会', '展会',
    '展销', '会展', '展销会', '游园会', '庙会',
  ]],
  ['ai', [
    '人工智能', '大模型', 'ai', '芯片', '半导体', '机器人', '开发者',
    '编程', '算法', '云计算', '数字化', '智能制造', '软件', '科技',
    '数码', '大数据', '网络安全', '互联网', '算力', 'aigc', '智能',
  ]],
  ['experience', [
    '沉浸式', '沉浸', '夜游', '光影秀', '灯光秀', '密室', '剧本杀',
    '实景', 'vr', '行浸', '漂移式',
  ]],
  ['science', [
    '科普', '研学', '博物馆', '科技馆', '讲座', '沙龙', '论坛',
    '峰会', '研讨会', '课程', '培训', '亲子', '体验课',
  ]],
];

const DEFAULT_CAT = {
  douban: 'science',
  showstart: 'show',
  huodongxing: 'science',
  andexpo: 'market',
  wlj: 'science',
  bendibao: 'market',
};

export function detectCategory(title, tags, sourceId) {
  const text = `${title} ${tags.join(' ')}`.toLowerCase();
  // 注意顺序：演出/展览/展会优先于 AI/科普，避免“科技展会”误判
  for (const [cat, kws] of CAT_RULES) {
    if (hit(text, kws)) return cat;
  }
  return DEFAULT_CAT[sourceId] ?? 'science';
}

// ── 区域（行政区）规则 ──
const DISTRICT_RULES = [
  ['光谷', ['光谷', '东湖高新', '关山大道', '光谷大道', '华科', '华中科技大学',
    '光谷国际网球', '湖北省奥林匹克', '佛祖岭', '软件园', '未来科技城', '花山']],
  ['汉阳', ['琴台', '国博', '国际博览中心', '汉阳造', '钟家村', '王家湾',
    '归元寺', '龟山北路', '摩尔城', '墨水湖', '汉阳区']],
  ['江岸', ['知音号', '汉口江滩', '黎黄陂路', '吉庆街', '南京路', '大智路',
    '武汉天地', '保成路', '台北路', '百步亭', '后湖', '江岸']],
  ['江汉', ['江汉路', '江汉关', '武汉国际会展中心', '武商广场', '国广',
    '武商mall', '菱角湖', '唐家墩', '泛海', '王家墩', '江汉']],
  ['硚口', ['园博园', '古田', '宗关', '荟聚', '宜家', '汉江湾', '武胜路', '硚口']],
  ['武昌', ['黄鹤楼', '湖北剧院', '洪山礼堂', '洪山宾馆', '楚河汉街', '汉街',
    '武商梦时代', '武珞路', '中南路', '水果湖', '昙华林', '粮道街',
    '徐东', '销品茂', '武汉大学', '东湖路', '武昌', '长春观', '首义']],
  ['洪山', ['街道口', '广埠屯', '中南路', '华中师范', '武汉理工', '宝通寺',
    '珞狮路', '马房山', '洪山区', '南湖', '光谷步行街', '鲁巷']],
  ['青山', ['青山', '红钢城', '众圆', '建二', '建设二路']],
  ['东西湖', ['金银湖', '吴家山', '常青花园', '武汉客厅', '宏图路', '东西湖']],
  ['经开', ['沌口', '东风公司', '武汉体育中心', '体育中心', '经开', '车都']],
  ['江夏', ['江夏', '藏龙岛', '庙山', '纸坊', '黄家湖']],
  ['黄陂', ['盘龙城', '天河机场', '黄陂', '汉口北']],
  ['蔡甸', ['蔡甸', '后官湖', '花博汇']],
  ['新洲', ['新洲', '阳逻', '双柳']],
  ['汉南', ['汉南']],
];

// 行政区全称（武汉 汉阳区 …）→ 简称
const DISTRICT_FULL = [
  ['汉阳区', '汉阳'], ['武昌区', '武昌'], ['江岸区', '江岸'], ['江汉区', '江汉'],
  ['硚口区', '硚口'], ['洪山区', '洪山'], ['青山区', '青山'], ['东西湖区', '东西湖'],
  ['江夏区', '江夏'], ['黄陂区', '黄陂'], ['蔡甸区', '蔡甸'], ['新洲区', '新洲'],
  ['汉南区', '汉南'], ['东湖高新区', '光谷'], ['东湖风景区', '武昌'],
  ['武汉经开区', '经开'], ['武汉经济技术开发区', '经开'],
];

export function detectDistrict(venue, address) {
  const joined = `${address} ${venue}`;
  for (const [full, short] of DISTRICT_FULL) {
    if (joined.includes(full)) return short;
  }
  const text = joined.toLowerCase();
  for (const [district, kws] of DISTRICT_RULES) {
    if (kws.some((k) => joined.includes(k) || text.includes(k.toLowerCase())))
      return district;
  }
  return '待通知';
}

// ── 价格 ─
export function isFreeText(price) {
  const t = String(price ?? '').trim();
  if (!t) return false;
  return /免费|公益|惠民|free|0\s*元/.test(t);
}

// ── 时段推断 ─
const HOUR_RE = /(\d{1,2}):(\d{2})/;

function slotFromHour(hour) {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function inferSlots(category, timeHint, multiDay) {
  const slots = new Set();
  if (timeHint) {
    const ms = [...timeHint.matchAll(new RegExp(HOUR_RE, 'g'))];
    if (ms.length) {
      ms.forEach((m) => slots.add(slotFromHour(Number(m[1]))));
    }
  }
  if (slots.size === 0) {
    if (category === 'show' || category === 'experience') slots.add('evening');
    else if (category === 'ai') slots.add('afternoon');
    else if (multiDay) {
      slots.add('morning');
      slots.add('afternoon');
    } else slots.add('afternoon');
  }
  // 多日型展会/展览：开放时段覆盖白天
  if (multiDay && (category === 'market' || category === 'exhibition'
    || category === 'science')) {
    slots.add('morning');
    slots.add('afternoon');
  }
  // 嘉年华 / 夜市类可到晚上
  if (category === 'market' && /嘉年华|夜市|音乐|派对|夜游/.test(`${timeHint}`))
    slots.add('evening');
  return [...slots];
}

// ── 三维度打分（启发式）──
// 信号来源：活动规格关键词、场馆层级、票价、各平台真实人气（参加/感兴趣/关注）
// 目标：每个活动有差异化分数，推荐按分数排序，而不是按类别给默认分
/**
 * @param {Object} sig
 * @param {string} sig.category
 * @param {string} sig.title
 * @param {string[]} sig.tags
 * @param {string} sig.venue
 * @param {number} [sig.attend]   豆瓣“人参加”
 * @param {number} [sig.interest] 豆瓣“人感兴趣”
 * @param {number} [sig.follows]  活动行关注
 * @param {number} [sig.priceNum] 最低票价数字
 */
export function heuristicScores(sig) {
  const { category, title, tags, venue, attend, interest, follows, priceNum } = sig;
  const text = `${title} ${tags.join(' ')} ${venue}`;
  const has = (re) => re.test(text);
  const clamp = (n) => Math.max(1, Math.min(5, Math.round(n)));
  // 综合人气（各平台信号叠加）
  const pop = (attend ?? 0) + (interest ?? 0) + (follows ?? 0);

  // ── 重要：含金量 / 机会难得 / 值得专门去 ──
  let importance = 3;
  // 规格：首届/第N届/国际/国家级/双年展/博览会/音乐节/大会/峰会/盛典/艺术季/开幕/巡演
  if (has(/首届|第\s*\d+\s*届|国际|全国|亚洲|国家级|世界级|双年展|博览会|音乐节|大会|峰会|盛典|艺术季|开幕|启幕|展演|巡演|大型/))
    importance += 1;
  // 大师/名家/名团/冠军
  if (has(/大师|名家|名团|首席|冠军|金奖|影帝|殿堂级|传奇|国宝|顶流/))
    importance += 0.5;
  // 大场馆：体育中心/奥体/国博/琴台大剧院/琴台音乐厅/武汉客厅/会展中心
  if (has(/体育中心|奥体|奥林匹克|国博|国际博览中心|琴台大剧院|琴台音乐厅|武汉客厅|国际会展中心|大剧院|体育馆|音乐厅/))
    importance += 0.5;
  // 高票价 = 大制作信号
  if (priceNum != null && priceNum >= 200) importance += 0.5;
  // 小聚 / 每周常驻 / 线上活动 → 降档
  if (has(/每周|长期|常态化|拼车|读书会|小聚|搭子|茶话会|观影会|线上|直播/))
    importance -= 1;
  // 真实人气优先（人气高的活动值得专门去）
  if ((attend ?? 0) >= 300 || (interest ?? 0) >= 500 || pop >= 700)
    importance = 5;
  else if ((attend ?? 0) >= 100 || (interest ?? 0) >= 200 || pop >= 250)
    importance = Math.max(importance, 4);
  else if ((attend ?? 0) >= 40 || pop >= 80) importance = Math.max(importance, 3.5);

  // ── 有趣：好玩程度 ──
  let fun;
  if (category === 'show') {
    fun = 3;
    if (has(/演唱会|音乐节|狂欢|派对|电音|嘉年华/)) fun = 5;
    else if (has(/脱口秀|喜剧|爆笑|相声|小品|搞笑|即兴|漫才|魔术|杂技|脱口秀/))
      fun = 4;
    else if (has(/沉浸式|光影|舞剧|舞蹈|街舞|乐队|摇滚|livehouse|巡演|民谣|说唱|嘻哈|爵士|国风/))
      fun = 4;
    else if (has(/音乐会|交响乐|古典|独奏|古琴|民乐|昆曲|京剧|戏曲|歌剧|合唱团|合唱/))
      fun = 3;
  } else if (category === 'experience') {
    fun = 5;
    if (has(/密室|剧本杀|寻宝|解谜/)) fun = 4;
    if (has(/游船|观光|夜游|观景|缆车/)) fun = 4;
  } else if (category === 'market') {
    fun = 3;
    if (has(/嘉年华|夜市|美食|小吃|啤酒|派对|庙会|游园|潮玩|手作|创意|宠物/))
      fun = 4;
    if (has(/音乐节|狂欢/)) fun = 5;
  } else if (category === 'exhibition') {
    fun = 3;
    if (has(/沉浸式|互动|装置|新媒体|光影|潮玩|数字|打卡|拍照/)) fun = 4;
  } else if (category === 'ai') {
    fun = 2;
    if (has(/黑客松|马拉松|大赛|竞赛|体验|嘉年华|workshop|工作坊|动手|实操|demo/))
      fun = 4;
    if (has(/派对|社交|联谊|晚宴/)) fun = 3;
  } else {
    // science
    fun = 2;
    if (has(/亲子|儿童|体验|互动|动手|科学秀|实验|探秘|夜游|寻宝/)) fun = 4;
    if (has(/研学|游学|参观|探访|博物|自然|观鸟/)) fun = 3;
  }
  // 高人气活动通常更有趣
  if (pop >= 200) fun += 0.5;

  // ── 教育意义：学习 / 认知价值 ──
  let education;
  if (category === 'ai') {
    education = 5;
    if (has(/体验|嘉年华|社交|联谊|派对|晚宴/)) education = 3;
  } else if (category === 'science') {
    education = 5;
    if (has(/亲子|儿童|科学秀|体验|实验|互动|动手/)) education = 4;
    if (has(/参观|游览|观光|踏青/)) education = 3;
  } else if (category === 'exhibition') {
    education = 4;
    if (has(/双年展|特展|回顾展|文献|学术|艺术史|博物/)) education = 5;
  } else if (category === 'market') {
    education = 2;
    if (has(/博览会|展览会|展会|会展|行业|峰会|论坛|专业|技术/)) education = 4;
  } else if (category === 'experience') {
    education = 3;
    if (has(/历史|文化|非遗|博物|遗址|红色|科普/)) education = 4;
  } else {
    // show
    education = 2;
    if (has(/古典|交响乐|音乐会|音乐家|古琴|民乐|昆曲|京剧|戏曲|歌剧|合唱团|独奏|艺术歌曲/))
      education = 4;
    if (has(/历史|文学|名著|诗词|国风|非遗|经典|话剧|曹禺|老舍|鲁迅|巴金|曹禺/))
      education = 3;
  }

  return { importance: clamp(importance), fun: clamp(fun), education: clamp(education) };
}

/** 从价格文本中提取最低票价数字（用于大制作信号） */
export function priceNumberOf(priceText) {
  const nums = [...String(priceText ?? '').matchAll(/\d+(?:\.\d+)?/g)]
    .map((m) => Number(m[0]))
    .filter((n) => n > 0 && n < 100000);
  return nums.length ? Math.min(...nums) : null;
}

// ── 去重键：剥离场次装饰，保留核心标题 ─
export function dedupeKey(title) {
  return String(title)
    .replace(/【[^】]*】/g, '') // 【武汉】【魔脱喜剧】
    .replace(/\[.*?\]/g, '')
    .replace(/（[^）]*）|\([^)]*\)/g, '') // （武汉站）
    .replace(/武汉站|武汉/g, '')
    .replace(/\d{4}年/g, '')
    .replace(/\d{4}/g, '')
    .replace(/[《》"""'“”‘’!！?？:：·、,，.。…｜|\-\s]/g, '')
    .toLowerCase();
}

// ── 汇总：RawEvent → WEvent ─
/**
 * @typedef {Object} RawEvent
 * @property {string} key        源内唯一 id
 * @property {string} title
 * @property {string} startISO
 * @property {string} [endISO]
 * @property {string} [timeHint]
 * @property {string} [venue]
 * @property {string} [address]
 * @property {string} [priceRaw]
 * @property {boolean} [freeKnown]
 * @property {boolean} [booking]
 * @property {string[]} [tags]
 * @property {string[]} [highlights]
 * @property {number} [attend]
 * @property {number} [interest] 豆瓣“人感兴趣”
 * @property {number} [follows]  活动行关注
 * @property {string} [url]      该活动的详情页地址
 */
export function finalize(raw, sourceId, sourceName, sourceUrl) {
  const title = stripTags(raw.title);
  const tags = (raw.tags ?? []).map(stripTags).filter(Boolean);
  const category = detectCategory(title, tags, sourceId);
  const venue = stripTags(raw.venue) || '见活动详情';
  const address = stripTags(raw.address);
  const district = detectDistrict(venue, address);
  const priceRaw = stripTags(raw.priceRaw);
  const free = raw.freeKnown ?? isFreeText(priceRaw);
  const price = priceRaw || (free ? '免费' : '详见活动页');
  const multiDay = !!raw.endISO && raw.endISO !== raw.startISO;
  const slots = inferSlots(category, raw.timeHint, multiDay);
  const scores = heuristicScores({
    category,
    title,
    tags,
    venue,
    attend: raw.attend,
    interest: raw.interest,
    follows: raw.follows,
    priceNum: priceNumberOf(priceRaw),
  });

  return {
    id: `${sourceId}-${raw.key}`,
    title,
    category,
    startDate: raw.startISO,
    ...(raw.endISO ? { endDate: raw.endISO } : {}),
    ...(raw.timeHint ? { timeHint: stripTags(raw.timeHint) } : {}),
    venue,
    district,
    ...(address ? { address } : {}),
    price,
    free,
    booking: raw.booking ?? !free,
    highlights: (raw.highlights ?? []).map(stripTags).filter(Boolean).slice(0, 3),
    tags: tags.slice(0, 6),
    source: { name: sourceName, url: raw.url || sourceUrl },
    durationHours: category === 'ai' ? 3 : 2.5,
    slots,
    scores,
  };
}

/** 跨源合并：同标题去重，信息更全的保留，其余信源记入 otherSources */
export function mergeEvents(events) {
  const map = new Map();
  for (const ev of events) {
    const key = dedupeKey(ev.title);
    if (!key) continue;
    const exist = map.get(key);
    if (!exist) {
      map.set(key, ev);
      continue;
    }
    // 评分：场地具体 + 评分高 + 免费信息明确 的优先
    const completeness = (e) =>
      (e.district !== '待通知' ? 2 : 0) +
      (e.venue !== '见活动详情' ? 1 : 0) +
      (e.highlights.length ? 1 : 0) +
      (e.timeHint ? 1 : 0);
    const [better, worse] =
      completeness(ev) > completeness(exist) ? [ev, exist] : [exist, ev];
    const otherSources = [...(better.otherSources ?? []), worse.source];
    // 合并亮点与标签
    better.highlights = [...new Set([...better.highlights, ...worse.highlights])].slice(0, 3);
    better.tags = [...new Set([...better.tags, ...worse.tags])].slice(0, 6);
    if (better.district === '待通知' && worse.district !== '待通知')
      better.district = worse.district;
    better.otherSources = otherSources;
    map.set(key, better);
  }
  return [...map.values()];
}
