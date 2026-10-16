import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Tag,
  Clock,
  Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'knowledge-base:items';

// 预置分类（可随时在添加时输入新分类）
const PRESET_CATEGORIES = ['技术学习', '金融投资', '写作创作', '工作备忘'];

// 示例占位条目：展示知识库形态，内容待定，可随时修改或删除
const SAMPLE_ITEMS: KnowledgeItem[] = [
  {
    id: 'sample-1',
    title: 'Python 基础笔记',
    category: '技术学习',
    summary: '元组、布尔值、f-string 等基础语法要点，随学习进度补充。',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    title: '国债逆回购要点',
    category: '金融投资',
    summary: '华宝证券操作入口、佣金费率与「一拖六」开户规则备忘。',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sample-3',
    title: '文案风格偏好',
    category: '写作创作',
    summary: '政务公文严谨正式，营销文案真诚有文采，按场景切换。',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function loadItems(): KnowledgeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_ITEMS;
  } catch {
    return SAMPLE_ITEMS;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>(loadItems);
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  // 新增表单状态
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [open, setOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>(PRESET_CATEGORIES);
    items.forEach((i) => set.add(i.category));
    return ['全部', ...Array.from(set)];
  }, [items]);

  const visibleItems = useMemo(
    () =>
      activeCategory === '全部'
        ? items
        : items.filter((i) => i.category === activeCategory),
    [items, activeCategory],
  );

  const persist = (next: KnowledgeItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* 存储不可用时静默降级为内存态 */
    }
  };

  const addItem = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const now = new Date().toISOString();
    const next: KnowledgeItem[] = [
      {
        id: `${Date.now()}`,
        title: trimmedTitle,
        category: category.trim() || '未分类',
        summary: summary.trim(),
        createdAt: now,
        updatedAt: now,
      },
      ...items,
    ];
    persist(next);
    setTitle('');
    setCategory('');
    setSummary('');
    setOpen(false);
  };

  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  return (
    <main className="p-8">
      {/* 顶栏：返回 + 标题 + 添加 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="-ml-2 mt-1">
            <Link to="/" aria-label="返回工作台">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Library className="h-6 w-6 text-primary" />
              个人知识库
            </h1>
            <p className="mt-1 text-muted-foreground">
              沉淀自己的笔记、要点与资料，随用随记。内容待定，可自行增删。
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加知识
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加知识</DialogTitle>
              <DialogDescription>
                记下一条新的知识要点，之后可随时修改或删除。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="kb-title">标题</Label>
                <Input
                  id="kb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：Vite 配置备忘"
                  autoFocus
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kb-category">分类</Label>
                <Input
                  id="kb-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="输入分类，或点选下方预设"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kb-summary">内容 / 摘要</Label>
                <Textarea
                  id="kb-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="简要记录要点，可留空"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button onClick={addItem} disabled={!title.trim()}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 分类筛选 */}
      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={
              activeCategory === c
                ? 'rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground'
                : 'rounded-full border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary'
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* 知识卡片网格 */}
      {visibleItems.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">这个分类还没有知识</p>
              <p className="mt-1 text-sm text-muted-foreground">
                点击右上角「添加知识」，开始沉淀第一笔。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <Card key={item.id} className="hover-elevate flex h-full flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary">
                    <Tag className="mr-1 h-3 w-3" />
                    {item.category}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`删除「${item.title}」`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <CardTitle className="mt-3 text-base leading-snug">
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                <CardDescription className="line-clamp-3 whitespace-pre-wrap">
                  {item.summary || '（暂无摘要）'}
                </CardDescription>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  更新于 {formatDate(item.updatedAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
