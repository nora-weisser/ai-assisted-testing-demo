import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

type Props = {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onRename: (todo: Todo, title: string) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoList({ todos, onToggle, onRename, onDelete }: Props) {
  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
