import type { Todo } from '../types';

const BASE = '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    // A stubbed or crashed server may not return the documented error shape,
    // so fall back to a generic message rather than throwing while throwing.
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      // keep the fallback message
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function fetchTodos(): Promise<Todo[]> {
  return request<Todo[]>('/todos');
}

export function createTodo(title: string): Promise<Todo> {
  return request<Todo>('/todos', { method: 'POST', body: JSON.stringify({ title }) });
}

export function updateTodo(
  id: string,
  changes: { title?: string; completed?: boolean },
): Promise<Todo> {
  return request<Todo>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteTodo(id: string): Promise<void> {
  return request<void>(`/todos/${id}`, { method: 'DELETE' });
}

export function clearCompleted(): Promise<{ deleted: number }> {
  return request<{ deleted: number }>('/todos/clear-completed', { method: 'POST' });
}
