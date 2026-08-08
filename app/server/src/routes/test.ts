import { Router } from 'express';
import * as store from '../store.js';

// Mounted only when ENABLE_TEST_ROUTES=true, so the reset hook cannot be
// reached on a normal deployment.
export function testRouter(): Router {
  const router = Router();

  router.post('/reset', (_req, res) => {
    store.reset();
    res.status(204).end();
  });

  return router;
}
