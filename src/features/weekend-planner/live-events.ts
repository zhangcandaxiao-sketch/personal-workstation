// 实时活动抓取：调用 Vite dev server 同源接口 /api/events/refresh
// 浏览器直接抓取豆瓣/大麦等会被 CORS 拦截，抓取在 Node 中间件中完成。
import type { WEvent } from './events.data';

export interface LiveSourceStatus {
  id: string;
  name: string;
  homepage: string;
  ok: boolean;
  count: number;
  ms: number;
  error?: string;
}

export interface LiveEventsPayload {
  city: string;
  updatedAt: string;
  sources: LiveSourceStatus[];
  events: WEvent[];
  cached?: boolean;
}

const STORAGE_KEY = 'weekend-planner:live-v1';
// 本地缓存最长有效期：超过后不再自动恢复为实时数据
const STORAGE_MAX_AGE = 6 * 60 * 60 * 1000;

/** 调用后端接口刷新全部信源 */
export async function refreshLiveEvents(force = true): Promise<LiveEventsPayload> {
  const res = await fetch(`/api/events/refresh?force=${force ? 1 : 0}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      /* ignore */
    }
    if (res.status === 404) {
      throw new Error(
        '刷新接口仅在本地开发环境（npm run dev）可用，当前为构建产物',
      );
    }
    throw new Error(detail || `刷新失败（HTTP ${res.status}）`);
  }
  const body = (await res.json()) as LiveEventsPayload;
  if (!Array.isArray(body.events)) throw new Error('刷新接口返回数据格式异常');
  return body;
}

/** 持久化最近一次抓取结果 */
export function saveLivePayload(payload: LiveEventsPayload): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), payload }),
    );
  } catch {
    /* 隐私模式 / 配额不足，忽略 */
  }
}

/** 读取本地缓存（过期返回 null） */
export function loadSavedLive(): {
  payload: LiveEventsPayload;
  savedAt: number;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      payload: LiveEventsPayload;
    };
    if (!parsed?.payload || !Array.isArray(parsed.payload.events)) return null;
    if (Date.now() - parsed.savedAt > STORAGE_MAX_AGE) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedLive(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
