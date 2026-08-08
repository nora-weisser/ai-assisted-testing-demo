import { z } from 'zod';
import type { TodoFilter } from './types.js';

export const TITLE_MAX_LENGTH = 200;

const titleSchema = z
  .string({
    required_error: 'title is required',
    invalid_type_error: 'title must be a string',
  })
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: 'title must not be empty' })
  .refine((value) => value.length <= TITLE_MAX_LENGTH, {
    message: `title must be at most ${TITLE_MAX_LENGTH} characters`,
  });

export const createTodoSchema = z.strictObject({ title: titleSchema });

export const patchTodoSchema = z
  .strictObject({
    title: titleSchema.optional(),
    completed: z.boolean({ invalid_type_error: 'completed must be a boolean' }).optional(),
  })
  .refine((body) => body.title !== undefined || body.completed !== undefined, {
    message: 'body must contain at least one of: title, completed',
  });

export const filterSchema = z.enum(['all', 'active', 'completed'], {
  errorMap: () => ({ message: 'filter must be one of: all, active, completed' }),
});

export function applyFilter<T extends { completed: boolean }>(todos: T[], filter: TodoFilter): T[] {
  if (filter === 'active') return todos.filter((todo) => !todo.completed);
  if (filter === 'completed') return todos.filter((todo) => todo.completed);
  return todos;
}
