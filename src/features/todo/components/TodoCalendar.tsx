import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import type { ITodo } from '../todo.types';

interface TodoCalendarProps {
  todos: ITodo[];
}

// 展示组件：选一个日期，列出当天截止的待办
export default function TodoCalendar({ todos }: TodoCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
  const dayTodos = todos.filter((t) => t.dueDate === dateStr);

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <Calendar mode="single" selected={date} onSelect={setDate} />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium">{dateStr || '选择日期'}</h3>
        {dayTodos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">当天没有安排任务</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {dayTodos.map((t) => (
              <li key={t.id} className="rounded bg-muted px-3 py-1.5 text-sm">
                {t.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
