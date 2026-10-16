import { useState } from 'react';
import type { ITodo } from './todo.types';
import { loadTodos, saveTodos } from './todo.store';

// 业务 hook：把数据层包装成 React 状态，提供增删改查
export function useTodos() {
  const [todos, setTodos] = useState<ITodo[]>(loadTodos);

  function commit(next: ITodo[]) {
    setTodos(next);
    saveTodos(next);
  }

  function addTodo(text: string, dueDate: string) {
    const value = text.trim();
    if (!value) return;
    commit([
      ...todos,
      { id: Date.now(), text: value, done: false, createdAt: Date.now(), dueDate },
    ]);
  }

  function editTodo(id: number, newText: string) {
    const value = newText.trim();
    if (!value) return;
    commit(todos.map((t) => (t.id === id ? { ...t, text: value } : t)));
  }

  function toggleTodo(id: number) {
    commit(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function removeTodo(id: number) {
    commit(todos.filter((t) => t.id !== id));
  }

  return {
    allTodos: todos,
    activeTodos: todos.filter((t) => !t.done),
    doneTodos: todos.filter((t) => t.done),
    addTodo,
    editTodo,
    toggleTodo,
    removeTodo,
  };
}
