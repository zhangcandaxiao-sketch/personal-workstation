// ─────────────────────────────────────────────────────────────────────
// 信源抓取：豆瓣同城 / 秀动 / 活动行 / 和展网 / 武汉文旅局 / 本地宝 / 大麦
// 每个源返回 RawEvent[]；失败时抛出，由上层统一记录状态
// ─────────────────────────────────────────────────────────────────────
import {
  decodeHtml,
  stripTags,
  toISO,
  finalize,
  mergeEvents,
} from './normalize.mjs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

export const SOURCE_META = [
  { id: 'douban', name: '豆瓣同城 · 武汉', homepage: 'https://www.douban.com/location/wuhan/events' },
  { id: 'showstart', name: '秀动 · 武汉', homepage: 'https://www.showstart.com/event/list?cityCode=27' },
  { id: 'huodongxing', name: '活动行 · 武汉', homepage: 'https://www.huodongxing.com/events?city=%E6%AD%A6%E6%B1%89' },
  { id: 'andexpo', name: '和展网 · 武汉', homepage: 'https://wuhan.andexpo.com' },
  { id: 'wlj', name: '武汉文旅局', homepage: 'http://wlj.wuhan.gov.cn/ztzl_27/zxzt/tty/' },
  { id: 'bendibao', name: '本地宝 · 武汉', homepage: 'https://wh.bendibao.com/xiuxian/' },
  { id: 'damai', name: '大麦 · 武汉', homepage: 'https://search.damai.cn/search.htm?keyword=&cty=%E6%AD%A6%E6%B1%89&order=1' },
];

async function fetchText(url, { timeout = 15000, referer } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...(referer ? { Referer: referer } : {}),
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const buf = await res.arrayBuffer();
    // 按页面声明/utf-8 解码（和展网、文旅局无 charset 声明，默认 utf-8）
    let text = new TextDecoder('utf-8').decode(buf);
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return { text, finalUrl: res.url, status: res.status };
  } finally {
    clearTimeout(t);
  }
}

/** 限制并发的任务池 */
async function pool(items, limit, worker) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}

// ── 豆瓣同城 ─────────────────────────────────────────────────────────
async function collectDouban() {
  const pages = [0, 10, 20, 30, 40];
  const raws = [];
  for (const start of pages) {
    const { text } = await fetchText(
      `https://www.douban.com/location/wuhan/events/week-all?start=${start}`,
    );
    // 按条目切分
    const blocks = text.split(/<li class="list-entry"/).slice(1);
    for (const b of blocks) {
      const idM = b.match(/douban\.com\/event\/(\d+)\//);
      const titleM = b.match(/itemprop="summary">([^<]+)<\/span>/)
        || b.match(/title="([^"]+)"\s+itemprop="url"/);
      const startM = b.match(/itemprop="startDate"\s+datetime="([^"]+)"/);
      const endM = b.match(/itemprop="endDate"\s+datetime="([^"]+)"/);
      const locM = b.match(/itemprop="location"\s+content="([^"]+)"/);
      const feeM = b.match(/class="fee"[\s\S]*?<strong>([^<]*)<\/strong>/)
        || b.match(/class="fee"[^>]*>\s*([^<\s]+)/);
      const joinM = b.match(/(\d+)\s*人参加/);
      const interestM = b.match(/(\d+)\s*人感兴趣/);
      if (!idM || !startM) continue;

      const loc = locM ? decodeHtml(locM[1]) : '';
      // loc 形如 “武汉 汉阳区 东通菜园 艺术空间 晴川街道…”
      const locParts = loc.split(/\s+/).filter(Boolean);
      const districtPart = locParts[1] ?? '';
      const venue = locParts.slice(2).join(' ');
      const fee = feeM ? decodeHtml(feeM[1]).trim() : '';
      const startISO = startM[1].slice(0, 10);
      const endISO = endM ? endM[1].slice(0, 10) : undefined;
      const timeHint =
        `${startM[1].slice(11, 16)}` +
        (endM ? `–${endM[1].slice(11, 16)}` : '');

      raws.push({
        key: idM[1],
        title: titleM ? titleM[1] : `豆瓣活动 ${idM[1]}`,
        startISO,
        ...(endISO && endISO !== startISO ? { endISO } : {}),
        timeHint,
        venue,
        address: loc,
        url: `https://www.douban.com/event/${idM[1]}/`,
        ...(fee ? { priceRaw: fee } : {}),
        freeKnown: !fee || /免费/.test(fee),
        booking: true,
        tags: [],
        highlights: [
          joinM ? `${joinM[1]} 人报名参加` : '',
          interestM ? `${interestM[1]} 人感兴趣` : '',
          districtPart ? `位于${districtPart}` : '',
        ].filter(Boolean),
        attend: joinM ? Number(joinM[1]) : undefined,
        interest: interestM ? Number(interestM[1]) : undefined,
      });
    }
  }
  return raws;
}

// ── 秀动 ─────────────────────────────────────────────────────────────
async function collectShowstart() {
  const raws = [];
  for (let pageNo = 1; pageNo <= 4; pageNo++) {
    const { text } = await fetchText(
      `https://www.showstart.com/event/list?cityCode=27&pageNo=${pageNo}`,
    );
    const blocks = [...text.matchAll(
      /<a href="\/event\/(\d+)"[^>]*class="show-item item"[^>]*>([\s\S]*?)<\/a>/g,
    )];
    for (const m of blocks) {
      const id = m[1];
      const body = m[2];
      const titleM = body.match(/<div class="title">([\s\S]*?)<\/div>/);
      const priceM = body.match(/<div class="price">[\s\S]*?<span>([\s\S]*?)<\/span>/);
      const timeM = body.match(/<div class="time">时间：([\s\S]*?)<\/div>/);
      const addrM = body.match(/<div class="addr">[\s\S]*?\[武汉\]([\s\S]*?)<\/div>/);
      const artistM = body.match(/<div class="artist">艺人：([\s\S]*?)<\/div>/);

      const title = stripTags(titleM?.[1]);
      const when = stripTags(timeM?.[1]); // 2026/10/20 20:00
      if (/延期|时间待定|取消/.test(title)) continue;
      const dateM = when.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
      if (!dateM) continue;
      const startISO = toISO(+dateM[1], +dateM[2], +dateM[3]);
      const timeHint = `${dateM[4].padStart(2, '0')}:${dateM[5]}`;
      const price = stripTags(priceM?.[1]);
      const venue = stripTags(addrM?.[1]);
      const artist = stripTags(artistM?.[1]);

      raws.push({
        key: id,
        title,
        startISO,
        timeHint,
        venue,
        url: `https://www.showstart.com/event/${id}`,
        ...(price ? { priceRaw: price } : {}),
        freeKnown: /免费/.test(price),
        booking: true,
        tags: [artist ? `艺人：${artist}` : ''],
        highlights: [artist ? `${artist} 出演` : '', '秀动官方票务'].filter(Boolean),
      });
    }
  }
  return raws;
}

// ── 活动行 ───────────────────────────────────────────────────────────
async function collectHuodongxing() {
  // 1) 列表页取活动 id
  const ids = [];
  for (let page = 1; page <= 2; page++) {
    const { text, finalUrl } = await fetchText(
      `https://www.huodongxing.com/events?city=%E6%AD%A6%E6%B1%89&page=${page}`,
    );
    // 触发极验（gt3）时页面会跳验证页
    if (finalUrl.includes('verify.huodongxing.com') || text.includes('verify.huodongxing.com/gt3')) {
      throw new Error('触发活动行验证码（请求过于频繁），请稍后再试，或直接访问活动行官网');
    }
    for (const m of text.matchAll(/\/event\/(\d{13})\?/g)) {
      if (!ids.includes(m[1])) ids.push(m[1]);
    }
  }
  // 2) 详情页并发抓取（页面内嵌 ativityJson）
  const raws = (await pool(ids, 5, async (id) => {
    try {
      const { text } = await fetchText(
        `https://www.huodongxing.com/event/${id}`,
        { timeout: 12000, referer: 'https://www.huodongxing.com/' },
      );
      const jm = text.match(/var ativityJson = (\{[\s\S]*?\})\s*;?\s*var requireParticipant/);
      if (!jm) return null;
      const model = JSON.parse(jm[1]);
      if (!model.City || !model.City.includes('武汉')) return null;
      if (model.Status !== 1) return null;

      const msToISO = (s) => {
        const mm = /\/Date\((\d+)\)\//.exec(s ?? '');
        if (!mm) return undefined;
        const d = new Date(Number(mm[1]));
        return { iso: toISO(d.getFullYear(), d.getMonth() + 1, d.getDate()), hh: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
      };
      const st = msToISO(model.Start);
      const en = msToISO(model.End);
      if (!st) return null;

      const tickets = model.ActivityTickets ?? [];
      const prices = tickets.map((t) => Number(t.Price)).filter((n) => !Number.isNaN(n));
      const minPrice = prices.length ? Math.min(...prices) : null;
      const needApply = tickets.some((t) => t.NeedApply);
      const free = !!model.IsFree || (minPrice !== null && minPrice === 0);
      let priceRaw;
      if (free) priceRaw = needApply ? '免费（需报名审核）' : '免费（需报名）';
      else if (minPrice !== null) priceRaw = `¥${minPrice} 起`;
      else priceRaw = '详见活动页';

      const tags = (model.Tag ?? '').split(/[,，]/).filter(Boolean);
      return {
        key: id,
        title: model.Title,
        startISO: st.iso,
        ...(en && en.iso !== st.iso ? { endISO: en.iso } : {}),
        timeHint: `${st.hh}${en && en.hh !== st.hh ? `–${en.hh}` : ''}`,
        venue: model.Address || '报名后通知',
        url: `https://www.huodongxing.com/event/${id}`,
        priceRaw,
        freeKnown: free,
        booking: true,
        tags,
        highlights: [
          tickets[0]?.Title ? `票种：${tickets[0].Title}` : '',
          needApply ? '报名需主办方审核' : '',
          model.Follows ? `${model.Follows} 人关注主办方` : '',
        ].filter(Boolean),
        follows: model.Follows ? Number(model.Follows) : undefined,
      };
    } catch {
      return null;
    }
  })).filter(Boolean);
  return raws;
}

// ── 和展网（武汉子域）─────────────────────────────────────────────────
// 和展网武汉场馆关键词（不含“武汉”二字的场馆）
const WUHAN_VENUE_HINTS = [
  '光谷科技会展中心',
  '东湖国际会议中心',
  '琴台',
  '洪山体育馆',
  '湖北科技馆',
];

async function collectAndexpo() {
  // 城市子域首页全是已闭幕展会；未来展会在“年-月”子域：
  // https://202611.andexpo.com/?page=2
  const now = new Date();
  const months = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  const raws = [];
  for (const ym of months) {
    for (let page = 1; page <= 3; page++) {
      const url = `https://${ym}.andexpo.com/${page === 1 ? '' : `?page=${page}`}`;
      const { text } = await fetchText(url);
      const itemRe = /<div class="list">([\s\S]*?)(?=<div class="list">|<!-- ?分页|<div class="pages|$)/g;
      let pageCount = 0;
      let m;
      while ((m = itemRe.exec(text))) {
        pageCount++;
        const b = m[1];
        const titleM = b.match(/<a[^>]*title="(?<title>[^"]+)"[^>]*href="(?<url>[^"]*expo_detail_(?:end|no)-\d+\.html)/);
        const venueM = b.match(/<div class="center">\s*<a[^>]*>([^<]+)<\/a>/);
        const timeM = b.match(/<time>([^<]+)<\/time>/);
        const statusM = b.match(/judge[^"]*"[^>]*>([^<]+)<\/span>/);
        if (!timeM || !titleM?.groups) continue;
        if (statusM && /已闭幕/.test(statusM[1])) continue;

        const venue = venueM ? stripTags(venueM[1]) : '';
        const title = titleM.groups.title;
        // 只保留武汉：场馆含武汉 / 场馆命中武汉场馆 / 标题含武汉
        const isWuhan =
          venue.includes('武汉')
          || WUHAN_VENUE_HINTS.some((k) => venue.includes(k))
          || title.includes('武汉');
        if (!isWuhan) continue;

        // 跨月：2026.11.28~30；跨年：2026.12.30~2027.1.2；单日：2026.11.3
        const full = timeM[1].match(
          /(\d{4})\.(\d{1,2})\.(\d{1,2})\s*[~-]\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/,
        );
        const short = timeM[1].match(
          /(\d{4})\.(\d{1,2})\.(\d{1,2})\s*[~-]\s*(\d{1,2})/,
        );
        const single = timeM[1].match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
        const spec = full ?? short ?? single;
        if (!spec) continue;
        const startISO = toISO(+spec[1], +spec[2], +spec[3]);
        let endISO;
        if (full) {
          endISO = toISO(+full[4], +full[5], +full[6]);
        } else if (short) {
          const endDay = +short[4];
          const endMonth = endDay < +short[3] ? +short[2] + 1 : +short[2];
          endISO = toISO(+short[1], endMonth, endDay);
        }
        const href = titleM.groups.url.trim();
        const detailUrl = href.startsWith('http')
          ? href
          : new URL(href, `https://${ym}.andexpo.com/`).href;
        const idM = detailUrl.match(/expo_detail_[^-]+-(\d+)/);
        raws.push({
          key: idM ? idM[1] : `${spec[1]}${spec[2]}${spec[3]}`,
          title,
          startISO,
          ...(endISO && endISO !== startISO ? { endISO } : {}),
          venue: venue || '见展会详情',
          url: detailUrl,
          priceRaw: '详见主办方',
          freeKnown: false,
          booking: true,
          tags: ['展会', '博览会'],
          highlights: [venue ? `展馆：${venue}` : ''].filter(Boolean),
        });
      }
      if (pageCount === 0) break;
    }
  }
  return raws;
}

// ── 武汉文旅局 ───────────────────────────────────────────────────────
const WLJ_BASE = 'http://wlj.wuhan.gov.cn/ztzl_27/zxzt/tty/hddt_1/';
async function collectWlj() {
  const pages = ['index.shtml', 'index_1.shtml'];
  const raws = [];
  for (const p of pages) {
    const { text } = await fetchText(new URL(p, WLJ_BASE).href);
    const blocks = text.split(/<li[\s>]/).slice(1);
    for (const b of blocks) {
      const linkM = b.match(/<h4><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h4>/);
      const sumM = b.match(/<p>([\s\S]*?)<\/p>/);
      const dateM = b.match(/<em>(\d{4})\.(\d{1,2})\.(\d{1,2})<\/em>/);
      if (!linkM || !dateM) continue;
      const title = stripTags(linkM[2]);
      const pubISO = toISO(+dateM[1], +dateM[2], +dateM[3]);
      // 活动日期优先取标题中的“X月X日”，否则用发布日期
      const titleDateM = title.match(/(\d{1,2})月(\d{1,2})日/);
      const startISO = titleDateM
        ? toISO(+dateM[1], +titleDateM[1], +titleDateM[2])
        : pubISO;
      const free = /免费|惠民|公益/.test(title);
      raws.push({
        key: `${dateM[1]}${dateM[2]}${dateM[3]}-${startISO}`,
        title,
        startISO,
        venue: '见官方详情',
        url: new URL(linkM[1], WLJ_BASE).href,
        priceRaw: free ? '免费' : '见官方详情',
        freeKnown: free,
        booking: !free,
        tags: ['官方信息'],
        highlights: [stripTags(sumM?.[1]).slice(0, 40)],
      });
    }
  }
  return raws;
}

// ── 本地宝（热门活动卡片）────────────────────────────────────────────
async function collectBendibao() {
  const { text } = await fetchText('https://wh.bendibao.com/xiuxian/');
  const blocks = text.split(/<div class="single-card">/).slice(1);
  const raws = [];
  for (const b of blocks) {
    const titleM = b.match(/main-header-left-title"[^>]*>([^<]+)<\/div>/);
    const descM = b.match(/<div class="normal-text"[^>]*>([^<]+)<\/div>/);
    const dateM = b.match(/(\d{1,2})\.(\d{1,2})\s*-\s*(\d{1,2})\.(\d{1,2})/)
      || b.match(/(\d{1,2})\.(\d{1,2})</);
    const linkM = b.match(/xqbutton[^>]*href="([^"]+)"/)
      || b.match(/ticket-buttons[^>]*href="([^"]+)"/);
    if (!titleM || !dateM) continue;
    const year = new Date().getFullYear();
    const startISO = toISO(year, +dateM[1], +dateM[2]);
    let endISO;
    if (dateM[3]) {
      const endMonth = +dateM[3] < +dateM[1] ? +dateM[1] + 1 : +dateM[1];
      const endY = endMonth > 12 ? year + 1 : year;
      endISO = toISO(endY, endMonth > 12 ? 1 : endMonth, +dateM[4]);
    }
    const title = titleM[1].trim();
    const desc = descM ? descM[1].trim() : '';
    const free = /免费|惠民|公益/.test(title + desc);
    const url = linkM ? linkM[1] : 'https://wh.bendibao.com/xiuxian/';
    const idM = url.match(/(\d+)\.shtm/);
    raws.push({
      key: idM ? idM[1] : `${dateM[1]}${dateM[2]}`,
      title,
      startISO,
      ...(endISO && endISO !== startISO ? { endISO } : {}),
      venue: '见本地宝攻略',
      url: linkM ? new URL(linkM[1], 'https://wh.bendibao.com/').href : 'https://wh.bendibao.com/xiuxian/',
      priceRaw: free ? '免费' : '见本地宝攻略',
      freeKnown: free,
      booking: true,
      tags: ['本地宝攻略', '抢票'],
      highlights: [desc].filter(Boolean),
    });
  }
  return raws;
}

// ── 大麦（反爬强，仅做状态探测）──────────────────────────────────────
async function collectDamai() {
  // 尝试一次武汉全分类搜索
  const { text } = await fetchText(
    'https://search.damai.cn/search.htm?ctl=&cty=%E6%AD%A6%E6%B1%89&order=1',
    { timeout: 10000, referer: 'https://www.damai.cn/' },
  );
  if (/punish|x5secdata|_____tmd_____/.test(text))
    throw new Error('触发大麦反爬验证（滑块），需浏览器访问');
  const ids = [...text.matchAll(/project\/(\d+)/g)];
  if (!ids.length) throw new Error('搜索页未返回活动数据（JS 动态加载）');
  return [];
}

// ── 总调度 ───────────────────────────────────────────────────────────
const COLLECTORS = {
  douban: collectDouban,
  showstart: collectShowstart,
  huodongxing: collectHuodongxing,
  andexpo: collectAndexpo,
  wlj: collectWlj,
  bendibao: collectBendibao,
  damai: collectDamai,
};

/** 并发抓取全部信源，返回归一化活动 + 各源状态 */
export async function collectAll({ now = new Date() } = {}) {
  const sourceResults = await pool(SOURCE_META, 4, async (meta) => {
    const started = Date.now();
    try {
      const raws = await COLLECTORS[meta.id]();
      return {
        meta,
        ok: true,
        raws,
        count: raws.length,
        ms: Date.now() - started,
      };
    } catch (e) {
      return {
        meta,
        ok: false,
        raws: [],
        count: 0,
        ms: Date.now() - started,
        error: e?.message ? String(e.message).slice(0, 120) : '抓取失败',
      };
    }
  });

  // 归一化 + 合并
  const finalized = [];
  for (const r of sourceResults) {
    for (const raw of r.raws) {
      finalized.push(finalize(raw, r.meta.id, r.meta.name, r.meta.homepage));
    }
  }
  let events = mergeEvents(finalized);

  // 过滤：已结束 / 取消 / 距今超过 90 天
  const todayISO = toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  events = events.filter((e) => {
    const end = e.endDate ?? e.startDate;
    if (end < todayISO) return false;
    if (/取消|延期/.test(e.title)) return false;
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);
    const [y, m, d] = e.startDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt <= in90;
  });
  // 按日期排序：常驻/长档期活动（开始日期已过）按“今天”参与排序
  const effStart = (e) => (e.startDate < todayISO ? todayISO : e.startDate);
  events.sort((a, b) =>
    effStart(a).localeCompare(effStart(b))
    || a.title.localeCompare(b.title));

  const sources = sourceResults.map((r) => ({
    id: r.meta.id,
    name: r.meta.name,
    homepage: r.meta.homepage,
    ok: r.ok,
    count: r.count,
    ms: r.ms,
    ...(r.error ? { error: r.error } : {}),
  }));

  return {
    city: '武汉',
    updatedAt: now.toISOString(),
    sources,
    events,
  };
}
