import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ITodo } from '../todo.types';

interface TodoItemProps {
  todo: ITodo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
}

// 展示组件：单条待办，支持勾选 / 编辑 / 删除
export default function TodoItem({ todo, onToggle, onRemove, onEdit }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);

  function saveEdit() {
    onEdit(todo.id, draft);
    setEditing(false);
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo.id)}
        />
        {editing ? (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
            }}
            autoFocus
            className="h-8"
          />
        ) : (
          <span className={`truncate ${todo.done ? 'text-muted-foreground line-through' : ''}`}>
            {todo.text}
            {todo.dueDate && (
              <span className="ml-2 text-xs text-muted-foreground">截止 {todo.dueDate}</span>
            )}
          </span>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        {editing ? (
          <Button type="button" size="sm" variant="secondary" onClick={saveEdit}>
            保存
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            编辑
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(todo.id)}>
          删除
        </Button>
      </div>
    </motion.li>
  );
}
