import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import HomePage from '@/pages/HomePage/HomePage';
import TodoPage from '@/features/todo/TodoPage';
import ProjectTemplatePage from '@/features/project-template/ProjectTemplatePage';
import InvestmentSystemPage from '@/features/investment-system/InvestmentSystemPage';
import BriefingWriterPage from '@/features/briefing-writer/BriefingWriterPage';
import KnowledgeBasePage from '@/features/knowledge-base/KnowledgeBasePage';
import FeishuDocsPage from '@/features/feishu-docs/FeishuDocsPage';
import JobSearchPage from '@/features/job-search/JobSearchPage';
import WeekendPlannerPage from '@/features/weekend-planner/WeekendPlannerPage';
import TencentSheetPage from '@/features/tencent-sheet/TencentSheetPage';
import XianyuWorkbenchPage from '@/features/xianyu-workbench/XianyuWorkbenchPage';
import WorkEmailPage from '@/features/work-email/WorkEmailPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="todo" element={<TodoPage />} />
        <Route path="project-template" element={<ProjectTemplatePage />} />
        <Route path="investment-system" element={<InvestmentSystemPage />} />
        <Route path="briefing-writer" element={<BriefingWriterPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="feishu-docs" element={<FeishuDocsPage />} />
        <Route path="job-search" element={<JobSearchPage />} />
        <Route path="weekend-planner" element={<WeekendPlannerPage />} />
        <Route path="tencent-sheet" element={<TencentSheetPage />} />
        <Route path="xianyu-workbench" element={<XianyuWorkbenchPage />} />
        <Route path="work-email" element={<WorkEmailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
