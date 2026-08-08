import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { sendError } from './errors.js';
import { openApiDocument } from './openapi.js';
import { todosRouter } from './routes/todos.js';
import { testRouter } from './routes/test.js';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const TEST_ROUTES_ENABLED = process.env.ENABLE_TEST_ROUTES === 'true';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, '../client');

const app = express();

app.disable('x-powered-by');

// Rejects non-JSON payloads before the parser silently leaves req.body empty,
// which would otherwise surface as a confusing "title is required".
app.use((req, res, next) => {
  const hasBody = Number.parseInt(req.header('content-length') ?? '0', 10) > 0;
  const isJson = req.is('application/json') !== false;

  if (hasBody && !isJson) {
    sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'request body must be application/json');
    return;
  }
  next();
});

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Todo App API',
    swaggerOptions: { displayRequestDuration: true, tryItOutEnabled: true },
  }),
);

app.use('/api/todos', todosRouter());

if (TEST_ROUTES_ENABLED) {
  app.use('/api/test', testRouter());
}

app.use('/api', (_req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'unknown endpoint');
});

app.use(express.static(clientDir));

// Client-side routes (/active, /completed) must resolve to the SPA shell.
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

app.listen(PORT, () => {
  console.log(`todo-app listening on http://localhost:${PORT} (test routes: ${TEST_ROUTES_ENABLED})`);
});
