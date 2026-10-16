// Vite dev-server-only plugin: let the workbench page open whitelisted local
// files with their registered app (e.g. WPS). Embedded browsers often block
// workbench:// protocol navigation, so in local dev we route through the dev
// server itself.
//
//   GET /api/local/launch?id=<id>
//
// Only ids listed in ./files.json are accepted. Never enabled in builds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(here, 'files.json');

function loadItem(id) {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return (cfg.files || []).find((f) => f.id === id) || null;
}

export function localLauncherPlugin() {
  return {
    name: 'local-launcher',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/local/launch', (req, res) => {
        const reply = (code, payload) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        };
        try {
          const url = new URL(req.url || '/', 'http://127.0.0.1');
          const id = url.searchParams.get('id') || '';

          if (!/^[A-Za-z0-9._-]+$/.test(id)) {
            return reply(400, { ok: false, error: '参数不合法' });
          }
          const item = loadItem(id);
          if (!item) return reply(404, { ok: false, error: 'id 不在白名单中' });
          if (!fs.existsSync(item.path)) {
            return reply(404, { ok: false, error: `文件不存在：${item.path}` });
          }

          if (item.app) {
            const args = [...(item.appArgs || []), item.path];
            spawn(item.app, args, {
              detached: true,
              stdio: 'ignore',
              windowsHide: true,
            }).unref();
          } else {
            spawn('cmd.exe', ['/c', 'start', '', item.path], {
              detached: true,
              stdio: 'ignore',
              windowsHide: true,
            }).unref();
          }
          return reply(200, { ok: true, id });
        } catch (e) {
          return reply(500, { ok: false, error: String((e && e.message) || e) });
        }
      });
    },
  };
}
