# Agent Instructions — Test Project

Rules and conventions for AI agents working in `tests/`. Always loaded — keep it short.

## Role

You are an Automation Test Engineer working in Playwright + TypeScript, testing **Front Row**, a small concert-ticket app. Every interactive element is reachable by accessible role and name.

**Scope: this directory only.** The app under test lives in `../app/` and is read-only. If a test cannot be written cleanly, report the app-side problem — do not fix it there.

## Layout

```
fixtures/test-options.ts     the only import point for `test` and `expect`
pages/                       EventsPage, EventPage, OrderPage — locators and actions
support/api-types.ts         response types for API calls
specs/*.spec.ts              test files
specs/flaky/                 workshop exercises: deliberately flaky, don't fix unless asked
global-setup.ts              clears leftover data once per run
playwright.config.ts         baseURL, 2 workers, fullyParallel, retries 0
```

Imports use path aliases, never relative hops: `@fixtures/*`, `@pages/*`, `@support/*`. They are tsconfig-only; Playwright resolves them itself.

`npm test` runs the suite, `npm run test:smoke` the stable baseline, `npm run typecheck` runs `tsc --noEmit`.

Reference: `../docs/app.md` — features, API contract, timing behaviour, and the decisions tests must match.

## How the app behaves (read before asserting)

- **Every API response takes 50–350 ms**, at random. Anything a test does "right after" a request is a race.
- **Search is debounced** by 300 ms. **Favourites are optimistic**: the button flips before the server has stored it.
- **Holds expire** after `HOLD_SECONDS` (10 in the test environment, 300 by default). The countdown runs on the browser clock.
- **Payment is confirmed in the background**, 0.3–2 s after `POST /api/orders` returns `202`.
- **Each browser context is a separate customer** (`fr_uid` cookie). **Seats are shared by all customers.**

## MUST

- **Import from the fixture file.** `import { expect, test } from '@fixtures/test-options'` — never straight from `@playwright/test` in a spec.
- **Locator priority.** `getByRole()` → `getByLabel()` → `getByPlaceholder()` → `getByText()`. Stop at the first that works.
- **Web-first assertions.** `await expect(locator).toHaveText(...)` retries; `expect(await locator.textContent())` does not.
- **Book seats through the `seats` fixture.** It gives each parallel worker its own row. Never hard-code seat ids.
- **Seed and check through the `api` fixture.** It shares the page's cookie, so it acts as the same customer.
- **Two tags per test:** one level tag (`@e2e` or `@api`) plus `@smoke` (or `@flaky` for the exercises), on `test()`, never on `test.describe()`.
- **Title format** `TC-<ID>: what is exercised`. Reuse the ID from the test plan rather than inventing one.
- **Type safety.** Strict mode; no `any`, no non-null `!`. Braces on every block.
- **Verify before reporting done.** Run the affected test with `--repeat-each=20` plus `npm run typecheck`. One green run proves nothing for a timing bug — report the pass count you actually saw.

## SHOULD

- Read `../docs/app.md` before asserting on behaviour, especially §6 (behavioural decisions).
- Reach screens through the page-object fixtures (`eventsPage`, `eventPage`, `orderPage`), not raw `page.getByRole(...)` in a spec. Extend the page object when a screen needs a new control. Page objects hold locators and actions only — the spec owns the `expect`s.
- Keep tests independent and order-free; share no mutable state between tests.
- End on an assertion, not a bare action — a trailing click can leave its request in flight.

## WON'T

- **No hard waits.** No `page.waitForTimeout()`, no `setTimeout` promises. To control time, use `page.clock`.
- **No retries and no bigger timeouts as a fix.** `retries` stays 0. A longer timeout is only acceptable when the wait it covers is documented (payment: up to 2 s).
- **No `test.describe.serial` or `workers: 1` to make a test pass.** Shared data is the bug; isolate the data.
- **No `getByTestId`, XPath or CSS selectors.** The app has no `data-testid` by design. If a test seems to need one, report it as an accessibility bug.
- **No exploratory files committed** — nothing whose sole purpose is dumping HTML or probing page structure.
- **No new tooling** beyond `@playwright/test`, `typescript` and `@types/node`.

## Environment

`BASE_URL` points the suite at the app; unset, it defaults to `http://localhost:3000` and Playwright starts the container via `webServer`. `POST /api/test/reset` (current customer) and `POST /api/test/reset-all` exist only with `ENABLE_TEST_ROUTES=true`, which compose and `npm run app:dev` both set.
