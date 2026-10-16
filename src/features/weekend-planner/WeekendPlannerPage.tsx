import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Cpu,
  Route,
  Layers,
  Banknote,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  EVENTS,
  eventScore,
  type CategoryId,
  type SlotId,
  type WEvent,
} from './events.data';
import {
  buildPlan,
  getWeekends,
  weekendShortLabel,
  weekendLongLabel,
  planStats,
  isAvailable,
  pickAlternative,
  DEFAULT_PREFERENCES,
  type Preferences,
  type Weekend,
  type PlanDay,
  type PlanItem,
} from './planner';
import EventCard, { type WeekendBadge } from './components/EventCard';
import ItineraryDay from './components/ItineraryDay';

const PLANNER_SLOTS: SlotId[] = ['morning', 'afternoon', 'evening'];

interface SlotManual {
  eventId: string | null;
  rejected: string[];
}
const slotKey = (dayISO: string, slot: SlotId) => `${dayISO}|${slot}`;

// ── 小型切换按钮 ───────────────────────────────────────────────────────
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

const PREF_CHIPS: { key: keyof Preferences; label: string }[] = [
  { key: 'ai', label: 'AI 优先' },
  { key: 'fun', label: '趣味体验' },
  { key: 'learning', label: '学习科普' },
  { key: 'freeOnly', label: '仅免费' },
  { key: 'easyPace', label: '轻松节奏' },
];

const CAT_FILTER: { id: CategoryId | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'ai', label: 'AI 科技' },
  { id: 'science', label: '科普研学' },
  { id: 'experience', label: '沉浸体验' },
  { id: 'market', label: '市集展会' },
  { id: 'exhibition', label: '艺术展览' },
  { id: 'show', label: '演出音乐' },
];

type Scope = 'all' | 'this' | 'next' | 'two-weeks';

const SCOPE_FILTER: { id: Scope; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'this', label: '本周末' },
  { id: 'next', label: '下周末' },
  { id: 'two-weeks', label: '近两周' },
];

const WEEKDAY_CHAR = ['日', '一', '二', '三', '四', '五', '六'];
const dateShort = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// 活动是否落在某周末（周六或周日）
const onWeekend = (w: Weekend, e: WEvent): boolean =>
  isAvailable(e, w.satISO) || isAvailable(e, w.sunISO);

export default function WeekendPlannerPage() {
  const weekends = useMemo(() => getWeekends(3), []);
  const [selected, setSelected] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [catFilter, setCatFilter] = useState<CategoryId | 'all'>('all');
  const [scope, setScope] = useState<Scope>('two-weeks');
  // 手动「换一个」覆盖：key = 日期|时段
  const [manual, setManual] = useState<Record<string, SlotManual>>({});

  const weekend = weekends[selected];
  const plan = useMemo(
    () => buildPlan(weekend, prefs, EVENTS),
    [weekend, prefs],
  );

  // 叠加手动覆盖后的最终行程
  const displayPlan = useMemo(() => {
    const apply = (day: PlanDay): PlanDay => {
      const items: PlanItem[] = [];
      for (const slot of PLANNER_SLOTS) {
        const m = manual[slotKey(day.dateISO, slot)];
        let ev: WEvent | undefined;
        if (m) {
          if (m.eventId) ev = EVENTS.find((e) => e.id === m.eventId);
        } else {
          ev = day.items.find((i) => i.slot === slot)?.event;
        }
        if (ev) items.push({ event: ev, slot });
      }
      return { ...day, items };
    };
    return { sat: apply(plan.sat), sun: apply(plan.sun) };
  }, [plan, manual]);

  const stats = useMemo(() => planStats(displayPlan), [displayPlan]);

  // 手动覆盖的时段（用于显示「恢复」）
  const manualKeys = useMemo(
    () => new Set(Object.keys(manual)),
    [manual],
  );

  /** 换一个：按评分顺序取该时段下一个合格活动 */
  const swapSlot = (dayISO: string, slot: SlotId) => {
    const day = dayISO === displayPlan.sat.dateISO
      ? displayPlan.sat
      : displayPlan.sun;
    const otherDay = day === displayPlan.sat ? displayPlan.sun : displayPlan.sat;
    const current = day.items.find((i) => i.slot === slot)?.event;
    const other = [
      ...day.items.filter((i) => i.slot !== slot),
      ...otherDay.items,
    ];
    const usedCategories = [...new Set(other.map((i) => i.event.category))];

    // 同天紧接前一活动的区域（动线）
    const idx = PLANNER_SLOTS.indexOf(slot);
    let lastDistrict: string | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      const prev = day.items.find((it) => it.slot === PLANNER_SLOTS[i]);
      if (prev) {
        lastDistrict = prev.event.district;
        break;
      }
    }

    const key = slotKey(dayISO, slot);
    const rejected = [
      ...(manual[key]?.rejected ?? []),
      ...(current ? [current.id] : []),
    ];
    const alt = pickAlternative(
      {
        dayISO,
        slot,
        occupiedOther: other.map((i) => i.event.id),
        rejected,
        usedCategories,
        lastDistrict,
      },
      EVENTS,
      prefs,
    );
    setManual((prev) => ({
      ...prev,
      [key]: { eventId: alt ? alt.id : null, rejected },
    }));
  };

  /** 恢复该时段为自动推荐 */
  const resetSlot = (dayISO: string, slot: SlotId) => {
    setManual((prev) => {
      const next = { ...prev };
      delete next[slotKey(dayISO, slot)];
      return next;
    });
  };

  const togglePref = (key: keyof Preferences) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  // 近期 AI 大会（含工作日，按日期）
  const aiEvents = useMemo(
    () =>
      EVENTS.filter((e) => e.category === 'ai')
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [],
  );

  // 活动合集：时间范围（scope） + 分类（catFilter），按周末与相关度排序
  const listEvents = useMemo(() => {
    const list = EVENTS.filter((e) => {
      if (catFilter !== 'all' && e.category !== catFilter) return false;
      const thisW = onWeekend(weekends[0], e);
      const nextW = onWeekend(weekends[1], e);
      if (scope === 'this') return thisW;
      if (scope === 'next') return nextW;
      if (scope === 'two-weeks') return thisW || nextW;
      return true;
    });

    const firstDate = (e: WEvent): string => {
      const thisW = onWeekend(weekends[0], e);
      const nextW = onWeekend(weekends[1], e);
      if ((scope === 'this' || scope === 'two-weeks') && thisW)
        return weekends[0].satISO;
      if ((scope === 'next' || scope === 'two-weeks') && nextW)
        return weekends[1].satISO;
      return e.startDate;
    };
    const rel = (e: WEvent) => eventScore(e);
    return list.sort(
      (a, b) => firstDate(a).localeCompare(firstDate(b)) || rel(b) - rel(a),
    );
  }, [catFilter, scope, weekends]);

  // 卡片角标：本周末 / 下周末 / 两周皆可
  const weekendBadge = (e: WEvent): WeekendBadge | undefined => {
    const thisW = onWeekend(weekends[0], e);
    const nextW = onWeekend(weekends[1], e);
    if (thisW && nextW)
      return { text: '两周皆可', cls: 'bg-emerald-500/10 text-emerald-700' };
    if (thisW) return { text: '本周末', cls: 'bg-amber-500/10 text-amber-700' };
    if (nextW) return { text: '下周末', cls: 'bg-blue-500/10 text-blue-700' };
    return undefined;
  };

  // 动线
  const routeLine = (items: { event: { district: string } }[]) => {
    const ds = items
      .map((i) => i.event.district)
      .filter((d) => d !== '待通知');
    const uniq = [...new Set(ds)];
    return uniq.length ? uniq.join(' → ') : '待安排';
  };

  const tabName = ['本周末', '下周末', '第三周'];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回工作台
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">周末去哪里 · 武汉</h1>
          <p className="text-xs text-muted-foreground">
            汇集近期有娱乐、学习、教育意义的活动，为你规划周末两天
          </p>
        </div>
      </div>

      {/* 控制区 */}
      <Card className="mt-5">
        <CardContent className="flex flex-col gap-4 p-5">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              选择周末
            </p>
            <div className="flex flex-wrap gap-2">
              {weekends.map((w, i) => (
                <Chip
                  key={w.satISO}
                  active={selected === i}
                  onClick={() => {
                    setSelected(i);
                    setManual({});
                  }}
                >
                  {tabName[i]} · {weekendShortLabel(w)}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {weekendLongLabel(weekend)}
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              我的偏好（行程实时更新）
            </p>
            <div className="flex flex-wrap gap-2">
              {PREF_CHIPS.map((c) => (
                <Chip
                  key={c.key}
                  active={prefs[c.key]}
                  onClick={() => togglePref(c.key)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 近期 AI 大会提醒（含工作日） */}
      <Card className="mt-4 border-violet-200 bg-violet-50/40">
        <CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
            <Cpu className="h-4 w-4" />
            近期 AI 大会 / 沙龙（多数在工作日，别错过）
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {aiEvents.map((e) => {
              const wd = new Date(`${e.startDate}T00:00:00`).getDay();
              const isWeekend = wd === 0 || wd === 6;
              return (
                <a
                  key={e.id}
                  href={e.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] text-violet-700 hover:bg-violet-100"
                >
                  <span className="font-medium">{dateShort(e.startDate)}</span>
                  <span className="text-muted-foreground">
                    周{WEEKDAY_CHAR[wd]}
                    {isWeekend ? '' : '（工作日）'}
                  </span>
                  {e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 行程统计 */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          value={`${stats.count}`}
          label="安排项数"
        />
        <StatCard
          icon={<Cpu className="h-4 w-4" />}
          value={`${stats.aiCount}`}
          label="AI / 科技项"
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          value={`${stats.freeCount}`}
          label="免费项"
        />
        <StatCard
          icon={<Banknote className="h-4 w-4" />}
          value={`¥${stats.paidEstimate} 起`}
          label="付费起步估算"
        />
      </div>

      {/* 周末行程 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ItineraryDay
          day={displayPlan.sat}
          manualKeys={manualKeys}
          onSwap={swapSlot}
          onReset={resetSlot}
        />
        <ItineraryDay
          day={displayPlan.sun}
          manualKeys={manualKeys}
          onSwap={swapSlot}
          onReset={resetSlot}
        />
      </div>

      {/* 动线提示 */}
      <div className="mt-3 flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:flex-row sm:gap-6">
        <span className="inline-flex items-center gap-1.5">
          <Route className="h-4 w-4" />
          周六动线：{routeLine(displayPlan.sat.items)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Route className="h-4 w-4" />
          周日动线：{routeLine(displayPlan.sun.items)}
        </span>
        <span className="sm:ml-auto">
          提示：同城同区尽量安排在同一天，跨江出行预留 40–60 分钟
        </span>
      </div>

      {/* 活动合集 */}
      <h2 className="mt-8 text-lg font-semibold">活动合集</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">时间</span>
        {SCOPE_FILTER.map((s) => (
          <Chip
            key={s.id}
            active={scope === s.id}
            onClick={() => setScope(s.id)}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">分类</span>
        {CAT_FILTER.map((c) => (
          <Chip
            key={c.id}
            active={catFilter === c.id}
            onClick={() => setCatFilter(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listEvents.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            weekendBadge={weekendBadge(e)}
          />
        ))}
      </div>

      {listEvents.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          该筛选条件下暂无活动
        </p>
      )}

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        活动时间与票务均来自官方/平台公开信息（已附信源），临近出行请以主办方最新公告为准
      </p>
    </main>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
