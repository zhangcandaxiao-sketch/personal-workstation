import { Link } from 'react-router-dom';
import { FileText, Building2, Newspaper, Library, BookMarked, Briefcase, Compass, GraduationCap, Fish, Mail } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import CreativeClock from './components/CreativeClock';
import CreativeCalendar from './components/CreativeCalendar';

// 外链模块：后台登录受 iframe 限制，必须在新窗口打开
const INVESTMENT_SYSTEM_URL = 'http://120.25.102.68/index.php/admin/login/index.html';
const XIANYU_WORKBENCH_URL = 'https://ed.weeeg.com/ekadmin/product/product_list';

// 工作台首页：作为各模块的聚合入口，点卡片跳到对应模块
export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">我的工作台</h1>
      <p className="mt-2 text-muted-foreground">选择一个模块开始工作</p>

      {/* 顶部：创意时钟 + 创意日历 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <CreativeClock />
        <div className="lg:col-span-2">
          <CreativeCalendar />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/todo">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <CardTitle>待办</CardTitle>
              <CardDescription>任务的增删改查、历史记录与日历视图</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/project-template">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <CardTitle>项目申报书模板</CardTitle>
              <CardDescription>一键用 WPS 打开项目申报书模板文档</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <a href={INVESTMENT_SYSTEM_URL} target="_blank" rel="noopener noreferrer">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <CardTitle>招商系统</CardTitle>
              <CardDescription>招商项目管理系统，点击在新窗口打开</CardDescription>
            </CardHeader>
          </Card>
        </a>

        <Link to="/briefing-writer">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Newspaper className="h-5 w-5" />
              </div>
              <CardTitle>简讯写作助手</CardTitle>
              <CardDescription>填写活动素材，一键生成写作提示词</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/knowledge-base">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Library className="h-5 w-5" />
              </div>
              <CardTitle>个人知识库</CardTitle>
              <CardDescription>沉淀笔记、要点与资料，按分类随时增删</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/feishu-docs">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookMarked className="h-5 w-5" />
              </div>
              <CardTitle>飞书文档库</CardTitle>
              <CardDescription>一键打开你的飞书知识库文档</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/job-search">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <CardTitle>求职投递追踪</CardTitle>
              <CardDescription>记录投递进度，跟进面试与 Offer 状态</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/weekend-planner">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <CardTitle>周末去哪里 · 武汉</CardTitle>
              <CardDescription>AI 大会、趣味体验与科普活动，规划周末两天行程</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/tencent-sheet">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <CardTitle>校招信息征集表</CardTitle>
              <CardDescription>一键打开 2027 届校招信息汇总表（腾讯文档）</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <a href={XIANYU_WORKBENCH_URL} target="_blank" rel="noopener noreferrer">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Fish className="h-5 w-5" />
              </div>
              <CardTitle>闲鱼运营工作台</CardTitle>
              <CardDescription>闲鱼商品管理后台，点击在新窗口打开</CardDescription>
            </CardHeader>
          </Card>
        </a>

        <Link to="/work-email">
          <Card className="hover-elevate h-full">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle>单位邮箱</CardTitle>
              <CardDescription>一键打开 163 网易邮箱登录页（新窗口）</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
