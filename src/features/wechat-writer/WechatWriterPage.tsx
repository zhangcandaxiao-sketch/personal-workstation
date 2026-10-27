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
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ARTICLE_TYPES,
  LENGTH_OPTIONS,
  DEFAULT_TEMPLATE,
  TEMPLATE_VARS,
  PUBLISH_CHECKLIST,
  WRITING_STEPS,
} from './prompt';

// 复用简讯写作模块的本地剪贴板服务（server/clipboard-server.mjs，端口 38765）
const CLIPBOARD_SERVER = 'http://127.0.0.1:38765';
const TEMPLATE_STORAGE_KEY = 'wechat-writer:template-v1';

function loadTemplate(): string {
  try {
    return localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? DEFAULT_TEMPLATE;
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

export default function WechatWriterPage() {
  const [copied, setCopied] = useState(false);

  // 文章信息
  const [topic, setTopic] = useState('');
  const [typeId, setTypeId] = useState(ARTICLE_TYPES[0].id);
  const [reader, setReader] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [lengthId, setLengthId] = useState(LENGTH_OPTIONS[1].id);

  // 文件相关
  const [dragActive, setDragActive] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [realPaths, setRealPaths] = useState<RealPath[]>([]);
  const [pathInput, setPathInput] = useState('');
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const dragCounter = useRef(0);

  // 提示词模板（惰性初始化，直接从本地存储读取）
  const [template, setTemplate] = useState<string>(() => loadTemplate());
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // 核查清单
  const [showChecklist, setShowChecklist] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

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

  const selectedType = ARTICLE_TYPES.find((t) => t.id === typeId) ?? ARTICLE_TYPES[0];
  const selectedLength = LENGTH_OPTIONS.find((l) => l.id === lengthId) ?? LENGTH_OPTIONS[0];

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

  // 组装素材部分文本
  const fileBlock = useMemo(() => {
    const blocks: string[] = [];
    if (realPaths.length > 0) {
      blocks.push('【素材文件路径】');
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

  // 核心要点整理成列表
  const pointsBlock = useMemo(() => {
    const lines = keyPoints
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return '';
    return lines.map((l) => `- ${l}`).join('\n');
  }, [keyPoints]);

  // 根据模板渲染最终提示词
  const prompt = useMemo(() => {
    const map: Record<string, string> = {
      '{{选题}}': topic.trim(),
      '{{文章类型}}': selectedType.label,
      '{{类型结构}}': selectedType.structure,
      '{{目标读者}}': reader.trim(),
      '{{核心要点}}': pointsBlock,
      '{{参考文件}}': fileBlock ? `\n${fileBlock}\n` : '',
      '{{字数}}': selectedLength.label,
    };
    const rendered = template.replace(/\{\{[^}]+\}\}/g, (match) =>
      Object.prototype.hasOwnProperty.call(map, match) ? map[match] : ''
    );
    return rendered.replace(/\n{3,}/g, '\n\n').trim();
  }, [template, topic, selectedType, reader, pointsBlock, fileBlock, selectedLength]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const saveTemplate = () => {
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
      setTemplateSaved(true);
      window.setTimeout(() => setTemplateSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  const resetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, DEFAULT_TEMPLATE);
    } catch {
      // ignore
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
        <h1 className="text-xl font-semibold">公众号写作</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          填好选题信息、收集素材，生成提示词，复制到豆包工作里用
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
              <CardDescription>先大纲后全文，成稿后逐项核查再发布</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {WRITING_STEPS.map((step, i) => (
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

      {/* 文章信息 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            文章信息
          </CardTitle>
          <CardDescription>想清楚这几件事，文章就成功了一半</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 选题 */}
          <div className="space-y-1.5">
            <Label className="text-xs">选题 / 主题</Label>
            <Input
              value={topic}
              placeholder="例如：普通人如何用 AI 工作流每天省 2 小时"
              onChange={(e) => setTopic(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* 文章类型 */}
          <div className="space-y-1.5">
            <Label className="text-xs">文章类型</Label>
            <div className="flex flex-wrap gap-1.5">
              {ARTICLE_TYPES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant={t.id === typeId ? 'default' : 'outline'}
                  onClick={() => setTypeId(t.id)}
                  className="h-7 text-xs"
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{selectedType.structure}</p>
          </div>

          {/* 目标读者 */}
          <div className="space-y-1.5">
            <Label className="text-xs">目标读者</Label>
            <Input
              value={reader}
              placeholder="例如：想用 AI 提效但不会编程的上班族"
              onChange={(e) => setReader(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* 核心要点 */}
          <div className="space-y-1.5">
            <Label className="text-xs">核心要点（每行一条，想让读者记住的东西）</Label>
            <Textarea
              value={keyPoints}
              rows={4}
              placeholder={'AI 工作流是什么，跟普通用 AI 聊天的区别\n3 个可以直接抄的工作流场景\n上手第一步做什么'}
              onChange={(e) => setKeyPoints(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* 篇幅 */}
          <div className="space-y-1.5">
            <Label className="text-xs">篇幅</Label>
            <div className="flex flex-wrap gap-1.5">
              {LENGTH_OPTIONS.map((l) => (
                <Button
                  key={l.id}
                  type="button"
                  size="sm"
                  variant={l.id === lengthId ? 'default' : 'outline'}
                  onClick={() => setLengthId(l.id)}
                  className="h-7 text-xs"
                >
                  {l.label}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{selectedLength.desc}</p>
          </div>
        </CardContent>
      </Card>

      {/* 参考素材 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              参考素材
            </CardTitle>
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
          {serverOnline === false && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">自动识别路径需要启动本地剪贴板服务（与简讯写作共用）</p>
                  <p className="mt-1">双击运行简讯写作模块文件夹里的启动脚本：</p>
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
                placeholder={'D:\\zhuomian\\资料\\素材.docx'}
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

      {/* 最终提示词 */}
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
          <CardDescription>根据表单和素材自动生成</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            rows={16}
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
                  修改后点「保存」，会一直保留在这台浏览器；占位符会自动替换为表单内容。
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
                  rows={12}
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

      {/* 成稿核查清单 */}
      <Card className="mt-6">
        <CardHeader>
          <button
            type="button"
            onClick={() => setShowChecklist((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                成稿核查清单
                <span className="text-xs font-normal text-muted-foreground">
                  已完成 {checkedIds.size}/{PUBLISH_CHECKLIST.length}
                </span>
              </CardTitle>
              <CardDescription className="mt-1">初稿出来后逐项检查，全部勾完再发布</CardDescription>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${showChecklist ? 'rotate-180' : ''}`}
            />
          </button>
        </CardHeader>
        {showChecklist && (
          <CardContent className="space-y-1 border-t pt-4">
            {PUBLISH_CHECKLIST.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/40"
              >
                <button
                  type="button"
                  onClick={() => toggleCheck(item.id)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checkedIds.has(item.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {checkedIds.has(item.id) && <Check className="h-3 w-3" />}
                </button>
                <span className="text-xs leading-5">
                  <span className={checkedIds.has(item.id) ? 'text-muted-foreground line-through' : ''}>
                    {item.text}
                  </span>
                  {item.hint && (
                    <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
                  )}
                </span>
              </label>
            ))}
          </CardContent>
        )}
      </Card>
    </main>
  );
}
