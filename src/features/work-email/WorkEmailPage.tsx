import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const TARGET_URL = 'https://mail.163.com/';

export default function WorkEmailPage() {
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
              <Mail className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-semibold">单位邮箱</h1>
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

      <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="items-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>
            <CardTitle>网易 163 邮箱</CardTitle>
            <CardDescription>
              邮箱登录页出于安全限制不允许在工作台内嵌显示，请在新窗口中打开登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={() => window.open(TARGET_URL, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              前往登录 163 邮箱
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
