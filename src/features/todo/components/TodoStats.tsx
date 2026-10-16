import { Progress } from '@/components/ui/progress';

interface TodoStatsProps {
  total: number;
  done: number;
}

// 可视化组件：展示待办完成情况（完成数、完成率、进度条）
export default function TodoStats({ total, done }: TodoStatsProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const remaining = total - done;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">完成进度</p>
          <p className="mt-1 text-2xl font-semibold">
            {done}
            <span className="text-base font-normal text-muted-foreground"> / {total} 项</span>
          </p>
        </div>
        <p className="text-3xl font-bold text-primary">{percent}%</p>
      </div>

      <Progress value={percent} className="mt-3 h-2" />

      <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
        <span>待办中 {remaining} 项</span>
        <span>已完成 {done} 项</span>
      </div>
    </div>
  );
}
