import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TodoInputProps {
  onAdd: (text: string, dueDate: string) => void;
}

// 展示组件：输入任务文字 + 选截止日期，回车或点按钮提交
export default function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');

  function submit() {
    const value = text.trim();
    if (!value) return;
    onAdd(value, dueDate);
    setText('');
    setDueDate('');
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder="输入任务，回车添加"
        className="flex-1"
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-40"
      />
      <Button type="button" onClick={submit}>
        添加
      </Button>
    </div>
  );
}
