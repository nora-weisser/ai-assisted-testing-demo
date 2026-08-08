import { TITLE_MAX_LENGTH } from './validation.js';

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Server-generated todo id. Treated as opaque — an unparseable id is simply unknown, so it returns 404 rather than 400.',
  schema: { type: 'string', format: 'uuid' },
} as const;

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
});

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Todo App API',
    version: '1.0.0',
    description: [
      'The API behind the todo app used for the AI-assisted testing demo.',
      '',
      'Two behaviours are deliberate and worth knowing before writing tests against it:',
      '',
      '- **Request bodies are strict.** An unrecognised property is a `400`, not a silently ignored field.',
      '- **Ids are opaque.** A malformed id returns `404`, not `400`.',
      '',
      'Any method not documented on a path returns `405` with an `Allow` header listing the supported methods.',
      'A request carrying a body with a `Content-Type` other than `application/json` returns `415`.',
    ].join('\n'),
  },
  // Explicitly empty: this API is deliberately unauthenticated, which is a
  // stated design choice rather than an omission.
  security: [],
  servers: [{ url: '/api', description: 'Same origin as the UI' }],
  tags: [
    { name: 'Todos', description: 'Create, read, update and delete todos' },
    { name: 'System', description: 'Health and test-support endpoints' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        operationId: 'getHealth',
        summary: 'Liveness probe',
        description: 'Backs the Docker healthcheck, so `docker compose up --wait` blocks until this returns 200.',
        responses: {
          '200': {
            description: 'The service is up',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
                example: { status: 'ok' },
              },
            },
          },
        },
      },
    },

    '/todos': {
      get: {
        tags: ['Todos'],
        operationId: 'listTodos',
        summary: 'List todos',
        description: 'Returns todos in creation order (oldest first). The order is stable, so positional assertions are safe.',
        parameters: [
          {
            name: 'filter',
            in: 'query',
            required: false,
            description: 'Defaults to `all`. Any other value is a 400.',
            schema: { type: 'string', enum: ['all', 'active', 'completed'], default: 'all' },
          },
        ],
        responses: {
          '200': {
            description: 'The matching todos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Todo' } },
              },
            },
          },
          '400': errorResponse('The `filter` value is not one of all, active, completed'),
        },
      },
      post: {
        tags: ['Todos'],
        operationId: 'createTodo',
        summary: 'Create a todo',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTodoRequest' },
              examples: {
                valid: { summary: 'A valid title', value: { title: 'Buy milk' } },
                boundary: {
                  summary: 'Exactly 200 characters — accepted',
                  value: { title: 'y'.repeat(TITLE_MAX_LENGTH) },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created. `id`, `completed` and `createdAt` are server-assigned.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Todo' } } },
          },
          '400': errorResponse(
            'Title missing, empty, whitespace-only, not a string, longer than 200 characters, or an unrecognised property was sent',
          ),
          '415': errorResponse('Body sent with a Content-Type other than application/json'),
        },
      },
    },

    '/todos/{id}': {
      get: {
        tags: ['Todos'],
        operationId: 'getTodo',
        summary: 'Fetch one todo',
        parameters: [idParam],
        responses: {
          '200': {
            description: 'The todo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Todo' } } },
          },
          '404': errorResponse('No todo with that id'),
        },
      },
      patch: {
        tags: ['Todos'],
        operationId: 'updateTodo',
        summary: 'Update a todo',
        description: 'Partial update. At least one of `title` or `completed` must be present. `id` and `createdAt` are immutable.',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTodoRequest' },
              examples: {
                complete: { summary: 'Mark complete', value: { completed: true } },
                rename: { summary: 'Rename', value: { title: 'Buy oat milk' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'The updated todo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Todo' } } },
          },
          '400': errorResponse(
            'Empty body, invalid field type, invalid title, or an unrecognised property',
          ),
          '404': errorResponse('No todo with that id'),
          '415': errorResponse('Body sent with a Content-Type other than application/json'),
        },
      },
      delete: {
        tags: ['Todos'],
        operationId: 'deleteTodo',
        summary: 'Delete a todo',
        description: 'Not idempotent-silent: deleting the same id twice returns 404 the second time.',
        parameters: [idParam],
        responses: {
          '204': { description: 'Deleted. No response body.' },
          '404': errorResponse('No todo with that id'),
        },
      },
    },

    '/todos/clear-completed': {
      post: {
        tags: ['Todos'],
        operationId: 'clearCompletedTodos',
        summary: 'Delete every completed todo',
        description: 'Always succeeds. Returns how many were removed — 0 when nothing was completed.',
        responses: {
          '200': {
            description: 'How many todos were removed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ClearCompletedResult' },
                example: { deleted: 2 },
              },
            },
          },
        },
      },
    },

    '/test/reset': {
      post: {
        tags: ['System'],
        operationId: 'resetTestNamespace',
        summary: 'Delete every todo (test support)',
        description:
          'Mounted only when the server runs with ENABLE_TEST_ROUTES=true; otherwise the path returns 404. Tests call this in beforeEach to guarantee a clean slate. Because it empties the whole store, the suite runs single-worker.',
        responses: {
          '204': { description: 'Store cleared. No response body.' },
          '404': errorResponse('Test routes are disabled on this server'),
        },
      },
    },
  },

  components: {
    schemas: {
      Todo: {
        type: 'object',
        required: ['id', 'title', 'completed', 'createdAt'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', format: 'uuid', readOnly: true },
          title: { type: 'string', minLength: 1, maxLength: TITLE_MAX_LENGTH },
          completed: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time', readOnly: true },
        },
        example: {
          id: 'fb668535-da63-46de-b703-20bddb803bd8',
          title: 'Buy milk',
          completed: false,
          createdAt: '2026-08-07T19:53:24.734Z',
        },
      },
      CreateTodoRequest: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: TITLE_MAX_LENGTH,
            description: 'Trimmed before storage. Whitespace-only is rejected. Duplicates are allowed.',
          },
        },
      },
      UpdateTodoRequest: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: TITLE_MAX_LENGTH },
          completed: { type: 'boolean' },
        },
      },
      ClearCompletedResult: {
        type: 'object',
        required: ['deleted'],
        additionalProperties: false,
        properties: { deleted: { type: 'integer', minimum: 0 } },
      },
      Health: {
        type: 'object',
        required: ['status'],
        additionalProperties: false,
        properties: { status: { type: 'string', enum: ['ok'] } },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        additionalProperties: false,
        description: 'Every error in this API uses this one shape, so a single schema validates them all.',
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            additionalProperties: false,
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'NOT_FOUND',
                  'METHOD_NOT_ALLOWED',
                  'UNSUPPORTED_MEDIA_TYPE',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string' },
              field: {
                type: 'string',
                description: 'Present only when the error is attributable to one request field.',
              },
            },
          },
        },
        example: {
          error: { code: 'VALIDATION_ERROR', message: 'title must not be empty', field: 'title' },
        },
      },
    },
  },
} as const;
