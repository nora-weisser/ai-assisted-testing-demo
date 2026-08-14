---
name: implement-test-case
description: Implement a test case from docs/smoke-test-plan.md by its ID (e.g. TC-S04), exploring the real UI with playwright-cli before writing any test code. Use whenever a case ID from the test plan is to be automated, or a new spec is added to tests/specs.
allowed-tools: Read Grep Glob Edit Write Bash(npm:*) Bash(npx:*) Bash(curl:*) Bash(playwright-cli:*)
---

# Implementing a test case from the plan

Given a case ID such as `TC-S04`, produce the spec that automates it — and nothing more than it.

## 1. Read before writing

- `docs/smoke-test-plan.md` — the case's own line: what it does and what it asserts. Do not widen the case beyond it.
- `tests/AGENTS.md` — the MUST/SHOULD/WON'T rules. They are binding, not advisory.
- `docs/todo-app.md` §3.3 (testability contract) and §8 (behavioural decisions) — behaviour the test must match rather than guess at.
- `tests/specs/*.spec.ts` and `tests/pages/todo-page.ts` — match the shape of what is already there.

## 2. Explore the real UI — before writing any test code

Use the `playwright-cli` skill to drive the running app (`npm run app:up`) through whatever this case actually does. Seed any preconditions over the API, perform the case's steps in the browser, and read the emitted snapshot at each step.

The point is to replace assumptions with observations. Never infer from the docs alone:

- the role and accessible name of any control the test touches;
- the exact text of anything the test asserts on;
- what actually changes after each step — what appears, what disappears, what the URL does.

Whatever the case turns out to need, confirm it in the browser first. Close the browser when done. The `.playwright-cli/` snapshots are gitignored — leave no exploratory files behind.

## 3. Implement

- Spec under `tests/specs/`, title `<TC-ID>: what is exercised`, exactly two tags: one level tag (`@e2e` or `@api`) plus `@public`.
- Seed preconditions through the `api` fixture, never through the UI, then navigate.
- Reach elements through the page object. If the case needs a control it lacks, add it there — locators and actions only, no assertions, and nothing the specs do not use.
- Locators: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText`, stopping at the first that works. No `getByTestId`, no CSS, no XPath, no `.nth()`.
- Web-first assertions only. No `page.waitForTimeout()`.
- End on an assertion, not a bare action — a trailing click can leave its request in flight when the test finishes.

## 4. Verify — then report

```bash
cd tests && npm run typecheck && npx playwright test specs/<file>.spec.ts
```

Both must pass. Report the actual output; never claim a green run you did not see. If the case cannot be written cleanly because of an app-side problem — a missing accessible name, an ambiguous role — say so and stop. `../app/` is read-only.
