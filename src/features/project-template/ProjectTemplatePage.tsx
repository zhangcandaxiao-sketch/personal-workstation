import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Sparkles,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { launchLocal, type LaunchResult } from '@/lib/launchLocal';
import {
  buildDeclarationPrompt,
  DEFAULT_TEMPLATE,
  type PromptTemplate,
} from './prompt';

// 与 launcher/files.json 中的白名单条目一一对应
const ITEM_ID = 'project-declaration-template';
const FILE_NAME = '模板  项目申报.docx';
const FILE_PATH = 'D:\\zhuomian\\项目申报\\有效项目信息\\模板  项目申报.docx';
const INSTALL_COMMAND =
  'powershell -NoProfile -ExecutionPolicy Bypass -File "D:\\zhuomian\\个人工作站\\my-workbench\\launcher\\install.ps1"';

// 持久化 key
const PROMPT_DRAFT_KEY = 'project-template:prompt-draft';
const TEMPLATE_KEY = 'project-template:prompt-template';

function loadPromptDraft(): string {
  try {
    return localStorage.getItem(PROMPT_DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
}

function loadTemplate(): PromptTemplate {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return DEFAULT_TEMPLATE;
    const parsed = JSON.parse(raw) as Partial<PromptTemplate>;
    // 合并默认值，防止旧版本缺字段
    return { ...DEFAULT_TEMPLATE, ...parsed };
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

/** 模板各编辑块的元信息，驱动可视化表单渲染 */
const TEMPLATE_FIELDS: {
  key: keyof PromptTemplate;
  label: string;
  rows: number;
  hint?: string;
}[] = [
  {
    key: 'role',
    label: '角色设定与任务说明',
    rows: 4,
    hint: '用 {company} 占位公司名，生成时自动替换为实际公司全称',
  },
  { key: 'fixedInfo', label: '表格固定信息', rows: 2 },
  { key: 'section1', label: '栏目一 · 投资企业基本信息', rows: 3 },
  { key: 'section2', label: '栏目二 · 项目概况', rows: 4 },
  { key: 'section3', label: '栏目三 · 投资方需求', rows: 3 },
  { key: 'section4', label: '栏目四 · 项目方联系人', rows: 2 },
  { key: 'section5', label: '栏目五 · 备注', rows: 2 },
  { key: 'requirements', label: '写作要求', rows: 5 },
  { key: 'examples', label: '示例参考（仅供把握口径）', rows: 6 },
];

type LaunchState =
  | { status: 'idle' }
  | { status: 'opening' }
  | { status: 'opened' }
  | { status: 'failed'; result: LaunchResult };

export default function ProjectTemplatePage() {
  const [state, setState] = useState<LaunchState>({ status: 'idle' });
  const [copied, setCopied] = useState<'path' | 'cmd' | null>(null);

  const [company, setCompany] = useState('');
  const [prompt, setPrompt] = useState<string>(loadPromptDraft);
  const [promptCopied, setPromptCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // 模板可视化编辑状态
  const [template, setTemplate] = useState<PromptTemplate>(loadTemplate);
  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const handleOpen = async () => {
    setState({ status: 'opening' });
    const result = await launchLocal(ITEM_ID);
    setState(result.ok ? { status: 'opened' } : { status: 'failed', result });
  };

  const handleGenerate = () => {
    const name = company.trim();
    if (!name) return;
    setPrompt(buildDeclarationPrompt(name, template));
    setPromptCopied(false);
    setSavedAt(null);
  };

  const handleSavePrompt = () => {
    try {
      localStorage.setItem(PROMPT_DRAFT_KEY, prompt);
      setSavedAt(
        new Date().toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      // ignore
    }
  };

  const handleResetPrompt = () => {
    try {
      localStorage.removeItem(PROMPT_DRAFT_KEY);
    } catch {
      // ignore
    }
    setPrompt('');
    setPromptCopied(false);
    setSavedAt(null);
  };

  const updateTemplateField = (key: keyof PromptTemplate, value: string) => {
    setTemplate((prev) => ({ ...prev, [key]: value }));
    setTemplateSavedAt(null);
  };

  const handleSaveTemplate = () => {
    try {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
      setTemplateSavedAt(
        new Date().toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      // ignore
    }
  };

  const handleResetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
    try {
      localStorage.removeItem(TEMPLATE_KEY);
    } catch {
      // ignore
    }
    setTemplateSavedAt(null);
  };

  const copyText = async (text: string, tag: 'path' | 'cmd' | 'prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      if (tag === 'prompt') {
        setPromptCopied(true);
        window.setTimeout(() => setPromptCopied(false), 1500);
      } else {
        setCopied(tag);
        window.setTimeout(() => setCopied(null), 1500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回工作台
      </Link>

      <h1 className="mt-4 text-xl font-semibold">项目申报书模板</h1>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{FILE_NAME}</CardTitle>
                <CardDescription>WPS 文字文档 · 项目信息提报模板</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              WPS 打开
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">文件位置</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <code className="break-all text-xs">{FILE_PATH}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => copyText(FILE_PATH, 'path')}
                aria-label="复制文件路径"
              >
                {copied === 'path' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button size="lg" onClick={handleOpen} disabled={state.status === 'opening'}>
            {state.status === 'opening' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            用 WPS 打开模板
          </Button>

          {state.status === 'opened' && (
            <p className="text-sm text-green-600">已唤起 WPS 打开模板，如未弹出窗口请查看任务栏。</p>
          )}

          {state.status === 'failed' && state.result.via === 'dev-api' && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">打开失败</p>
              <p className="mt-1 break-all">{state.result.error}</p>
              <p className="mt-1 text-xs">
                请确认 dev server 正在运行、文件未被移动，且 launcher/files.json 配置正确。
              </p>
            </div>
          )}

          {state.status === 'failed' && state.result.via === 'protocol' && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">未能自动打开，可能是首次使用、尚未注册启动协议。</p>
              <p className="mt-1">
                在本工程 launcher 文件夹中打开终端，运行一次下面的命令（无需管理员权限）：
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded bg-white px-2 py-1.5">
                <code className="break-all text-xs">{INSTALL_COMMAND}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyText(INSTALL_COMMAND, 'cmd')}
                  aria-label="复制安装命令"
                >
                  {copied === 'cmd' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs">
                注册后刷新本页，再点击「用 WPS 打开模板」即可。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">提报表内容生成助手</CardTitle>
              <CardDescription>
                输入公司名称，按栏目生成提示词；模板可分块可视化编辑并保存
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 模板可视化编辑（折叠） */}
          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setShowTemplateEditor((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                编辑提示词模板
                {templateSavedAt && (
                  <span className="text-xs font-normal text-muted-foreground">
                    （已保存 {templateSavedAt}）
                  </span>
                )}
              </span>
              {showTemplateEditor ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showTemplateEditor && (
              <div className="space-y-4 border-t px-3 py-4">
                {TEMPLATE_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label className="text-xs font-medium">{f.label}</Label>
                      {f.hint && (
                        <span className="text-[10px] text-muted-foreground">{f.hint}</span>
                      )}
                    </div>
                    <Textarea
                      value={template[f.key]}
                      rows={f.rows}
                      onChange={(e) => updateTemplateField(f.key, e.target.value)}
                      className="font-mono text-xs leading-relaxed"
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between gap-3 border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    保存后，下次「生成提示词」将使用你修改后的模板
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handleResetTemplate}>
                      <RotateCcw className="h-4 w-4" />
                      恢复默认
                    </Button>
                    <Button size="sm" onClick={handleSaveTemplate}>
                      <Save className="h-4 w-4" />
                      保存模板
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 公司名输入 + 生成 */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate();
              }}
              placeholder="输入公司全称，例如：精锋微控（黄石）有限公司"
              className="flex-1"
            />
            <Button onClick={handleGenerate} disabled={!company.trim()} className="shrink-0">
              <Sparkles className="h-4 w-4" />
              生成提示词
            </Button>
          </div>

          {/* 生成结果预览 */}
          {prompt && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {savedAt
                    ? `已保存草稿（${savedAt}），下次打开自动恢复`
                    : '生成结果可直接微调，改完点「保存修改」'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={handleResetPrompt}
                  >
                    <RotateCcw className="h-4 w-4" />
                    清空
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={handleSavePrompt}
                  >
                    <Save className="h-4 w-4" />
                    保存修改
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copyText(prompt, 'prompt')}
                  >
                    {promptCopied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        复制提示词
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Textarea
                value={prompt}
                rows={18}
                className="font-mono text-xs leading-relaxed"
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setSavedAt(null);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
