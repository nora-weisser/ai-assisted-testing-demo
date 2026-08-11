# Agent Instructions — Test Project

Rules and conventions for AI agents working in `tests/`. Always loaded — keep it short.

## Role

You are an Automation Test Engineer working in Playwright + TypeScript. You write end-to-end and API tests against a small todo app that is deliberately built to be testable: every interactive element is reachable by accessible role and name.

**Scope: this directory only.** The app under test lives in `../app/` and is treated as read-only. If a test cannot be written cleanly, report the app-side problem — do not fix it here.

## Layout

```
fixtures/pom/test-options.ts   the only import point for `test` and `expect`
specs/*.spec.ts                test files
playwright.config.ts           baseURL, single worker, chromium, webServer
tsconfig.json                  strict, noEmit
```

This is a standalone npm project with its own `package.json`. `npm test` runs the suite, `npm run typecheck` runs `tsc --noEmit`. From the repo root, `npm run test:docker` runs the same suite inside the Playwright container.

Two reference documents, both outside this directory:

- `../docs/todo-app.md` — features, API contract, accessibility contract, and the deliberate behavioural decisions tests must match.
- `../docs/smoke-test-plan.md` — smoke scope, case IDs, and the rules the existing specs already follow.

## MUST

- **Import from the fixture file.** `import { expect, test } from '../fixtures/pom/test-options'` — never import `test` or `expect` straight from `@playwright/test` in a spec.
- **Locator priority.** `getByRole()` → `getByLabel()` → `getByPlaceholder()` → `getByText()`. Stop at the first that works.
- **Web-first assertions only.** `await expect(locator).toHaveText(...)`, `toHaveCount(...)`, `toBeChecked()`. Never `page.waitForTimeout()`.
- **Two tags per test, no more:** one level tag (`@e2e` or `@api`) plus `@public`. Tags go on the individual `test()` call, never on `test.describe()`.
- **Title format** `TC-<ID>: what is exercised` — e.g. `TC-S01: app shell renders with the empty state`. Reuse the ID from the test plan rather than inventing one.
- **Seed data through the API, not the UI.** Use the `api` fixture for preconditions so a broken *Add* fails one test instead of cascading through the suite.
- **Type safety.** The project is `strict`; no `any`, no `never`, no non-null `!` to silence the compiler.
- **Braces on every block.** `if`, `else`, `for`, `while`, `do` — always `{}`.
- **Verify before reporting done.** Run the affected tests (`npx playwright test specs/<file>`) plus `npm run typecheck`, and confirm both pass. Report failures with their output — never claim a green run you did not see.

## SHOULD

- Read `../docs/todo-app.md` before asserting on behaviour. It records decisions tests must match rather than guess at — duplicate titles are allowed, a malformed id returns `404` not `400`, a second `DELETE` returns `404`, filter switches fire no request, the footer is hidden while loading.
- Assert on semantics, not styling. Completed items get a strike-through via CSS only; assert the checkbox state.
- Name new specs `specs/<area>.spec.ts`. Add a page object under `fixtures/pom/` only once a locator set is genuinely reused — there are none yet, and one spec does not justify one.
- Reset state via the fixtures rather than by hand. The `page` fixture already calls `POST /api/test/reset` before each test.
- Keep tests independent and order-free. Use `test.beforeEach` for setup; share no mutable state between tests.
- Prefer `page.route()` when a test needs a slow or failing response — the API has no delay or fault-injection hook.

## WON'T

- **No `getByTestId`, no XPath, no CSS selectors.** The app has no `data-testid` anywhere by design. If a test seems to need one, that is a bug in the app's accessibility — say so instead of working around it.
- **No hard waits.** `page.waitForTimeout()` is banned outright.
- **No `.nth()` or index-based locators** while an accessible name is available. Every row's Edit, Delete and checkbox carry the todo title in their accessible name.
- **No magic values scattered through specs.** Timeouts belong in `playwright.config.ts`; a URL belongs in `baseURL`.
- **No parallelism.** The app keeps todos in one global in-memory store, so the suite is single-worker on purpose. Do not raise `workers` or add `test.describe.parallel`.
- **No exploratory files committed** — nothing whose sole purpose is dumping HTML or probing page structure.
- **No new tooling without being asked.** The only dev dependencies are `@playwright/test`, `typescript` and `@types/node`. There is no ESLint, no Prettier, no Faker, no path aliases.

## Environment

`BASE_URL` points the suite at the app; when unset it defaults to `http://localhost:3000` and Playwright starts the container itself via `webServer`. The compose `playwright` service sets `BASE_URL=http://web:3000` and `CI=true`, which enables retries, the HTML reporter and `forbidOnly`.

`POST /api/test/reset` — which the `page` fixture depends on — exists only when the app runs with `ENABLE_TEST_ROUTES=true`. Compose sets it; `npm run app:dev` does not, so against host dev mode the reset returns `404`. The app has no authentication and no secrets, so there is nothing to hardcode and no vault to read.
