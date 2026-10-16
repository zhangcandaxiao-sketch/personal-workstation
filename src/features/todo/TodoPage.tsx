import { AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTodos } from './useTodos';
import TodoInput from './components/TodoInput';
import TodoItem from './components/TodoItem';
import TodoStats from './components/TodoStats';
import TodoCalendar from './components/TodoCalendar';

// 模块入口：完成情况可视化 + 完整列表（待办中 / 已完成分组）+ 日历
export default function TodoPage() {
  const {
    allTodos,
    activeTodos,
    doneTodos,
    addTodo,
    editTodo,
    toggleTodo,
    removeTodo,
  } = useTodos();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-xl font-semibold">今日待办</h1>

      <div className="mt-4">
        <TodoInput onAdd={addTodo} />
      </div>

      <div className="mt-4">
        <TodoStats total={allTodos.length} done={doneTodos.length} />
      </div>

      <Tabs defaultValue="list" className="mt-6">
        <TabsList>
          <TabsTrigger value="list">全部任务（{allTodos.length}）</TabsTrigger>
          <TabsTrigger value="calendar">日历</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {allTodos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有任务，添加一条开始吧
            </p>
          )}

          {activeTodos.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                待办中（{activeTodos.length}）
              </h2>
              <ul className="space-y-2">
                <AnimatePresence>
                  {activeTodos.map((t) => (
                    <TodoItem
                      key={t.id}
                      todo={t}
                      onToggle={toggleTodo}
                      onRemove={removeTodo}
                      onEdit={editTodo}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}

          {doneTodos.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                已完成（{doneTodos.length}）
              </h2>
              <ul className="space-y-2 opacity-70">
                <AnimatePresence>
                  {doneTodos.map((t) => (
                    <TodoItem
                      key={t.id}
                      todo={t}
                      onToggle={toggleTodo}
                      onRemove={removeTodo}
                      onEdit={editTodo}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <TodoCalendar todos={allTodos} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
