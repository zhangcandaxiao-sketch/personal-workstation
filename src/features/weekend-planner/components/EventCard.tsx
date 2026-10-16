import { MapPin, Clock, ExternalLink, Ticket, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  CATEGORY_META,
  eventScore,
  type WEvent,
} from '../events.data';

const fmtDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const dateRangeText = (ev: WEvent): string => {
  const base = fmtDate(ev.startDate);
  if (!ev.endDate || ev.endDate === ev.startDate) return base;
  return `${base} – ${fmtDate(ev.endDate)}`;
};

export interface WeekendBadge {
  text: string;
  cls: string;
}

function ScoreRow({
  label,
  value,
  bar,
}: {
  label: string;
  value: number;
  bar: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-[10px] text-muted-foreground">
        {label}
      </span>
      <div className="flex h-1.5 flex-1 gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-full flex-1 rounded-sm ${i < value ? bar : 'bg-border/60'}`}
          />
        ))}
      </div>
      <span className="w-3 shrink-0 text-right text-[10px] font-medium">
        {value}
      </span>
    </div>
  );
}

export default function EventCard({
  event,
  weekendBadge,
}: {
  event: WEvent;
  weekendBadge?: WeekendBadge;
}) {
  const meta = CATEGORY_META[event.category];
  const Icon = meta.icon;
  const avg = eventScore(event);
  const avgCls =
    avg >= 4
      ? 'bg-emerald-500/10 text-emerald-700'
      : avg >= 3
        ? 'bg-amber-500/10 text-amber-700'
        : 'bg-muted text-muted-foreground';

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col items-end gap-1">
            {weekendBadge && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${weekendBadge.cls}`}
              >
                {weekendBadge.text}
              </span>
            )}
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${avgCls}`}
              >
                <Star className="h-3 w-3 fill-current" />
                {avg.toFixed(1)}
              </span>
              <Badge className={`${meta.badge} border-0`}>{meta.label}</Badge>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {dateRangeText(event)}
              {event.timeHint ? ` · ${event.timeHint}` : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {event.district} · {event.venue}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 shrink-0" />
              <span className={event.free ? 'font-medium text-emerald-600' : ''}>
                {event.price}
              </span>
            </span>
          </div>
        </div>

        {/* 三维度评分（重要 / 有趣 / 教育，五分制） */}
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2">
          <ScoreRow label="重要" value={event.scores.importance} bar="bg-violet-400" />
          <ScoreRow label="有趣" value={event.scores.fun} bar="bg-emerald-400" />
          <ScoreRow label="教育" value={event.scores.education} bar="bg-blue-400" />
        </div>

        <ul className="space-y-1 text-xs leading-relaxed">
          {event.highlights.slice(0, 2).map((h) => (
            <li key={h} className="flex gap-1.5 text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
          <a
            href={event.source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[11px] text-primary hover:underline"
          >
            信源
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
