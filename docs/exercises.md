# Flaky Test Lab — Exercises

Playwright tests in `tests/specs/flaky/` that pass *some* of the time.
Your job is to find out why each one is flaky and fix it, with an AI agent
doing the investigation.

The app is not broken. Every one of these tests makes an assumption about
timing or shared data that is true on a good day and false on a bad one.

---

## Setup

```bash
npm run app:up            # starts Front Row on http://localhost:3000
cd tests && npm install
npm run test:smoke        # 5 tests, should be green — your baseline
```

Start your agent **in `tests/`**, so it loads `CLAUDE.md` → `AGENTS.md`.

Have a look at the app in a browser first. Search for something, favourite an
event, hold some seats, pay. Two minutes of clicking explains most of what
follows.

## Rules of the game

1. **Prove it's flaky before you fix it.** One run tells you nothing. Use
   `--repeat-each=20` (or run it several times) and write down the pass count.
2. **Find the cause, not a workaround.** These don't count as fixes: retries,
   `waitForTimeout`, a sleep, a bigger timeout "to be safe", `workers: 1`,
   serial mode. The AI will suggest some of these. Push back.
3. **Prove the fix.** The fixed test must pass `--repeat-each=20` (exercise
   05: several plain runs). Then explain *why* it was flaky in one sentence.
4. **Don't touch `app/`.** The app is the system under test.

Every failed run keeps a trace in `test-results/`. That's your evidence.

---

## Exercise 01 — The search that sometimes works

**File:** `specs/flaky/f01-search.spec.ts` · **Level:** warm-up · **Fails:** most runs (measured 15–19 of 20)

Searching for "jazz" should show two events. The test waits for the search
response before checking. Usually it sees all six events instead.

```bash
npx playwright test specs/flaky/f01-search.spec.ts --repeat-each=20
```

**Starter prompt**

```
specs/flaky/f01-search.spec.ts is flaky: it fails most of the time, but not always.
Reproduce it with --repeat-each=20, open the trace of a failing run, and tell me
which network response the test was actually waiting for. Then fix the test
without adding any waits, and prove the fix with --repeat-each=20.
```

<details><summary>Hint 1</summary>

How many requests to `/api/events` does this page make, and in what order?

</details>

<details><summary>Hint 2</summary>

Compare the URL of the response the test waited for, in a failing trace and a passing one.

</details>
