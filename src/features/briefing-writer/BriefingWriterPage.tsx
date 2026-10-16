import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  Route,
  Sparkles,
  Upload,
  FileText,
  FolderOpen,
  X,
  File,
  CircleAlert,
  Wifi,
  WifiOff,
  ChevronDown,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

// 剪贴板服务（本模块自带，见 server/clipboard-server.mjs）
const CLIPBOARD_SERVER = 'http://127.0.0.1:38765';
// v2：去掉填空字段后，模板只保留「参考文件」动态变量
const TEMPLATE_STORAGE_KEY = 'briefing-writer:template-v2';

// 默认提示词模板（可在页面里编辑，修改会保存在浏览器本地）
const DEFAULT_TEMPLATE = `请使用「简讯写作」skill，根据以下参考文件撰写政务简讯。

{{参考文件}}

请严格按照简讯skill的流程：先苏格拉底式分层提问补全素材，确认口径后再动笔。参考文件路径里的资料请自行读取核实。`;

// 模板里可用的占位符
const TEMPLATE_VARS: { token: string; desc: string }[] = [
  { token: '{{参考文件}}', desc: '参考文件路径整块，无文件自动隐藏' },
];

function loadTemplate(): string {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return saved ?? DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

interface DroppedFile {
  name: string;
  size?: number;
  type: 'file' | 'folder';
}

interface RealPath {
  path: string;
  isDir: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BriefingWriterPage() {
  const [copied, setCopied] = useState(false);

  // 文件相关
  const [dragActive, setDragActive] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [realPaths, setRealPaths] = useState<RealPath[]>([]);
  const [pathInput, setPathInput] = useState('');
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const dragCounter = useRef(0);

  // 提示词模板
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // 首次加载从本地存储读取模板
  useEffect(() => {
    setTemplate(loadTemplate());
  }, []);

  // 检测剪贴板服务是否在线
  useEffect(() => {
    const check = () => {
      fetch(`${CLIPBOARD_SERVER}/health`, { method: 'GET' })
        .then((r) => {
          if (r.ok) setServerOnline(true);
        })
        .catch(() => setServerOnline(false));
    };
    check();
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, []);

  // 递归读取拖拽进来的文件/文件夹
  const readEntry = async (entry: any, results: DroppedFile[]) => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      results.push({ name: file.name, size: file.size, type: 'file' });
    } else if (entry.isDirectory) {
      results.push({ name: entry.name + '/', type: 'folder' });
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        reader.readEntries(resolve, () => resolve([]));
      });
      for (const child of entries) {
        await readEntry(child, results);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);

    const items = e.dataTransfer.items;
    const results: DroppedFile[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        await readEntry(entry, results);
      } else {
        const file = items[i].getAsFile();
        if (file) results.push({ name: file.name, size: file.size, type: 'file' });
      }
    }
    if (results.length > 0) setDroppedFiles((prev) => [...prev, ...results]);
  };

  // 调用本地剪贴板服务，读取真实路径
  const readClipboardPaths = async (): Promise<RealPath[]> => {
    try {
      const resp = await fetch(`${CLIPBOARD_SERVER}/clipboard-files`);
      const data = await resp.json();
      if (data.items && Array.isArray(data.items)) {
        return data.items as RealPath[];
      }
      return [];
    } catch {
      return [];
    }
  };

  // 粘贴文件（Ctrl+V）
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      let hasFile = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          hasFile = true;
          break;
        }
      }
      if (!hasFile) return;

      // 优先通过本地服务拿真实路径
      const clipboardPaths = await readClipboardPaths();
      if (clipboardPaths.length > 0) {
        setRealPaths((prev) => {
          const existing = new Set(prev.map((p) => p.path));
          const merged = [...prev];
          for (const item of clipboardPaths) {
            if (!existing.has(item.path)) merged.push(item);
          }
          return merged;
        });
      } else {
        // 服务没起或没读到，退化为文件名
        const results: DroppedFile[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) results.push({ name: file.name, size: file.size, type: 'file' });
          }
        }
        if (results.length > 0) setDroppedFiles((prev) => [...prev, ...results]);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 手动添加路径
  const addManualPaths = () => {
    const lines = pathInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setRealPaths((prev) => {
      const existing = new Set(prev.map((p) => p.path));
      const merged = [...prev];
      for (const p of lines) {
        if (!existing.has(p)) {
          const noExt = !/\.[^./\\]+$/.test(p);
          merged.push({ path: p, isDir: noExt });
        }
      }
      return merged;
    });
    setPathInput('');
  };

  const removeDropped = (i: number) =>
    setDroppedFiles((prev) => prev.filter((_, idx) => idx !== i));
  const removeReal = (i: number) =>
    setRealPaths((prev) => prev.filter((_, idx) => idx !== i));
  const clearAll = () => {
    setDroppedFiles([]);
    setRealPaths([]);
    setPathInput('');
  };

  // 组装文件部分文本
  const fileBlock = useMemo(() => {
    const blocks: string[] = [];
    if (realPaths.length > 0) {
      blocks.push('【参考文件路径】');
      realPaths.forEach((p) => {
        blocks.push(`- ${p.isDir ? '[文件夹] ' : ''}${p.path}`);
      });
    }
    if (droppedFiles.length > 0) {
      blocks.push('【拖入文件】');
      droppedFiles.forEach((f) => {
        blocks.push(`- ${f.type === 'folder' ? '[文件夹] ' : ''}${f.name}${f.size ? `（${formatSize(f.size)}）` : ''}`);
      });
    }
    return blocks.join('\n');
  }, [realPaths, droppedFiles]);

  // 根据模板渲染最终提示词（唯一动态变量是「参考文件」）
  const prompt = useMemo(() => {
    const map: Record<string, string> = {
      '{{参考文件}}': fileBlock ? `\n${fileBlock}\n` : '',
    };
    const rendered = template.replace(/\{\{[^}]+\}\}/g, (match) =>
      Object.prototype.hasOwnProperty.call(map, match) ? map[match] : ''
    );
    return rendered.replace(/\n{3,}/g, '\n\n').trim();
  }, [template, fileBlock]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // 保存模板到本地
  const saveTemplate = () => {
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
      setTemplateSaved(true);
      window.setTimeout(() => setTemplateSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  // 恢复默认模板
  const resetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, DEFAULT_TEMPLATE);
    } catch {
      // ignore
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回工作台
      </Link>

      <div className="mt-4">
        <h1 className="text-xl font-semibold">简讯写作</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          收集参考文件，生成提示词，复制到豆包工作里用
        </p>
      </div>

      {/* 写作流程 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">写作流程</CardTitle>
              <CardDescription>豆包工作里的简讯skill会自动完成提问和写作</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              '准备好活动素材（笔记、记录、资料）',
              '从资源管理器复制文件，到本页 Ctrl+V 自动识别路径',
              '复制下方提示词，粘贴到豆包工作对话框',
              '豆包会用简讯skill，先提问补全素材，再生成简讯',
              '拿到初稿后自己过一遍事实，改完定稿',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </div>
                <p className="text-sm leading-6">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 参考文件 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              参考文件
            </CardTitle>
            {/* 服务状态 */}
            {serverOnline === true ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">
                <Wifi className="h-3 w-3" />
                路径识别已就绪
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                <WifiOff className="h-3 w-3" />
                路径服务未启动
              </span>
            )}
          </div>
          <CardDescription>
            从资源管理器复制文件后，在本页 Ctrl+V；也可拖拽文件到下方
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 服务未启动提示 */}
          {serverOnline === false && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">自动识别路径需要启动本地剪贴板服务</p>
                  <p className="mt-1">双击运行模块文件夹里的启动脚本：</p>
                  <code className="mt-1 block rounded bg-white/70 px-2 py-1 text-[11px]">
                    src\features\briefing-writer\server\启动剪贴板服务.bat
                  </code>
                  <p className="mt-1">启动后保持黑窗口开着即可，路径会自动识别。</p>
                </div>
              </div>
            </div>
          )}

          {/* 拖拽区域 */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              dragCounter.current++;
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              dragCounter.current--;
              if (dragCounter.current <= 0) setDragActive(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <Upload className={`h-8 w-8 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="mt-2 text-sm font-medium">
              {dragActive ? '松开鼠标放入文件' : '拖拽文件/文件夹到这里'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              资源管理器复制后 Ctrl+V，可自动识别完整路径
            </p>
          </div>

          {/* 手动添加路径 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              或手动粘贴路径（每行一个，资源管理器 Shift+右键 → 复制为路径）
            </Label>
            <div className="flex gap-2">
              <Textarea
                value={pathInput}
                rows={2}
                placeholder={'D:\\zhuomian\\资料\\活动记录.docx'}
                onChange={(e) => setPathInput(e.target.value)}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" className="shrink-0 self-end" onClick={addManualPaths}>
                添加
              </Button>
            </div>
          </div>

          {/* 已添加列表 */}
          {(realPaths.length > 0 || droppedFiles.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  已添加 {realPaths.length + droppedFiles.length} 项
                </p>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="h-3 w-3" />
                  清空
                </Button>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {realPaths.map((p, i) => (
                  <div key={`r-${i}`} className="flex items-center gap-2 text-xs">
                    {p.isDir ? (
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    ) : (
                      <File className="h-3.5 w-3.5 shrink-0 text-green-600" />
                    )}
                    <span className="flex-1 truncate font-mono">{p.path}</span>
                    <button onClick={() => removeReal(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {droppedFiles.map((f, i) => (
                  <div key={`d-${i}`} className="flex items-center gap-2 text-xs">
                    {f.type === 'folder' ? (
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    )}
                    <span className="flex-1 truncate">{f.name}</span>
                    {f.size && <span className="text-muted-foreground">{formatSize(f.size)}</span>}
                    <button onClick={() => removeDropped(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提示词 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              最终提示词
            </CardTitle>
            <Button size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  复制
                </>
              )}
            </Button>
          </div>
          <CardDescription>根据模板和参考文件自动生成</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            rows={14}
            readOnly
            className="font-mono text-xs leading-relaxed bg-muted/40"
          />

          {/* 模板编辑（折叠） */}
          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setShowTemplateEditor((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40"
            >
              <span className="text-xs font-medium">编辑提示词模板</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showTemplateEditor ? 'rotate-180' : ''}`}
              />
            </button>
            {showTemplateEditor && (
              <div className="space-y-3 border-t p-3">
                <p className="text-xs text-muted-foreground">
                  修改后点「保存」，会一直保留在这台浏览器；占位符会自动替换为参考文件路径。
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      title={v.desc}
                      onClick={() => setTemplate((t) => t + v.token)}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary hover:bg-muted/70"
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={template}
                  rows={10}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveTemplate}>
                    {templateSaved ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        已保存
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        保存模板
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetTemplate}>
                    <RotateCcw className="h-4 w-4" />
                    恢复默认
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
