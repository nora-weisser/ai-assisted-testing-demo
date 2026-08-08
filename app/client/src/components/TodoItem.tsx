import { useState, type KeyboardEvent } from 'react';
import type { Todo } from '../types';

type Props = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onRename: (todo: Todo, title: string) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoItem({ todo, onToggle, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  function startEditing() {
    setDraft(todo.title);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (draft.trim() !== todo.title) {
      onRename(todo, draft);
    }
  }

  function cancel() {
    setEditing(false);
    setDraft(todo.title);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  }

  return (
    <li className={todo.completed ? 'todo-item completed' : 'todo-item'}>
      <input
        type="checkbox"
        checked={todo.completed}
        aria-label={todo.title}
        onChange={() => onToggle(todo)}
      />
      {editing ? (
        <input
          className="todo-edit"
          type="text"
          autoFocus
          value={draft}
          aria-label={`Edit ${todo.title}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
        />
      ) : (
        <span className="todo-title">{todo.title}</span>
      )}
      <button type="button" aria-label={`Edit ${todo.title}`} onClick={startEditing} hidden={editing}>
        Edit
      </button>
      <button type="button" aria-label={`Delete ${todo.title}`} onClick={() => onDelete(todo)}>
        Delete
      </button>
    </li>
  );
}
