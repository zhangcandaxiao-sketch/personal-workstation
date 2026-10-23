// Vite 本地开发插件：为「周末去哪里」提供活动抓取接口
// 仅在 dev server 暴露（同源，无 CORS 问题）：
//   GET /api/events/refresh       实时抓取全部信源（2 分钟内存缓存，?force=1 跳过）
//   GET /api/events/sources       只回信源清单
import { collectAll, SOURCE_META } from './sources.mjs';

const CACHE_TTL = 2 * 60 * 1000;
let cache = { at: 0, promise: null };

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(payload);
}

export function weekendEventsPlugin() {
  return {
    name: 'weekend-events',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/events/sources', (req, res) => {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
        sendJson(res, 200, { sources: SOURCE_META });
      });

      server.middlewares.use('/api/events/refresh', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
        try {
          const force = new URL(req.url || '/', 'http://local').searchParams.get('force') === '1';
          const now = Date.now();
          if (!force && cache.promise && now - cache.at < CACHE_TTL) {
            const result = await cache.promise;
            return sendJson(res, 200, { ...result, cached: true });
          }
          const promise = collectAll();
          cache = { at: now, promise };
          const result = await promise;
          return sendJson(res, 200, { ...result, cached: false });
        } catch (e) {
          return sendJson(res, 500, {
            error: e?.message ? String(e.message).slice(0, 200) : 'refresh failed',
          });
        }
      });
    },
  };
}

export default weekendEventsPlugin;
