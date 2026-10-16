import {
  Sunrise,
  Sun,
  MoonStar,
  MapPin,
  ExternalLink,
  Bell,
  Star,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import {
  CATEGORY_META,
  SLOT_LABEL,
  eventScore,
  type SlotId,
} from '../events.data';
import type { PlanDay } from '../planner';

const SLOT_META: Record<
  SlotId,
  { icon: typeof Sunrise; wrap: string; rail: string }
> = {
  morning: {
    icon: Sunrise,
    wrap: 'bg-amber-500/10 text-amber-600',
    rail: 'bg-amber-400',
  },
  afternoon: {
    icon: Sun,
    wrap: 'bg-orange-500/10 text-orange-600',
    rail: 'bg-orange-400',
  },
  evening: {
    icon: MoonStar,
    wrap: 'bg-indigo-500/10 text-indigo-600',
    rail: 'bg-indigo-400',
  },
};

const SLOT_ORDER: SlotId[] = ['morning', 'afternoon', 'evening'];

export default function ItineraryDay({
  day,
  manualKeys,
  onSwap,
  onReset,
}: {
  day: PlanDay;
  manualKeys: Set<string>;
  onSwap: (dayISO: string, slot: SlotId) => void;
  onReset: (dayISO: string, slot: SlotId) => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="flex items-baseline gap-2 border-b px-5 py-4">
        <h3 className="text-base font-semibold">{day.weekday}</h3>
        <span className="text-sm text-muted-foreground">{day.dateLabel}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {day.items.length} 项安排
        </span>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        {SLOT_ORDER.map((slot) => {
          const item = day.items.find((i) => i.slot === slot);
          const sm = SLOT_META[slot];
          const SlotIcon = sm.icon;
          const isManual = manualKeys.has(`${day.dateISO}|${slot}`);

          return (
            <div key={slot} className="flex gap-3">
              {/* 左侧时段 */}
              <div className="flex w-12 shrink-0 flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${sm.wrap}`}
                >
                  <SlotIcon className="h-4 w-4" />
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {SLOT_LABEL[slot]}
                </span>
              </div>

              {/* 内容 */}
              <div className="min-w-0 flex-1 pb-1">
                {item ? (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                          CATEGORY_META[item.event.category].iconWrap
                        }`}
                      >
                        {(() => {
                          const I = CATEGORY_META[item.event.category].icon;
                          return <I className="h-4 w-4" />;
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {item.event.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.event.timeHint}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        <Star className="h-3 w-3 fill-current" />
                        {eventScore(item.event).toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {item.event.district} · {item.event.venue}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={`text-[11px] font-medium ${
                          item.event.free ? 'text-emerald-600' : 'text-foreground'
                        }`}
                      >
                        {item.event.price}
                      </span>
                      {item.event.booking && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                          <Bell className="h-3 w-3" />
                          需提前预约/购票
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        {isManual && (
                          <button
                            type="button"
                            onClick={() => onReset(day.dateISO, slot)}
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            <Undo2 className="h-3 w-3" />
                            恢复
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSwap(day.dateISO, slot)}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          换一个
                        </button>
                        <a
                          href={item.event.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          信源
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">
                      {isManual
                        ? '没有更多合适活动，已留空'
                        : '空闲 · 可自由安排或休整'}
                    </span>
                    <div className="flex items-center gap-2">
                      {isManual && (
                        <button
                          type="button"
                          onClick={() => onReset(day.dateISO, slot)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <Undo2 className="h-3 w-3" />
                          恢复
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSwap(day.dateISO, slot)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <RefreshCw className="h-3 w-3" />
                        换一个
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
