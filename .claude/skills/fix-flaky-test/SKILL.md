---
name: fix-flaky-test
description: Use when a Playwright test is flaky, intermittent, or "passes locally but fails in CI", or the user asks to stabilise, de-flake or investigate a test that sometimes fails. Reproduces the flake, finds the root cause from traces, fixes it without retries or sleeps, and proves the fix over repeated runs.
---

# Fix a flaky test

A flaky test is a test with a hidden assumption about timing or shared state.
The job is to find that assumption, not to make the symptom rarer.

## 1. Reproduce and measure

Never trust a single run. Run the test repeatedly and record the pass count:

```bash
npx playwright test <file> --repeat-each=20
```

If it never fails with `--repeat-each`, the flake may depend on which tests run
together. Run the whole file (or suite) several times without it, and compare
with `--workers=1` and with the test run alone (`-g "<title>"`):

- fails only alongside other tests → **shared state** (step 3, category E)
- fails alone too → **timing** (categories A–D)

Write the numbers down. They are the baseline the fix has to beat.

## 2. Collect evidence

Failed runs keep a trace (`trace: 'retain-on-failure'`). Passing runs don't —
add `--trace on` to the reproduce command to keep both. Read them from the CLI
with the `playwright-trace` skill, not the GUI viewer:

```bash
npx playwright trace open test-results/<failing-run>/trace.zip
npx playwright trace actions --errors-only    # which step failed
npx playwright trace requests --grep api      # what was in flight, in what order
npx playwright trace snapshot <action-id>     # the DOM at that step
```

Then open a passing trace and compare:

- **requests**: which were in flight at each step, and in what order they finished;
- **snapshot** at the failing assertion: what was actually on screen;
- **actions**: which step returned *before* the app had finished reacting.

State the root cause as one sentence: "The test does X assuming Y, but Y is only
true when Z."

## 3. Classify

| | Category | Typical smell | Typical fix |
| --- | --- | --- | --- |
| A | Snapshot read | `expect(await locator.textContent())`, `.count()`, `.isVisible()`, `allTextContents()` | Web-first assertion: `await expect(locator).toHaveText/...` |
| B | Waiting for the wrong signal | `waitForResponse` with a loose predicate, `networkidle`, waiting for an element that renders before the data | Assert on the outcome the user sees; if a request must finish, match it exactly and register the wait *before* the action |
| C | Optimistic UI / in-flight writes | UI changes before the server confirms, then a reload or API check | Wait for the write's response, or poll the API until it agrees |
| D | Real time | `waitForTimeout`, `setTimeout`, sleeps, "X seconds plus a margin" | `page.clock` for browser timers; `expect.poll` / `toPass` for server-side processing |
| E | Shared data | Hard-coded ids, global resets, tests that pass alone but fail together | Give each test or worker its own data (fixtures); scope cleanup to the test's own data |

Check the project's `AGENTS.md` and fixtures. Flaky tests often break a rule the
project already has.

## 4. Fix

Allowed: web-first assertions, `expect.poll`, `expect(...).toPass()`, precise
`waitForResponse` set up before the action, `page.clock`, fixtures that isolate
data, documented timeouts for documented waits.

Not a fix, never propose one as the answer:

- `retries`, `test.slow()`, or raising a timeout "to be safe";
- `page.waitForTimeout`, sleeps, or polling loops with a fixed delay;
- `workers: 1`, `test.describe.serial`, or `--workers=1`;
- skipping, `test.fixme`, or deleting the assertion that fails.

These make a flake rarer, slower, or invisible. If the user asks for one, say
what it hides before doing it.

If the root cause is in the app (a real race a user could hit), fix the test
anyway and report the app issue separately. Don't modify the app.

## 5. Prove it

Run the fixed test with the same method that reproduced the flake, at least 20
times, plus the project's typecheck. Report:

- before: N/M passed; after: M/M passed;
- the one-sentence root cause;
- why the fix removes the cause rather than reducing its probability.

If you didn't see a green repeated run, say so. Don't claim it.
