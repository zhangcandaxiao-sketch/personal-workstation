import { useRef, useState, type DragEvent, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListTodo,
  FileText,
  Building2,
  Newspaper,
  PenLine,
  Library,
  BookMarked,
  Briefcase,
  Compass,
  GraduationCap,
  Fish,
  Mail,
  X,
  LogOut,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import CreativeClock from './components/CreativeClock';
import CreativeCalendar from './components/CreativeCalendar';

// 外链模块：后台登录受 iframe 限制，必须在新窗口打开
const INVESTMENT_SYSTEM_URL = 'http://120.25.102.68/index.php/admin/login/index.html';
const XIANYU_WORKBENCH_URL = 'https://ed.weeeg.com/ekadmin/product/product_list';

type IconType = ComponentType<{ className?: string }>;

type ModuleItem = {
  id: string;
  title: string;
  icon: IconType;
  tint: string; // 渐变底色
  to?: string;
  href?: string;
};

type FolderItem = {
  id: string;
  type: 'folder';
  title: string;
  children: ModuleItem[];
};

type Cell = ModuleItem | FolderItem;

const isFolder = (c: Cell): c is FolderItem =>
  'type' in c && c.type === 'folder';

const DEFAULT_MODULES: ModuleItem[] = [
  { id: 'todo', title: '待办', icon: ListTodo, tint: 'from-sky-400 to-blue-600', to: '/todo' },
  { id: 'project-template', title: '申报书模板', icon: FileText, tint: 'from-indigo-400 to-indigo-600', to: '/project-template' },
  { id: 'investment-system', title: '招商系统', icon: Building2, tint: 'from-emerald-400 to-green-600', href: INVESTMENT_SYSTEM_URL },
  { id: 'briefing-writer', title: '简讯写作', icon: Newspaper, tint: 'from-rose-400 to-red-600', to: '/briefing-writer' },
  { id: 'wechat-writer', title: '公众号写作', icon: PenLine, tint: 'from-green-400 to-emerald-600', to: '/wechat-writer' },
  { id: 'knowledge-base', title: '个人知识库', icon: Library, tint: 'from-amber-400 to-orange-500', to: '/knowledge-base' },
  { id: 'feishu-docs', title: '飞书文档', icon: BookMarked, tint: 'from-blue-400 to-blue-600', to: '/feishu-docs' },
  { id: 'job-search', title: '求职追踪', icon: Briefcase, tint: 'from-violet-400 to-purple-600', to: '/job-search' },
  { id: 'weekend-planner', title: '周末去哪', icon: Compass, tint: 'from-cyan-400 to-teal-500', to: '/weekend-planner' },
  { id: 'tencent-sheet', title: '校招征集表', icon: GraduationCap, tint: 'from-blue-400 to-indigo-500', to: '/tencent-sheet' },
  { id: 'xianyu-workbench', title: '闲鱼工作台', icon: Fish, tint: 'from-amber-400 to-yellow-600', href: XIANYU_WORKBENCH_URL },
  { id: 'work-email', title: '单位邮箱', icon: Mail, tint: 'from-red-400 to-rose-600', to: '/work-email' },
];

const STORAGE_KEY = 'home-cells-v2';
const COLS = 4; // 桌面每行图标数
const MERGE_DELAY = 500; // 停顿多久进入收纳

const spring = { type: 'spring', stiffness: 400, damping: 32 } as const;

// 读取本地结构（含文件夹），新增模块追加到末尾
function loadCells(): Cell[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODULES;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return DEFAULT_MODULES;

    const moduleMap = new Map(DEFAULT_MODULES.map((m) => [m.id, m]));
    const cells: Cell[] = [];
    const usedIds = new Set<string>();

    for (const c of data) {
      if (c && c.type === 'folder' && Array.isArray(c.children)) {
        const kids: ModuleItem[] = [];
        for (const k of c.children) {
          const m = k && moduleMap.get(k.id);
          if (m) {
            kids.push(m);
            usedIds.add(m.id);
          }
        }
        if (kids.length > 0) {
          cells.push({
            id: String(c.id || `folder-${Date.now()}`),
            type: 'folder',
            title: String(c.title || '文件夹'),
            children: kids,
          });
        }
      } else if (c && c.id) {
        const m = moduleMap.get(c.id);
        if (m && !usedIds.has(m.id)) {
          cells.push(m);
          usedIds.add(m.id);
        }
      }
    }
    DEFAULT_MODULES.forEach((m) => {
      if (!usedIds.has(m.id)) cells.push(m);
    });
    return cells;
  } catch {
    return DEFAULT_MODULES;
  }
}

function areAdjacent(a: number, b: number): boolean {
  const r1 = Math.floor(a / COLS);
  const c1 = a % COLS;
  const r2 = Math.floor(b / COLS);
  const c2 = b % COLS;
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

// 圆角正方形 App 图标（等比例，名称在下方）
function AppIcon({ m }: { m: ModuleItem }) {
  const Icon = m.icon;
  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <div
        className={`flex aspect-square w-full items-center justify-center rounded-[22%] bg-gradient-to-br ${m.tint} shadow-md shadow-black/15`}
      >
        <Icon className="h-1/2 w-1/2 text-white drop-shadow-sm" />
      </div>
      <span className="w-full truncate text-center text-xs font-medium">
        {m.title}
      </span>
    </div>
  );
}

// 文件夹图标：2×2 等比例缩小的 App 图标（带模块名）
function FolderIcon({ f }: { f: FolderItem }) {
  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <div className="grid aspect-square w-full grid-cols-2 content-center gap-x-[5%] gap-y-[3%] rounded-[22%] bg-muted/70 p-[7%]">
        {f.children.slice(0, 4).map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.id} className="flex flex-col items-center gap-[4%]">
              <div
                className={`flex aspect-square w-[78%] items-center justify-center rounded-[24%] bg-gradient-to-br ${k.tint}`}
              >
                <Icon className="h-1/2 w-1/2 text-white" />
              </div>
              <span className="w-full truncate text-center text-[10px] font-semibold leading-tight text-foreground">
                {k.title}
              </span>
            </div>
          );
        })}
      </div>
      <span className="w-full truncate text-center text-xs font-medium">
        {f.title}
      </span>
    </div>
  );
}

// 模块的跳转外壳
function appLink(m: ModuleItem, children: React.ReactNode) {
  return m.to ? (
    <Link to={m.to} draggable={false} className="block">
      {children}
    </Link>
  ) : (
    <a
      href={m.href}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      className="block"
    >
      {children}
    </a>
  );
}

// 桌面一个格子
function DesktopCell({
  cell,
  index,
  state,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onOpenFolder,
}: {
  cell: Cell;
  index: number;
  state: 'idle' | 'dragging' | 'swap' | 'merge';
  onDragStart: (i: number) => void;
  onDragEnter: (i: number) => void;
  onDrop: (i: number) => void;
  onDragEnd: () => void;
  onOpenFolder: (id: string) => void;
}) {
  const ring =
    state === 'merge'
      ? 'z-10 scale-110 ring-4 ring-primary'
      : state === 'swap'
        ? 'scale-110 ring-4 ring-primary/40'
        : '';
  const dim = state === 'dragging' ? 'opacity-30' : '';

  return (
    <li
      draggable
      data-i={index}
      onDragStart={(e: DragEvent<HTMLLIElement>) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(index);
      }}
      onDragEnter={(e: DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        onDragEnter(index);
      }}
      onDragOver={(e: DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e: DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
      className="list-none p-1"
    >
      <motion.div layout transition={spring} className={`h-full ${ring} ${dim} rounded-[22%]`}>
        {isFolder(cell) ? (
          <button
            type="button"
            onClick={() => onOpenFolder(cell.id)}
            title={
              isFolder(cell)
                ? cell.children.map((k) => k.title).join('、')
                : undefined
            }
            className="block w-full"
          >
            <FolderIcon f={cell} />
          </button>
        ) : (
          appLink(cell, <AppIcon m={cell} />)
        )}
      </motion.div>
    </li>
  );
}

export default function HomePage() {
  const [cells, setCells] = useState<Cell[]>(loadCells);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<'swap' | 'merge'>('swap');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [outZone, setOutZone] = useState(false);
  const [draggingKid, setDraggingKid] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const persist = (next: Cell[]) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  const handleDragStart = (i: number) => {
    clearTimer();
    setDragIndex(i);
    setHoverIndex(null);
    setMode('swap');
  };

  const handleDragEnter = (i: number) => {
    if (dragIndex === null || i === dragIndex) return;
    if (!areAdjacent(dragIndex, i)) return;
    clearTimer();
    setHoverIndex(i);
    setMode('swap');
    if (!isFolder(cells[dragIndex])) {
      timerRef.current = window.setTimeout(() => setMode('merge'), MERGE_DELAY);
    }
  };

  const handleDrop = (i: number) => {
    clearTimer();
    if (dragIndex === null || hoverIndex !== i) return;

    if (mode === 'merge') {
      setCells((prev) => {
        const next = [...prev];
        const dragged = next[dragIndex];
        if (isFolder(dragged)) return prev;
        next.splice(dragIndex, 1);
        const ti = i > dragIndex ? i - 1 : i;
        const target = next[ti];
        if (isFolder(target)) {
          next[ti] = { ...target, children: [...target.children, dragged] };
        } else {
          next[ti] = {
            id: `folder-${Date.now()}`,
            type: 'folder',
            title: '文件夹',
            children: [target, dragged],
          };
        }
        persist(next);
        return next;
      });
    } else {
      setCells((prev) => {
        const next = [...prev];
        [next[dragIndex], next[i]] = [next[i], next[dragIndex]];
        persist(next);
        return next;
      });
    }
  };

  const handleDragEnd = () => {
    clearTimer();
    setDragIndex(null);
    setHoverIndex(null);
    setMode('swap');
  };

  // 文件夹内：拖出到桌面（放到顶层末尾）
  const moveKidOut = (folderId: string, kidId: string) => {
    setCells((prev) => {
      const next: Cell[] = [];
      let moved: ModuleItem | null = null;
      for (const c of prev) {
        if (isFolder(c) && c.id === folderId) {
          moved = c.children.find((k) => k.id === kidId) || null;
          const kids = c.children.filter((k) => k.id !== kidId);
          if (kids.length > 0) next.push({ ...c, children: kids });
        } else {
          next.push(c);
        }
      }
      if (moved) next.push(moved);
      persist(next);
      return next;
    });
  };

  const renameFolder = (folderId: string, title: string) => {
    setCells((prev) => {
      const next = prev.map((c) =>
        isFolder(c) && c.id === folderId ? { ...c, title } : c,
      );
      persist(next);
      return next;
    });
  };

  const openFolder = cells.find(
    (c) => isFolder(c) && c.id === openFolderId,
  ) as FolderItem | undefined;

  const cellState = (i: number) => {
    if (i === dragIndex) return 'dragging';
    if (i === hoverIndex) return mode === 'merge' ? 'merge' : 'swap';
    return 'idle';
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">我的工作台</h1>
      <p className="mt-2 text-muted-foreground">
        拖动图标调整位置；在另一个图标上停顿半秒，松手即收纳进文件夹
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <CreativeClock />
        <div className="lg:col-span-2">
          <CreativeCalendar />
        </div>
      </div>

      {/* 桌面：App 图标网格 */}
      <ul
        className="mt-8 grid list-none gap-x-2 gap-y-5"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          maxWidth: 720,
        }}
      >
        {cells.map((c, i) => (
          <DesktopCell
            key={c.id}
            cell={c}
            index={i}
            state={cellState(i)}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onOpenFolder={setOpenFolderId}
          />
        ))}
      </ul>

      {/* 文件夹：从底部滑出的面板 */}
      <AnimatePresence>
        {openFolder && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpenFolderId(null);
            }}
          >
            <motion.div
              className="w-full max-w-xl rounded-t-3xl border bg-card p-5 shadow-2xl sm:rounded-3xl"
              initial={{ y: 200, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 200, scale: 0.9, opacity: 0 }}
              transition={spring}
            >
              <div className="flex items-center justify-between gap-3">
                <Input
                  value={openFolder.title}
                  onChange={(e) => renameFolder(openFolder.id, e.target.value)}
                  className="h-9 w-44"
                />
                <button
                  type="button"
                  onClick={() => setOpenFolderId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 拖出区：把文件夹里的图标拖到这里即移出 */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setOutZone(true);
                }}
                onDragLeave={() => setOutZone(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOutZone(false);
                  if (draggingKid) {
                    moveKidOut(openFolder.id, draggingKid);
                    setDraggingKid(null);
                  }
                }}
                className={`mt-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm transition-colors ${
                  outZone
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                <LogOut className="h-4 w-4" />
                拖到此处移出文件夹
              </div>

              {/* 文件夹内的 App 图标（等比例完整图标） */}
              <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4">
                {openFolder.children.map((k) => (
                  <div
                    key={k.id}
                    draggable
                    onDragStart={(e: DragEvent<HTMLDivElement>) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingKid(k.id);
                    }}
                    onDragEnd={() => {
                      setDraggingKid(null);
                      setOutZone(false);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {appLink(k, <AppIcon m={k} />)}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
