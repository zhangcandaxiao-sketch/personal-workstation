import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TARGET_URL = 'https://jcn6tkide5cy.feishu.cn/wiki/Nb17wICs9iHo5OkomFKcnifjnJh';

export default function FeishuDocsPage() {
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookMarked className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-semibold">飞书文档库</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(TARGET_URL, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            新窗口打开
          </Button>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-lg border bg-white">
        <iframe
          src={TARGET_URL}
          className="h-full w-full border-0"
          title="飞书文档库"
        />
      </div>
    </main>
  );
}
