# Todo App — Application Reference

The application under test for the AI-assisted testing demo. A deliberately
small todo app whose UI and API are *designed to be testable*, so that
AI-generated Playwright code has stable semantics to bind to.

For test coverage, tagging and the demo test set, see
[test-plan.md](test-plan.md).

**Stack:** React + TypeScript + Vite (UI) · Express + TypeScript (in-memory REST API) · Docker + Docker Compose
**Status:** built and verified.

---

## 1. Running it

| Command | What it does |
| --- | --- |
| `npm run app:up` | Starts the container — <http://localhost:3000>. Blocks until healthy. |
| `npm run app:down` | Stops it and removes volumes. |
| `npm run app:dev` | Installs the app's deps, then runs API + Vite on the host with hot reload. UI on <http://localhost:5173>, API on `:3000`. |

Two gotchas:

- **Don't run `app:dev` while the container is up.** Both want port 3000; the dev API dies with `EADDRINUSE` while Vite keeps working by proxying to the *container's* API, which is confusing. Run `npm run app:down` first.
- **`app:dev` leaves `ENABLE_TEST_ROUTES` off,** so `POST /api/test/reset` returns 404 against it. Use `ENABLE_TEST_ROUTES=true npm run app:dev` if you want to run the suite against dev mode. The container sets it already.

---

## 2. Design goals

| Goal | Why |
| --- | --- |
| Small enough to read in one sitting | The audience must be able to judge whether generated tests are *correct*, not merely plausible |
| Rich enough to be non-trivial | Filtering, validation, async states and error paths — otherwise every generated test is `click → expect visible` |
| Semantically accessible | Exercises the `getByRole → getByLabel → getByPlaceholder → getByText → getByTestId` chain, so locator priority has something to bite on |
| Real HTTP layer | Enables API tests, Zod schemas from real responses, and `page.route()` interception |
| Runs identically everywhere | Dockerised — same behaviour on your laptop, an attendee's machine, and CI |

**Non-goals:** authentication, multi-user, persistence across restarts, mobile
layouts, i18n.

---

## 3. Features

### 3.1 Core

| # | Feature | Behaviour |
| --- | --- | --- |
| F1 | Add todo | Text input + "Add" button. Trims whitespace. Clears input on success. New item appends to the list. |
| F2 | List todos | A `<ul>` of items, each with a checkbox, title, Edit and Delete buttons. |
| F3 | Toggle complete | Checkbox toggles `completed`. Completed items get a strike-through (CSS only — assert the checkbox, not the styling). |
| F4 | Edit todo | "Edit" button → inline text input. `Enter` saves, `Escape` cancels, blur saves. |
| F5 | Delete todo | Per-item Delete button. Removes immediately, no confirm dialog. |
| F6 | Filter | All / Active / Completed, as links with `aria-current` on the active one. Reflected in the URL (`/`, `/active`, `/completed`). |
| F7 | Counter | "N items left" live region. Singular/plural handled. |
| F8 | Clear completed | Button, rendered only when at least one completed item exists. |
| F9 | Empty state | An empty list shows a message instead of an empty `<ul>`. |

### 3.2 Validation & error surfaces

Included deliberately, so there are negative paths to test — not just happy ones.

| # | Rule | Behaviour |
| --- | --- | --- |
| V1 | Title required | Empty/whitespace-only → inline error, **no request sent** |
| V2 | Max length 200 | Longer → inline error on submit |
| V3 | Duplicate titles allowed | An intentional non-rule, documented so tests don't invent one |
| V4 | API failure | Any 4xx/5xx → dismissible banner with `role="alert"`; list state unchanged |
| V5 | Loading state | Initial fetch shows a `role="status"` indicator |

### 3.3 Testability contract

This is what makes the demo work: every interactive element is reachable by
accessible role + name.

| Element | Semantics |
| --- | --- |
| New-todo input | `<input>` with a `<label>` — "What needs to be done?" (also matches by placeholder) |
| Add button | `<button>` named "Add" |
| Todo list | `<ul>` → `getByRole('list')`; items → `getByRole('listitem')` |
| Item checkbox | `aria-label` = the todo title → `getByRole('checkbox', { name: title })` is unique |
| Item edit | `<button aria-label="Edit {title}">` |
| Item delete | `<button aria-label="Delete {title}">` — unique per row, no `.nth()` needed |
| Edit input | `<input aria-label="Edit {title}">` → reachable as `getByRole('textbox', { name })` |
| Filters | `<nav aria-label="Filters">` with links; active carries `aria-current="page"` |
| Counter | `<span role="status">` |
| Error banner | `role="alert"`, with a "Dismiss error" button |
| Form errors | Tied to the input via `aria-describedby` + `aria-invalid` |

**Rule:** no `data-testid` anywhere. If a test needs `getByTestId`, treat it as
a bug in the app's accessibility, not in the test.

---

## 4. Data model

```ts
type Todo = {
  id: string;          // uuid v4, server-generated
  title: string;       // 1..200 chars, trimmed
  completed: boolean;
  createdAt: string;   // ISO 8601, server-generated
};
```

Ordering is stable by `createdAt` ascending, so list order is guaranteed and
positional locators are defensible when needed.

---

## 5. API contract

Base path `/api`. JSON in, JSON out. In-memory store, cleared on restart.

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| `GET` | `/api/todos` | `200` → `Todo[]` | — |
| `GET` | `/api/todos?filter=active\|completed` | `200` → `Todo[]` | `400` invalid filter |
| `POST` | `/api/todos` | `201` → `Todo` | `400` invalid title or unknown property, `415` non-JSON body |
| `GET` | `/api/todos/:id` | `200` → `Todo` | `404` unknown id |
| `PATCH` | `/api/todos/:id` | `200` → `Todo` | `400` invalid body, `404` unknown id, `415` non-JSON body |
| `DELETE` | `/api/todos/:id` | `204` no body | `404` unknown id |
| `POST` | `/api/todos/clear-completed` | `200` → `{ deleted: number }` | — |
| `POST` | `/api/test/reset` | `204` | `404` when test routes are disabled |
| `GET` | `/api/health` | `200` → `{ "status": "ok" }` | — (backs the Docker healthcheck) |
| `GET` | `/api/openapi.json` | `200` → OpenAPI 3.1 document | — |
| `GET` | `/api/docs` | `200` → Swagger UI | — |

Any method not listed for a path returns `405` with an `Allow` header.

**Error body** — one shape everywhere, so a single Zod schema covers all of them:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title must not be empty", "field": "title" } }
```

`code` is one of `VALIDATION_ERROR`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`,
`UNSUPPORTED_MEDIA_TYPE`, `INTERNAL_ERROR`. `field` appears only when the error
is attributable to one request field.

### 5.1 Interactive docs

The API documents itself at **<http://localhost:3000/api/docs>** — Swagger UI
with try-it-out enabled, so every endpoint can be exercised from the browser.
The raw document is at `/api/openapi.json`.

The spec is hand-written in [app/server/src/openapi.ts](../app/server/src/openapi.ts)
and covers every status code the API returns. It passes
`npx @redocly/cli lint` as valid OpenAPI 3.1.

Because it is hand-written it *can* drift from the implementation — which is
itself useful demo material. See [test-plan.md](test-plan.md) for how that is
guarded.

### 5.2 The one test hook

`POST /api/test/reset` empties the store. Mounted only when
`ENABLE_TEST_ROUTES=true`, which compose sets and a normal deployment does not.
It exists because clearing server state is the one thing Playwright cannot do
from the client side.

A `?delay=<ms>` param was built alongside it and then removed: the client never
sent it, so it could not exercise the UI's loading state at all. Tests slow
responses with `page.route()` instead.

---

## 6. Repository layout

```
app/
  client/
    src/
      components/     TodoForm, TodoList, TodoItem, TodoFilters,
                      TodoCounter, ErrorBanner
      api/client.ts   typed fetch wrapper
      types.ts        shared Todo type
      App.tsx         state, routing, handlers
      main.tsx
    index.html
  vite.config.ts      dev proxy /api -> server
  server/
    src/
      index.ts        express bootstrap, static serve, SPA fallback
      routes/todos.ts
      routes/test.ts  reset route, env-guarded
      store.ts        in-memory Map<id, Todo>
      validation.ts   Zod schemas + shared constants
      openapi.ts      OpenAPI 3.1 document served at /api/docs
  Dockerfile          multi-stage build of client + server
docker-compose.yml    web service (+ playwright service under the "test" profile)
docs/
  todo-app.md         this file
  test-plan.md        coverage matrix and test strategy
```

---

## 7. Container

Multi-stage `Dockerfile`: install deps, build client + server, copy only the
artefacts into a slim runtime image.

| Stage | Base | Does |
| --- | --- | --- |
| `deps` | `node:22-alpine` | `npm ci` from the lockfile — cached across code changes |
| `build` | `node:22-alpine` | Vite build + `tsc` into `dist/` |
| `runtime` | `node:22-alpine` | Production deps only, runs as non-root, `EXPOSE 3000` |

The server serves the built client as static files, so **one container, one
port** — same origin for UI and `/api`, which removes CORS entirely.

**Environment:**

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Listen port |
| `ENABLE_TEST_ROUTES` | `false` | Gates `POST /api/test/reset`. Compose sets `true`. |
| `NODE_ENV` | `production` | — |

**Healthcheck:** `GET /api/health`. Compose declares it, so
`docker compose up --wait` blocks until the app is genuinely ready — this is
what replaces sleep-and-retry in the test bootstrap.

**Compose topology:**

```yaml
services:
  web:          # the todo app, published on :3000
  playwright:   # profile "test": mcr.microsoft.com/playwright:v1.62.1-noble
                # depends_on: web (condition: service_healthy)
```

The app service is named `web`, **not** `app`: Chrome force-upgrades the
single-label host `app` to HTTPS because of the HSTS-preloaded `.app` TLD, so
`page.goto('http://app:3000/')` fails with `ERR_SSL_PROTOCOL_ERROR`.

---

## 8. Behavioural decisions

Deliberate choices that tests must assert rather than guess at.

| Decision | Rationale |
| --- | --- |
| **Unknown property in a request body → `400`** | Bodies are `z.strictObject()`. Returns `{"code":"VALIDATION_ERROR","message":"Unrecognized key(s) in object: 'colour'","field":"colour"}`. Silently ignoring unknown fields hides client bugs. |
| **Malformed id → `404`, not `400`** | Ids are opaque; an unparseable id is simply an unknown one. |
| **`DELETE` twice → `404`** | Not idempotent-silent. The second call reports the truth. |
| **Edit via a button, not double-click** | Double-click is undiscoverable and awkward to locate. No Save/Cancel buttons either — they would race against blur-save. |
| **Optimistic toggle** | The checkbox updates local state *before* the PATCH resolves and rolls back on failure. Without it, a controlled checkbox snaps back until the response lands, and Playwright's `check()` fails with "clicking the checkbox did not change its state" even though the toggle works. |
| **Footer hidden while loading** | The loading indicator and the counter are both `role="status"`. Rendering the footer only after load means they never coexist, so `getByRole('status')` is never ambiguous. |
| **Client-side filtering** | The UI fetches all todos once and filters in the browser. `GET /api/todos?filter=` exists and is API-tested, but the UI never calls it — **so filter switches fire no request.** |

---

## 9. Build history

| # | Milestone |
| --- | --- |
| M1–M2 | Server skeleton, in-memory store, full API surface + validation |
| M3–M4 | Client shell, list rendering, add/toggle/delete/edit wired to API |
| M5–M6 | Filters, counter, clear-completed, empty state, validation, error banner, loading |
| M7 | Production build + single-port serve |
| M8–M9 | Dockerfile, healthcheck, docker-compose |
| M10–M11 | Playwright config with `webServer`, containerised test run |

The API was built and verified with real HTTP requests *before* any UI work, so
the OpenAPI document and any Zod schemas derive from captured responses rather
than from a document.

**Open question:** live-reload inside Docker. Bind-mounting `app/` with the Vite
dev server would give hot reload in the container at the cost of a second
compose profile. Deliberately not done — `npm run app:dev` on the host covers
it, and the container only ever needs to serve the built app.
