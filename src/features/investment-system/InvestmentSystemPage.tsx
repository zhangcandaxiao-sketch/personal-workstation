import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TARGET_URL = 'http://120.25.102.68/index.php/admin/login/index.html';

export default function InvestmentSystemPage() {
  return (
    <main className="flex h-screen flex-col p-4">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回工作台
        </Link>
        <h1 className="text-lg font-semibold">招商系统</h1>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">招商系统</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            后台登录受浏览器安全策略限制，无法在工作台内嵌打开，请在新窗口中打开并登录。
          </p>
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => window.open(TARGET_URL, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4" />
            在新窗口打开
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/">返回工作台首页</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
