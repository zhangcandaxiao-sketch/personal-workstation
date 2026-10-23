import {
  type CategoryId,
  type SlotId,
  type WEvent,
  eventScore,
} from './events.data';

// ── 周末日期计算 ───────────────────────────────────────────────────────
export interface Weekend {
  satISO: string;
  sunISO: string;
  sat: Date;
  sun: Date;
}

export const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const shortLabel = (d: Date): string =>
  `${d.getMonth() + 1}/${d.getDate()}`;

/** 计算从 from 起的若干个周末（周六 + 周日）。今天若为周六/周日，本周末=当前。 */
export function getWeekends(count: number, from: Date = new Date()): Weekend[] {
  const wd = from.getDay();
  const sat = new Date(from);
  if (wd === 6) {
    // 周六
    sat.setDate(from.getDate());
  } else if (wd === 0) {
    // 周日：本周末的周六是昨天
    sat.setDate(from.getDate() - 1);
  } else {
    sat.setDate(from.getDate() + (6 - wd));
  }

  const out: Weekend[] = [];
  for (let i = 0; i < count; i++) {
    const s = new Date(sat);
    s.setDate(sat.getDate() + 7 * i);
    const u = new Date(s);
    u.setDate(s.getDate() + 1);
    out.push({ satISO: toISO(s), sunISO: toISO(u), sat: s, sun: u });
  }
  return out;
}

export const weekendShortLabel = (w: Weekend): string =>
  `${shortLabel(w.sat)}–${shortLabel(w.sun)}`;

export const weekendLongLabel = (w: Weekend): string => {
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${fmt(w.sat)}（周六）– ${fmt(w.sun)}（周日）`;
};

// ── 可用性 ────────────────────────────────────────────────────────────
export function isAvailable(ev: WEvent, iso: string): boolean {
  const end = ev.endDate ?? ev.startDate;
  if (iso < ev.startDate || iso > end) return false;
  if (ev.closedWeekdays?.length) {
    const wd = new Date(`${iso}T00:00`).getDay();
    if (ev.closedWeekdays.includes(wd)) return false;
  }
  return true;
}

// ── 偏好与行程 ─────────────────────────────────────────────────────────
export interface Preferences {
  ai: boolean;
  fun: boolean;
  learning: boolean;
  freeOnly: boolean;
  easyPace: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  ai: true,
  fun: true,
  learning: true,
  freeOnly: false,
  easyPace: false,
};

export interface PlanItem {
  event: WEvent;
  slot: SlotId;
}

export interface PlanDay {
  dateISO: string;
  weekday: string;
  dateLabel: string;
  items: PlanItem[];
}

export interface Plan {
  sat: PlanDay;
  sun: PlanDay;
}

const SLOTS: SlotId[] = ['morning', 'afternoon', 'evening'];

/**
 * 活动综合分（五分制）。
 * 核心 = 三维度平均分（占主导，推荐按分数排序）；
 * 其余为温和的平局区分项：偏好倾斜、类别新鲜感、时段合理性、同区动线。
 */
const scoreFor = (
  ev: WEvent,
  prefs: Preferences,
  slot: SlotId,
  usedCategories: Set<CategoryId>,
  lastDistrict: string | null,
): number => {
  let s = eventScore(ev); // 五分制平均分（核心，占主导）
  // 偏好倾斜（温和，不盖过平均分）
  if (prefs.ai && ev.category === 'ai') s += 0.6;
  if (prefs.fun) s += 0.1 * (ev.scores.fun - 3);
  if (prefs.learning) s += 0.1 * (ev.scores.education - 3);
  if (prefs.freeOnly && ev.free) s += 0.4;
  // 类别新鲜感（同周末尽量不重复同类；仅作平局区分）
  if (!usedCategories.has(ev.category)) s += 0.5;
  // 时段合理性
  s += slotCategoryBonus(ev, slot);
  // 同区动线（紧接的上一活动同区，少跑路）
  if (lastDistrict && lastDistrict !== '待通知' && ev.district === lastDistrict)
    s += 0.4;
  return s;
};

/** 时段对不同类别的加成/减分，让活动落在合理时段（温和，不盖过平均分） */
const slotCategoryBonus = (ev: WEvent, slot: SlotId): number => {
  const c = ev.category;
  if (slot === 'evening') {
    if (c === 'experience' || c === 'show') return 0.9;
    if (c === 'market') return 0.6;
    if (c === 'exhibition' || c === 'science') return -0.6;
  } else if (slot === 'morning') {
    if (c === 'market') return 0.6;
    if (c === 'exhibition') return 0.4;
    if (c === 'science') return 0.3;
  } else {
    if (c === 'ai') return 0.6;
    if (c === 'exhibition' || c === 'market') return 0.4;
    if (c === 'science') return 0.3;
  }
  return 0;
};

const WEEKDAY_LABEL: Record<number, string> = {
  0: '周日',
  6: '周六',
};

const dateLabel = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

/**
 * 贪心编排：每天按 早/午/晚 依次选最优。
 * 优先级：
 *  1) 非兜底活动（真实展会/演出/体验），按综合分排序；
 *  2) 仅当没有任何非兜底活动时，才安排兜底（博物馆 / 科技馆）。
 */
export function buildPlan(
  weekend: Weekend,
  prefs: Preferences,
  events: WEvent[],
): Plan {
  const used = new Set<string>();
  const usedCategories = new Set<CategoryId>();

  const dayDefs: { dateISO: string; weekday: string }[] = [
    { dateISO: weekend.satISO, weekday: WEEKDAY_LABEL[6] },
    { dateISO: weekend.sunISO, weekday: WEEKDAY_LABEL[0] },
  ];

  const maxPerDay = prefs.easyPace ? 2 : 3;

  const days = dayDefs.map((def) => {
    const pool = events.filter((e) => isAvailable(e, def.dateISO));
    const items: PlanItem[] = [];
    let lastDistrict: string | null = null;

    for (const slot of SLOTS) {
      if (items.length >= maxPerDay) break;

      const eligible = pool.filter(
        (ev) =>
          !used.has(ev.id) &&
          ev.slots.includes(slot) &&
          (!prefs.freeOnly || ev.free),
      );

      const bestIn = (list: WEvent[]) => {
        let best: WEvent | null = null;
        let bestScore = -Infinity;
        for (const ev of list) {
          const s = scoreFor(
            ev,
            prefs,
            slot,
            usedCategories,
            lastDistrict,
          );
          if (s > bestScore) {
            bestScore = s;
            best = ev;
          }
        }
        return { best, bestScore };
      };

      // 合格门槛（五分制）
      const threshold = slot === 'evening' ? 3.2 : 3.0;
      const fallbackThreshold = 2.6;

      // 1) 先在非兜底活动中挑最优
      let choice = bestIn(eligible.filter((e) => !e.fallback));
      // 2) 仅当没有任何非兜底活动时，才考虑兜底（博物馆 / 科技馆）
      if (!choice.best) {
        choice = bestIn(eligible.filter((e) => !!e.fallback));
      }

      const best = choice.best;
      const bestScore = choice.bestScore;
      const pass = best &&
        bestScore >= (best.fallback ? fallbackThreshold : threshold);

      if (best && pass) {
        used.add(best.id);
        usedCategories.add(best.category);
        lastDistrict = best.district;
        items.push({ event: best, slot });
      }
    }

    return {
      dateISO: def.dateISO,
      weekday: def.weekday,
      dateLabel: dateLabel(def.dateISO),
      items,
    };
  });

  return { sat: days[0], sun: days[1] };
}

// ── 换一个（手动替换某时段）──────────────────────────────────────────
export interface SlotContext {
  dayISO: string;
  slot: SlotId;
  /** 已在其他时段占用的活动 id（避免重复安排） */
  occupiedOther: string[];
  /** 该时段已被「换一个」拒绝的活动 id（含被替换的当前项） */
  rejected: string[];
  /** 其他时段已用的类别（用于类别新鲜感） */
  usedCategories: CategoryId[];
  /** 同天紧接前一活动的区域（用于动线，无则 null） */
  lastDistrict: string | null;
}

const SLOT_MIN = { evening: 3.2, day: 3.0 };
const FALLBACK_MIN = 2.6;

/**
 * 为某一天的某个时段，按评分顺序列出可选活动（非兜底优先，再按分数降序）。
 */
export function rankCandidates(
  dayISO: string,
  slot: SlotId,
  allEvents: WEvent[],
  prefs: Preferences,
  exclude: Set<string>,
  usedCategories: Set<CategoryId>,
  lastDistrict: string | null,
): { event: WEvent; score: number }[] {
  const out: { event: WEvent; score: number }[] = [];
  for (const ev of allEvents) {
    if (!isAvailable(ev, dayISO)) continue;
    if (!ev.slots.includes(slot)) continue;
    if (exclude.has(ev.id)) continue;
    if (prefs.freeOnly && !ev.free) continue;
    out.push({
      event: ev,
      score: scoreFor(ev, prefs, slot, usedCategories, lastDistrict),
    });
  }
  // 非兜底排前，再按综合分降序
  out.sort(
    (a, b) =>
      Number(!!a.event.fallback) - Number(!!b.event.fallback) ||
      b.score - a.score,
  );
  return out;
}

/**
 * 「换一个」：排除已占用 / 已拒绝活动后，按评分顺序取下一个合格项。
 * 非兜底活动优先；非兜底不够分则留空（不安排博物馆）；
 * 只有当完全没有非兜底活动时，才用兜底（博物馆 / 科技馆）。
 */
export function pickAlternative(
  ctx: SlotContext,
  allEvents: WEvent[],
  prefs: Preferences,
): WEvent | null {
  const exclude = new Set([...ctx.occupiedOther, ...ctx.rejected]);
  const ranked = rankCandidates(
    ctx.dayISO,
    ctx.slot,
    allEvents,
    prefs,
    exclude,
    new Set(ctx.usedCategories),
    ctx.lastDistrict,
  );

  const nonFb = ranked.filter((r) => !r.event.fallback);
  const min = ctx.slot === 'evening' ? SLOT_MIN.evening : SLOT_MIN.day;
  if (nonFb.length > 0) {
    return nonFb[0].score >= min ? nonFb[0].event : null;
  }
  const fb = ranked.find((r) => r.event.fallback);
  return fb && fb.score >= FALLBACK_MIN ? fb.event : null;
}

// ── 行程统计 ─────────────────────────────────────────────────────────
export interface PlanStats {
  count: number;
  aiCount: number;
  freeCount: number;
  paidEstimate: number; // 付费活动的低价估算（取票价数字下限）
}

export function planStats(plan: Plan): PlanStats {
  const all = [...plan.sat.items, ...plan.sun.items];
  let paidEstimate = 0;
  let aiCount = 0;
  let freeCount = 0;
  for (const item of all) {
    const e = item.event;
    if (e.category === 'ai') aiCount += 1;
    if (e.free) freeCount += 1;
    else {
      const m = e.price.match(/\d+/);
      if (m) paidEstimate += Number(m[0]);
    }
  }
  return { count: all.length, aiCount, freeCount, paidEstimate };
}
