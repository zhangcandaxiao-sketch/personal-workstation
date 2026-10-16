import type { ITodo } from './todo.types';

// 模块私有存储键，带命名空间避免与其他应用冲突
const NS = 'my-workbench:todos';

// 纯数据层：只负责读写 localStorage，不碰 React、不碰界面
// 读取时给老数据补默认字段，避免升级后旧记录缺字段导致渲染崩溃
export function loadTodos(): ITodo[] {
  try {
    const raw = localStorage.getItem(NS);
    if (!raw) return [];
    const list = JSON.parse(raw) as Partial<ITodo>[];
    return list.map((t) => ({
      id: t.id ?? Date.now(),
      text: t.text ?? '',
      done: t.done ?? false,
      createdAt: t.createdAt ?? Date.now(),
      dueDate: t.dueDate ?? '',
    }));
  } catch {
    return [];
  }
}

export function saveTodos(list: ITodo[]): void {
  try {
    localStorage.setItem(NS, JSON.stringify(list));
  } catch {
    // 隐私模式 / 禁用站点数据时静默降级
  }
}
