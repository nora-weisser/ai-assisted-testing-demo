export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type TodoFilter = 'all' | 'active' | 'completed';
