import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getDayKind, holidayName, key, yearNote } from './holidays2026';

// 周一为一周开始
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 渲染一个月的 7 列格子（紧凑模式用于年视图） */
function MonthGrid({
  year,
  month0,
  todayKey,
  compact = false,
}: {
  year: number;
  month0: number;
  todayKey: string;
  compact?: boolean;
}) {
  // 周一为一周开始：把 getDay()（周日=0）转成 周一=0
  const jsFirst = new Date(year, month0, 1).getDay(); // 0=周日
  const firstDayWeekday = (jsFirst + 6) % 7; // 周一=0
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-0.5 text-center">
      {!compact &&
        WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] text-muted-foreground">
            {w}
          </div>
        ))}
      {cells.map((d, i) => {
        if (d === null) return <div key={i} />;
        const k = key(year, month0, d);
        const kind = getDayKind(year, month0, d);
        const isToday = k === todayKey;
        const holi = holidayName(year, month0, d);

        let color = '';
        if (kind === 'workday') {
          color = 'bg-blue-50 text-blue-700';
        } else {
          color = 'bg-emerald-50 text-emerald-700';
        }
        if (isToday) {
          color =
            kind === 'workday'
              ? 'bg-blue-600 text-white font-semibold'
              : 'bg-emerald-600 text-white font-semibold';
        }

        if (compact) {
          return (
            <div
              key={i}
              title={holi ?? undefined}
              className={`flex h-5 items-center justify-center rounded text-[10px] tabular-nums ${color}`}
            >
              {d}
            </div>
          );
        }

        // 月视图：日期 + 节日名
        return (
          <div
            key={i}
            title={holi ?? undefined}
            className={`flex h-9 flex-col items-center justify-center rounded-md tabular-nums ${color}`}
          >
            <span className="text-xs leading-tight">{d}</span>
            {holi && (
              <span
                className={`text-[9px] leading-tight ${isToday ? 'text-white/90' : 'opacity-75'}`}
              >
                {holi}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 创意日历：可翻页，月视图 / 全年视图切换
 * 蓝色=工作日，绿色=周末/法定节假日（格子内标注节日名）
 */
export default function CreativeCalendar() {
  const now = new Date();
  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-based
  const [mode, setMode] = useState<'month' | 'year'>('month');

  const goPrev = () => {
    if (mode === 'year') {
      setViewYear((y) => y - 1);
    } else if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (mode === 'year') {
      setViewYear((y) => y + 1);
    } else if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  return (
    <Card className="flex h-full flex-col p-5">
      {/* 头部：翻页 + 标题 + 视图切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover-elevate"
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-[120px] items-center justify-center gap-1.5 text-center text-base font-semibold">
            <span>{mode === 'year' ? `${viewYear}年` : `${viewYear}年${viewMonth + 1}月`}</span>
            {yearNote(viewYear) && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-700">
                {yearNote(viewYear)}
              </span>
            )}
          </div>
          <button
            onClick={goNext}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover-elevate"
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover-elevate"
          >
            回到今天
          </button>
          <button
            onClick={() => setMode('month')}
            className={`flex h-7 w-7 items-center justify-center rounded-md ${mode === 'month' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'} hover-elevate`}
            aria-label="月视图"
            title="月视图"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMode('year')}
            className={`flex h-7 w-7 items-center justify-center rounded-md ${mode === 'year' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'} hover-elevate`}
            aria-label="全年视图"
            title="全年视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-50 ring-1 ring-blue-200" />
          工作日
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-50 ring-1 ring-emerald-200" />
          周末 / 节假日
        </span>
      </div>

      {/* 内容区 */}
      <div className="mt-3 flex-1">
        {mode === 'month' ? (
          <MonthGrid year={viewYear} month0={viewMonth} todayKey={todayKey} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {Array.from({ length: 12 }, (_, m) => (
              <div key={m}>
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {m + 1}月
                </div>
                <MonthGrid year={viewYear} month0={m} todayKey={todayKey} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
