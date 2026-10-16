// 简讯写作助手 - 剪贴板文件路径读取服务
// 浏览器JS无法获取从资源管理器复制的文件的完整本地路径（安全限制），
// 本服务运行在本机，通过 PowerShell（read-clipboard.ps1）读取 Windows 剪贴板的
// FileDropList，把真实路径返回给前端。
//
// 启动：node clipboard-server.mjs（或双击 启动剪贴板服务.bat）
// 接口：GET http://127.0.0.1:38765/clipboard-files
//
// 仅绑定 127.0.0.1，不对外暴露；无任何第三方依赖，Node 原生模块。

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const PORT = 38765;
const HOST = '127.0.0.1';
const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(here, 'read-clipboard.ps1');

// 返回 [{ path, isDir }]；ps1 每行输出 "路径<Tab>0或1"
function readClipboardPaths() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT],
      { timeout: 4000, windowsHide: true, encoding: 'utf8' },
      (err, stdout) => {
        if (err) {
          resolve([]);
          return;
        }
        const items = stdout
          .split(/\r?\n/)
          .map((line) => line.replace(/^\uFEFF/, ''))
          .map((line) => {
            const tab = line.lastIndexOf('\t');
            if (tab === -1) return null;
            const p = line.slice(0, tab).trim();
            const isDir = line.slice(tab + 1).trim() === '1';
            return p ? { path: p, isDir } : null;
          })
          .filter(Boolean);
        resolve(items);
      }
    );
  });
}

const server = http.createServer(async (req, res) => {
  // CORS：允许本地 dev server 页面访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === '/clipboard-files') {
    try {
      const items = await readClipboardPaths();
      const paths = items.map((i) => i.path);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ items, paths }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items: [], paths: [], error: String(e) }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`[简讯剪贴板服务] 已启动: http://${HOST}:${PORT}`);
  console.log('保持本窗口运行，关闭窗口即停止服务。');
});
