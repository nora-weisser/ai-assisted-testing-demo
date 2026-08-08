import { useState, type FormEvent } from 'react';
import { TITLE_MAX_LENGTH } from '../types';

type Props = {
  onAdd: (title: string) => Promise<void>;
};

export function TodoForm({ onAdd }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      setError('Title must not be empty');
      return;
    }
    if (trimmed.length > TITLE_MAX_LENGTH) {
      setError(`Title must be at most ${TITLE_MAX_LENGTH} characters`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="new-todo">What needs to be done?</label>
      <div className="todo-form-row">
        <input
          id="new-todo"
          name="title"
          type="text"
          placeholder="What needs to be done?"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'new-todo-error' : undefined}
        />
        <button type="submit" disabled={submitting}>
          Add
        </button>
      </div>
      {error && (
        <p className="field-error" id="new-todo-error">
          {error}
        </p>
      )}
    </form>
  );
}
