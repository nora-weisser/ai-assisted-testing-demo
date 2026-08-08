import { useCallback, useEffect, useState } from 'react';
import * as api from './api/client';
import { ErrorBanner } from './components/ErrorBanner';
import { TodoCounter } from './components/TodoCounter';
import { TodoFilters } from './components/TodoFilters';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import { TITLE_MAX_LENGTH, type Todo, type TodoFilter } from './types';

function filterFromPath(pathname: string): TodoFilter {
  if (pathname === '/active') return 'active';
  if (pathname === '/completed') return 'completed';
  return 'all';
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoFilter>(() => filterFromPath(window.location.pathname));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const report = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Something went wrong');
  }, []);

  useEffect(() => {
    let cancelled = false;

    api
      .fetchTodos()
      .then((loaded) => {
        if (!cancelled) setTodos(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) report(cause);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [report]);

  useEffect(() => {
    const onPopState = () => setFilter(filterFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    setFilter(filterFromPath(path));
  }

  async function handleAdd(title: string) {
    try {
      const created = await api.createTodo(title);
      setTodos((current) => [...current, created]);
      setError(null);
    } catch (cause) {
      report(cause);
    }
  }

  async function handleToggle(todo: Todo) {
    const completed = !todo.completed;

    // Applied optimistically: a controlled checkbox would otherwise snap back
    // to its previous state until the request resolves, which reads as "the
    // click did nothing" to both users and Playwright's check().
    setTodos((current) =>
      current.map((item) => (item.id === todo.id ? { ...item, completed } : item)),
    );

    try {
      const updated = await api.updateTodo(todo.id, { completed });
      setTodos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (cause) {
      setTodos((current) =>
        current.map((item) =>
          item.id === todo.id ? { ...item, completed: todo.completed } : item,
        ),
      );
      report(cause);
    }
  }

  async function handleRename(todo: Todo, title: string) {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError('Title must not be empty');
      return;
    }
    if (trimmed.length > TITLE_MAX_LENGTH) {
      setError(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
      return;
    }

    try {
      const updated = await api.updateTodo(todo.id, { title: trimmed });
      setTodos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (cause) {
      report(cause);
    }
  }

  async function handleDelete(todo: Todo) {
    try {
      await api.deleteTodo(todo.id);
      setTodos((current) => current.filter((item) => item.id !== todo.id));
      setError(null);
    } catch (cause) {
      report(cause);
    }
  }

  async function handleClearCompleted() {
    try {
      await api.clearCompleted();
      setTodos((current) => current.filter((item) => !item.completed));
      setError(null);
    } catch (cause) {
      report(cause);
    }
  }

  const visible = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });
  const remaining = todos.filter((todo) => !todo.completed).length;
  const hasCompleted = todos.some((todo) => todo.completed);

  return (
    <main className="app">
      <h1>Todos</h1>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <TodoForm onAdd={handleAdd} />

      <TodoFilters current={filter} onChange={navigate} />

      {loading ? (
        <p role="status">Loading todos…</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">
          {todos.length === 0 ? 'Nothing to do yet. Add your first todo.' : 'No matching todos.'}
        </p>
      ) : (
        <TodoList
          todos={visible}
          onToggle={handleToggle}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}

      {/* Withheld while loading so the loading indicator is the only role="status" on the page. */}
      {!loading && (
        <footer className="app-footer">
          <TodoCounter remaining={remaining} />
          {hasCompleted && (
            <button type="button" onClick={handleClearCompleted}>
              Clear completed
            </button>
          )}
        </footer>
      )}
    </main>
  );
}
