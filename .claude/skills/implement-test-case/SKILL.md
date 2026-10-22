---
name: implement-test-case
description: Implement a test case from docs/test-plan.md by its ID (e.g. TC-S06), exploring the real UI with playwright-cli before writing any test code. Use whenever a case ID from the test plan is to be automated, or a new spec is added to tests/specs.
allowed-tools: Read Grep Glob Edit Write Bash(npm:*) Bash(npx:*) Bash(curl:*) Bash(playwright-cli:*)
---

# Implementing a test case from the plan

Given a case ID such as `TC-S06`, produce the spec that automates it — and nothing more than it.

## 1. Read before writing

- `docs/test-plan.md` — the case's own line: what it does and what it asserts. Do not widen the case beyond it.
- `AGENTS.md` — the MUST/SHOULD/WON'T rules and "How the app behaves". They are binding, not advisory.
- `docs/app.md` §2 (screens) and §6 (behavioural decisions) — behaviour the test must match rather than guess at.
- `tests/specs/*.spec.ts` and `tests/pages/*.ts` — match the shape of what is already there.

## 2. Explore the real UI — before writing any test code

Use the `playwright-cli` skill to drive the running app (`npm run app:up`) through whatever this case actually does, and read the emitted snapshot at each step.

The point is to replace assumptions with observations. Never infer from the docs alone:

- the role and accessible name of any control the test touches;
- the exact text of anything the test asserts on;
- what actually changes after each step — what appears, what disappears, what the URL does, which requests fire.

Front Row specifics while exploring:

- The browser session is its own customer (`fr_uid` cookie). Data seeded with `curl` belongs to a *different* customer, so create holds and favourites in the browser.
- Seats are shared with the test suite. Explore on row `F`, which parallel test workers don't use.

Close the browser when done. The `.playwright-cli/` snapshots are gitignored — leave no exploratory files behind.

## 3. Implement

- Spec under `tests/specs/`, title `<TC-ID>: what is exercised`, exactly two tags: one level tag (`@e2e` or `@api`) plus `@smoke`.
- Book seats through the `seats` fixture. Seed and check preconditions through the `api` fixture — it is the same customer as the page.
- Reach elements through the page objects. If the case needs a control they lack, add it there — locators and actions only, no assertions, and nothing the specs do not use.
- Locators: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText`, stopping at the first that works. No `getByTestId`, no CSS, no XPath, no `.nth()`.
- Web-first assertions only. Respect the timing in "How the app behaves":
  - optimistic UI isn't proof the server stored anything — wait for the write's response before a reload or an API check;
  - `202` means not done yet — `expect.poll` until the state you assert on;
  - timers run on the browser clock — use `page.clock`, never wait in real time.
- End on an assertion, not a bare action — a trailing click can leave its request in flight when the test finishes.

## 4. Verify — then report

```bash
cd tests && npm run typecheck && npx playwright test specs/<file>.spec.ts --repeat-each=20
```

Both must pass, 20 of 20. Report the actual pass count; never claim a green run you did not see. If the case cannot be written cleanly because of an app-side problem — a missing accessible name, an ambiguous role — say so and stop. `app/` is read-only.
