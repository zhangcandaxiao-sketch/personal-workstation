import { useEffect, useState } from 'react';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 作息时间
const WORK_START = { h: 8, m: 30 };
const LUNCH_TIME = { h: 11, m: 30 };
const AFTERNOON_START = { h: 14, m: 0 };
const OFF_WORK = { h: 17, m: 30 };

// 每日一语：按当年第几天取一句
const DAILY_QUOTES = [
  '专注当下，把一件事做到极致。',
  '慢慢来，比较快。',
  '今天的努力，是明天的底气。',
  '把大目标拆成小任务，逐个击破。',
  '复盘比忙碌更重要。',
  '保持好奇，持续学习。',
  '身体是革命的本钱，记得起来走走。',
  '好记性不如烂笔头，随手记下来。',
  '先完成，再完美。',
  '工作是做不完的，效率比时长重要。',
];

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function msUntil(now: Date, h: number, m: number) {
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return t.getTime() - now.getTime();
}

/** 根据当前时间返回该显示的倒计时标签和值 */
function getStage(now: Date) {
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;

  const workStartMins = WORK_START.h * 60 + WORK_START.m;
  const lunchMins = LUNCH_TIME.h * 60 + LUNCH_TIME.m;
  const afternoonMins = AFTERNOON_START.h * 60 + AFTERNOON_START.m;
  const offMins = OFF_WORK.h * 60 + OFF_WORK.m;

  if (mins < workStartMins) {
    return { label: '距上班', value: formatCountdown(msUntil(now, WORK_START.h, WORK_START.m)) };
  }
  if (mins < lunchMins) {
    return { label: '距午餐', value: formatCountdown(msUntil(now, LUNCH_TIME.h, LUNCH_TIME.m)) };
  }
  if (mins < afternoonMins) {
    return { label: '距下午上班', value: formatCountdown(msUntil(now, AFTERNOON_START.h, AFTERNOON_START.m)) };
  }
  if (mins < offMins) {
    return { label: '距下班', value: formatCountdown(msUntil(now, OFF_WORK.h, OFF_WORK.m)) };
  }
  return { label: '今日已收工', value: '好好休息' };
}

/** 按当年第几天取一句 */
function getDailyQuote(now: Date) {
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/**
 * 创意时钟：大号时间 + 每日一语 + 单个倒计时（按时段自动切换）
 */
export default function CreativeClock() {
  const now = useNow();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const stage = getStage(now);
  const quote = getDailyQuote(now);

  return (
    <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-primary via-[hsl(222_75%_55%)] to-[hsl(232_80%_65%)] p-5 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex h-full flex-col justify-between gap-3">
        <div>
          <div className="text-xs text-white/75">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 · {WEEKDAYS[now.getDay()]}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-semibold leading-none tabular-nums sm:text-5xl">
              {pad(h)}:{pad(m)}
            </span>
            <span className="font-mono text-lg leading-none text-white/70 tabular-nums">
              {pad(s)}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
          <div className="text-[11px] text-white/80">每日一语</div>
          <div className="mt-0.5 text-sm text-white/95">{quote}</div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
          <span className="text-[11px] text-white/80">{stage.label}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">{stage.value}</span>
        </div>
      </div>
    </div>
  );
}
