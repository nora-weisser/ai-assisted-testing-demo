# Flaky Test Lab — Exercises

Playwright tests in `tests/specs/flaky/` that pass *some* of the time.
Your job is to find out why each one is flaky and fix it, with an AI agent
doing the investigation.

The app is not broken. Every one of these tests makes an assumption about
timing or shared data that is true on a good day and false on a bad one.

Answers are on the `solutions` branch (`git checkout solutions`). Try first.

---

## Setup

```bash
npm run app:up            # starts Front Row on http://localhost:3000
cd tests && npm install
npx playwright install chromium   # the browser; npm install doesn't download it
npm run test:smoke        # 5 tests, should be green — your baseline
```

Start your agent **at the repo root**, so it loads `CLAUDE.md` → `AGENTS.md` and the skills.
The commands below run from `tests/`; the starter prompts use repo-root paths.

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
tests/specs/flaky/f01-search.spec.ts is flaky: it fails most of the time, but not always.
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

---

## Exercise 02 — The favourite that forgets

**File:** `specs/flaky/f02-favourite.spec.ts` · **Level:** medium · **Fails:** roughly 1 run in 3 (measured 5–9 of 20)

Favourite an event, reload, it should still be a favourite. The test even
checks the button is pressed before reloading. Sometimes, after the reload,
it isn't.

```bash
npx playwright test specs/flaky/f02-favourite.spec.ts --repeat-each=20
```

**Starter prompt**

```
tests/specs/flaky/f02-favourite.spec.ts fails about a third of the time. Reproduce it,
then compare the network activity in a failing trace and a passing trace. The test
asserts aria-pressed="true" before reloading — explain why that assertion doesn't
protect it. Fix the test, not the app.
```

<details><summary>Hint 1</summary>

Read the "Favourite" button in `docs/app.md`. When does `aria-pressed` change, relative to the request?

</details>

<details><summary>Hint 2</summary>

In a failing trace, find the `PUT /api/favourites/…` request. When did it finish, compared to the reload's `GET /api/events`?

</details>

---

## Exercise 03 — Payment, usually

**File:** `specs/flaky/f03-payment.spec.ts` · **Level:** medium · **Fails:** roughly 1 run in 2 (measured 7–15 of 20)

An API test: hold seats, create an order, check it was confirmed with a ticket
code. There's a comment explaining why one second is enough.

```bash
npx playwright test specs/flaky/f03-payment.spec.ts --repeat-each=20
```

**Starter prompt**

```
tests/specs/flaky/f03-payment.spec.ts is an API test that fails about half the time.
Read docs/app.md for how orders are processed, then explain the failure. Replace
the sleep with something that waits exactly as long as needed and no longer, and
gives a useful message if the order is never confirmed.
```

<details><summary>Hint 1</summary>

What HTTP status does `POST /api/orders` return, and what does that status mean?

</details>

<details><summary>Hint 2</summary>

Playwright has an assertion that repeatedly calls a function until its result matches.

</details>

---

## Exercise 04 — Waiting for the clock

**File:** `specs/flaky/f04-hold-expiry.spec.ts` · **Level:** medium–hard · **Fails:** roughly 1 run in 2 (measured 4–7 of 10) · **Takes:** ~11 s per run

Hold two seats, let the hold expire, check the seats are released. The test
waits 10.2 seconds: the 10-second hold plus a safety margin.

```bash
npx playwright test specs/flaky/f04-hold-expiry.spec.ts --repeat-each=10
```

**Starter prompt**

```
tests/specs/flaky/f04-hold-expiry.spec.ts waits 10.2 s for a 10 s seat hold to expire, and
fails about half the time. Explain where the margin goes. Then rewrite it so
it doesn't wait in real time at all, and so it would still pass if HOLD_SECONDS
were changed to 300.
```

<details><summary>Hint 1</summary>

The 10.2 s starts when the click returns. When does the hold actually start?

</details>

<details><summary>Hint 2</summary>

The countdown runs on the browser's clock. Playwright can control that clock.

</details>

**Stretch:** once it's fixed, how long does the test take now?

---

## Exercise 05 — Front-row seats

**File:** `specs/flaky/f05-front-row.spec.ts` · **Level:** hard · **Fails:** most runs (measured 6 of 6 plain runs), and not always the same test

Two tests, both booking seats A1 and A2. Each passes on its own. Run the file
and usually one of them fails — sometimes with an alert, sometimes with a
30-second timeout. Which one fails changes from run to run.

```bash
# Run it like CI would, several times. --repeat-each actually hides this one.
for i in 1 2 3 4 5; do npx playwright test specs/flaky/f05-front-row.spec.ts; done

# Now compare:
npx playwright test specs/flaky/f05-front-row.spec.ts --workers=1
npx playwright test specs/flaky/f05-front-row.spec.ts -g "05a"
```

**Starter prompt**

```
The two tests in tests/specs/flaky/f05-front-row.spec.ts each pass alone but one of them
fails in most runs of the file, and it isn't always the same one. Work out what the
two tests share and why the failure moves between them. Fix it so the tests can
keep running in parallel — "use one worker" is not the fix.
```

<details><summary>Hint 1</summary>

Each test is a separate customer. What do customers share?

</details>

<details><summary>Hint 2</summary>

Read `AGENTS.md` and `tests/fixtures/test-options.ts`. Is there a rule this file breaks?

</details>

**Stretch:** why does `--repeat-each=20` make this file look *more* stable than a plain run?

---

## Workshop variations

**Context makes the difference.** Run the same exercise twice in fresh agent
sessions: once with the "How the app behaves" section deleted from
`AGENTS.md`, once with it. Compare how fast the agent gets to the root
cause and how many workarounds it proposes first.

**Bad fix bingo.** Before fixing anything, ask the agent for "the quickest way
to make this test pass". Collect what it suggests (retries, longer timeouts,
`waitForTimeout`, `workers: 1`…), then run each one with `--repeat-each=20`.
Some will seem to work and only make the flake rarer.

**Turn off the network.** Restart the app with `LATENCY_MS=0 npm run app:up`
and rerun the flaky folder. Exercises 01, 02 and 04 go green; 03 and 05 keep
failing. Why those two? (This is why "works on my machine" happens, and why it
doesn't explain every flake.)

**Use the skill.** `.claude/skills/fix-flaky-test/` is a workflow for
exactly this job. Run an exercise without it, then with it, and compare.
