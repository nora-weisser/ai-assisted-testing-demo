import type { TodoFilter } from '../types';

const FILTERS: { filter: TodoFilter; label: string; path: string }[] = [
  { filter: 'all', label: 'All', path: '/' },
  { filter: 'active', label: 'Active', path: '/active' },
  { filter: 'completed', label: 'Completed', path: '/completed' },
];

type Props = {
  current: TodoFilter;
  onChange: (path: string) => void;
};

export function TodoFilters({ current, onChange }: Props) {
  return (
    <nav className="todo-filters" aria-label="Filters">
      {FILTERS.map(({ filter, label, path }) => (
        <a
          key={filter}
          href={path}
          aria-current={filter === current ? 'page' : undefined}
          onClick={(event) => {
            event.preventDefault();
            onChange(path);
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
