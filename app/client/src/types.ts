export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type TodoFilter = 'all' | 'active' | 'completed';

export const TITLE_MAX_LENGTH = 200;
