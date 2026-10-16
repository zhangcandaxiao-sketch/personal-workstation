import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase } from 'lucide-react';

export default function JobSearchPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回工作台
      </Link>

      <div className="mt-8 flex flex-col items-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">找工作</h1>
        <p className="mt-2 text-sm text-muted-foreground">模块已创建，待填充内容</p>
      </div>
    </main>
  );
}
