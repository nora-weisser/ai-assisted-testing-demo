import { randomUUID } from 'node:crypto';
import type { Todo } from './types.js';

const todos = new Map<string, Todo>();

export function list(): Todo[] {
  return [...todos.values()].sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt),
  );
}

export function find(id: string): Todo | undefined {
  return todos.get(id);
}

export function create(title: string): Todo {
  const todo: Todo = {
    id: randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.set(todo.id, todo);
  return todo;
}

export function update(id: string, changes: { title?: string; completed?: boolean }): Todo | undefined {
  const existing = todos.get(id);
  if (!existing) return undefined;

  const updated: Todo = {
    ...existing,
    ...(changes.title !== undefined ? { title: changes.title } : {}),
    ...(changes.completed !== undefined ? { completed: changes.completed } : {}),
  };
  todos.set(id, updated);
  return updated;
}

export function remove(id: string): boolean {
  return todos.delete(id);
}

export function clearCompleted(): number {
  let deleted = 0;
  for (const [id, todo] of todos) {
    if (todo.completed) {
      todos.delete(id);
      deleted += 1;
    }
  }
  return deleted;
}

export function reset(): void {
  todos.clear();
}
