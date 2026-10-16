// 用 files.json 指定的程序（如 WPS）打开本机白名单文件：
// - 本地 dev：走 Vite 启动器接口 /api/local/launch（launcher/vite-plugin-local-launcher.mjs），
//   内嵌浏览器会拦截自定义协议，dev 接口最可靠；
// - 生产构建：走 workbench:// 自定义协议（需先运行 launcher/install.ps1 注册）。
// 两条通道都只接受 launcher/files.json 白名单中的 id。
function triggerProtocol(id: string): void {
  const url = `workbench://open/${encodeURIComponent(id)}`;
  const link = document.createElement('a');
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// 外部程序被唤起时浏览器窗口会失焦；超时仍未失焦，通常是协议尚未注册（浏览器拦截了跳转）。
function waitLaunchResult(timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('blur', handleBlur);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const handleBlur = () => finish(true);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    window.addEventListener('blur', handleBlur);
  });
}

export interface LaunchResult {
  ok: boolean;
  via: 'dev-api' | 'protocol';
  error?: string;
}

export async function launchLocal(id: string): Promise<LaunchResult> {
  if (import.meta.env.DEV) {
    try {
      const res = await fetch(`/api/local/launch?id=${encodeURIComponent(id)}`);
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && data.ok) return { ok: true, via: 'dev-api' };
      return {
        ok: false,
        via: 'dev-api',
        error: data.error || `请求失败（HTTP ${res.status}）`,
      };
    } catch (e) {
      return {
        ok: false,
        via: 'dev-api',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  triggerProtocol(id);
  const opened = await waitLaunchResult();
  return opened
    ? { ok: true, via: 'protocol' }
    : { ok: false, via: 'protocol', error: '协议未注册或被浏览器拦截' };
}
