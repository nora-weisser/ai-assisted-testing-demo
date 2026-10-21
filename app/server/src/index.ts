import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config, randomIn } from './config.js';
import { apiRouter, sendError, testRouter } from './routes.js';

const COOKIE = 'fr_uid';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, '../client');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/config', (_req, res) => {
  res.json({ holdSeconds: config.holdSeconds });
});

// Every visitor gets an anonymous id cookie. Holds, orders and favourites are
// scoped to it, so each browser context in a test run is its own customer.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const match = /(?:^|;\s*)fr_uid=([0-9a-f-]{36})/.exec(req.header('cookie') ?? '');
  const id = match?.[1] ?? randomUUID();
  if (!match) {
    res.setHeader('Set-Cookie', `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax`);
  }
  res.locals.userId = id;
  next();
});

if (config.testRoutes) {
  app.use('/api/test', testRouter());
}

// Simulated network: every API response takes a different amount of time.
app.use('/api', (_req, _res, next) => {
  setTimeout(next, randomIn(config.latency));
});

app.use('/api', apiRouter());

app.use('/api', (_req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'unknown endpoint');
});

app.use(express.static(clientDir));

// Client-side routes resolve to the SPA shell.
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof SyntaxError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'request body must be valid JSON');
    return;
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'unexpected server error');
});

app.listen(config.port, () => {
  console.log(
    `front-row listening on http://localhost:${config.port} ` +
      `(latency ${config.latency.min}-${config.latency.max}ms, hold ${config.holdSeconds}s, ` +
      `test routes: ${config.testRoutes})`,
  );
});
