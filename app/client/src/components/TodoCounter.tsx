type Props = {
  remaining: number;
};

export function TodoCounter({ remaining }: Props) {
  return (
    <span className="todo-counter" role="status">
      {remaining} {remaining === 1 ? 'item' : 'items'} left
    </span>
  );
}
