import { Router } from 'express';
import { sendError, sendNotFound, sendZodError } from '../errors.js';
import * as store from '../store.js';
import { applyFilter, createTodoSchema, filterSchema, patchTodoSchema } from '../validation.js';

function methodNotAllowed(allowed: string[]) {
  return (req: import('express').Request, res: import('express').Response): void => {
    res.setHeader('Allow', allowed.join(', '));
    sendError(res, 405, 'METHOD_NOT_ALLOWED', `${req.method} is not supported on this resource`);
  };
}

export function todosRouter(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const filterResult = filterSchema.safeParse(req.query.filter ?? 'all');
    if (!filterResult.success) {
      sendZodError(res, filterResult.error);
      return;
    }

    res.json(applyFilter(store.list(), filterResult.data));
  });

  router.post('/', (req, res) => {
    const result = createTodoSchema.safeParse(req.body);
    if (!result.success) {
      sendZodError(res, result.error);
      return;
    }

    res.status(201).json(store.create(result.data.title));
  });

  router.all('/', methodNotAllowed(['GET', 'POST']));

  // Declared before '/:id' so the literal path is not swallowed as an id.
  router.post('/clear-completed', (_req, res) => {
    res.json({ deleted: store.clearCompleted() });
  });

  router.all('/clear-completed', methodNotAllowed(['POST']));

  router.get('/:id', (req, res) => {
    const todo = store.find(req.params.id);
    if (!todo) {
      sendNotFound(res);
      return;
    }
    res.json(todo);
  });

  router.patch('/:id', (req, res) => {
    const result = patchTodoSchema.safeParse(req.body);
    if (!result.success) {
      sendZodError(res, result.error);
      return;
    }

    const updated = store.update(req.params.id, result.data);
    if (!updated) {
      sendNotFound(res);
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    if (!store.remove(req.params.id)) {
      sendNotFound(res);
      return;
    }
    res.status(204).end();
  });

  router.all('/:id', methodNotAllowed(['GET', 'PATCH', 'DELETE']));

  return router;
}
