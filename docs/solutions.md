# Flaky Test Lab — Solutions

Spoilers for [exercises.md](exercises.md). Each reference fix lives in
`tests/solutions/` and runs with:

```bash
cd tests && npm run test:solutions     # all fixes, --repeat-each=20
```

Verified against the unmodified app before publishing: 120 of 120 runs passed
(`--repeat-each=20`), and the exercise-05 fix also passed 5 of 5 plain runs.
The exercise-04 fix was also run against the production hold length
(`HOLD_SECONDS=300`): 10 of 10.

| # | Category | Root cause in one line | Fix |
| --- | --- | --- | --- |
| 01 | Waiting for the wrong thing | `waitForResponse` matched the page's initial, unfiltered load, then the list was read once | Web-first `toHaveText([...])` on the result headings |
| 02 | Optimistic UI | `aria-pressed` flips before the save; the reload races the `PUT` | Wait for the `PUT` response before reloading |
| 03 | Eventual consistency | A fixed 1 s sleep for work that takes 0.3–2 s | `expect.poll` until `confirmed` |
| 04 | Real time in tests | 10.2 s measured from the click; the hold starts 50–350 ms later | `page.clock.install()` + `fastForward` |
| 05 | Shared test data | Two parallel tests booking the same hard-coded seats | Book through the `seats` fixture |

---

## 01 — Waiting for the wrong response

**What happens.** The page fetches `/api/events` on load. The test checks the
heading and search box (both render before that fetch returns), types "jazz",
then registers `waitForResponse(url includes '/api/events')`. If the initial
fetch is still in flight, *that* is the response it catches: the unfiltered
list. It then reads the headings once with `allTextContents()`, which doesn't
retry, and gets six events. When the initial load happens to finish first, the
wait matches the search response instead and the test passes.

**Evidence in the trace.** In a failing run, the awaited response's URL has no
`?q=jazz`, and the DOM snapshot at the assertion shows six cards.

**Fix.**

```ts
await eventsPage.goto();
await eventsPage.search('jazz');

await expect(eventsPage.cards.getByRole('heading')).toHaveText([
  'Late Night Jazz Trio',
  'Jazz Under the Stars',
]);
await expect(eventsPage.summary).toHaveText('Showing 2 events');
```

**Why it works.** The assertion is the wait. It retries until the DOM shows the
expected result, regardless of debounce or latency.

**Partial fixes to watch for.** Tightening the predicate to `q=jazz` makes this
specific test pass, but leaves the one-shot `allTextContents()` read in place:
"the response has arrived" is not the same as "the DOM has updated". Waiting
for the summary to read `Showing 2 events` and *then* reading once is fine.

---

## 02 — Optimistic UI and the reload race

**What happens.** The favourite button is optimistic: `aria-pressed` becomes
`true` on click, before the `PUT /api/favourites/folk-on-the-canal` has
reached the server. The test's first assertion therefore passes immediately and
proves nothing about persistence. `page.reload()` then starts a fresh
`GET /api/events`. Both requests get random latency. If the `GET` is handled
before the `PUT`, the page renders `isFavourite: false`, and that is what the
test sees.

**Evidence in the trace.** In failing runs the `PUT` finishes after the `GET`
that follows the reload.

**Fix.**

```ts
const saved = page.waitForResponse(
  (response) =>
    response.url().endsWith('/api/favourites/folk-on-the-canal') &&
    response.request().method() === 'PUT',
);
await eventsPage.favouriteButton(event).click();
expect((await saved).status()).toBe(204);

await page.reload();
await expect(eventsPage.favouriteButton(event)).toHaveAttribute('aria-pressed', 'true');
```

**Alternative.** Poll the API until it agrees, then reload:
`await expect.poll(async () => isFavourite(api)).toBe(true)`.

**Discussion point.** Is this a test bug or an app bug? A real user who
favourites and immediately refreshes loses the favourite too. The test should
be fixed either way, but the race is also worth reporting.

---

## 03 — Sleeping through eventual consistency

**What happens.** `POST /api/orders` returns `202 Accepted`: the order exists
but payment hasn't been confirmed. Confirmation happens 300–2000 ms later. The
test sleeps exactly 1 s, so it passes whenever processing is fast. The comment
("normally lands well within a second") is the assumption that broke.

**Fix.**

```ts
await expect
  .poll(async () => (await fetchOrder()).status, {
    message: `order ${order.id} should be confirmed by the payment provider`,
    timeout: 10_000,
  })
  .toBe('confirmed');
```

**Why it works.** It waits only as long as needed, and fails with a named,
explicit message if confirmation never comes.

**Partial fixes to watch for.** A 3 s sleep passes 20 of 20, because the
documented maximum is 2 s. It's still wrong: slower every run, and it breaks as
soon as the provider gets slower. `--repeat-each` can't catch that, which makes
it a good discussion point about what "verified" means.

---

## 04 — Real time vs. a fake clock

**What happens.** `holdSeats()` returns when the click has been dispatched. The
hold starts when the server answers, 50–350 ms later, and the app's timer only
checks once per second after that. "10 s + 200 ms margin" counted from the click
is enough only when the hold request was fast.

**Fix.**

```ts
await page.clock.install();              // before the page loads

await eventPage.goto('warehouse-techno');
await eventPage.holdSeats(seats);
await expect(eventPage.holdCountdown).toBeVisible();

await page.clock.fastForward('05:01');   // longer than any hold

await expect(eventPage.alert).toHaveText('Your hold expired and the seats were released.');
await expect(eventPage.seat(seats[0])).toBeEnabled();
```

**Why it works.** The countdown runs on the browser's `Date` and `setInterval`,
which `page.clock` controls. Fast-forwarding fires the next tick, which sees the
deadline has passed. The app then calls `DELETE /api/holds/:id` for real, so the
server side is exercised too. The test drops from ~11 s to ~1 s and no longer
depends on `HOLD_SECONDS`.

**Partial fixes to watch for.** `await expect(alert).toBeVisible({ timeout: 15_000 })`
is stable at `HOLD_SECONDS=10`, but still takes 10+ seconds and breaks if the
setting changes. Installing the clock *before* `goto` is the safe habit: the
fake clock only controls timers created after it is installed. Here, installing
it after `goto` happens to work too (20 of 20), because the countdown timer is
only created when the hold starts. Worth asking the group why.

---

## 05 — Two tests, one seat

**What happens.** Both tests book `A1` and `A2` on Indie Rock Night. The suite
runs two workers with `fullyParallel`, so the two tests usually run at the same
time, as two different customers. Seats are shared by all customers. The loser
fails in one of two ways:

- **Lost the race at "Hold seats"**: the hold request is rejected with `409`,
  the "someone else just took one of those seats" alert appears, and the
  countdown never shows (5 s assertion timeout).
- **Arrived after the other test held or bought the seats**: `Seat A1` is
  already disabled when the page loads, and `click()` waits for it to become
  enabled until the 30 s test timeout. The seat map isn't live, so it never does.

Which test fails depends on which one reaches the server first.

**Why `--repeat-each` hides it.** Measured: plain runs of the file failed 6 of
6 times, while `--repeat-each=20` failed only 3–4 of 40 test runs. Collisions
need 05a and 05b to overlap in time. A plain run with two workers starts them
side by side. With 40 queued copies, the workers drift out of step and the
overlap becomes occasional. The lesson: `--repeat-each` is the right tool for
timing flakes, but not for flakes caused by *which tests run together*.

**Fix.** Use the `seats` fixture, as `tests/AGENTS.md` requires:

```ts
test('FIXED-05a: holding two seats shows the total', async ({ eventPage, seats }) => {
  await eventPage.goto('indie-rock-night');
  await eventPage.holdSeats(seats);
  ...
});
```

Each parallel slot gets its own row (`A1/A2`, `B1/B2`, …), so tests running at
the same time never compete for a seat. After each test, the fixture resets
that customer, which frees their seats for the next test in the same slot.

**Not fixes.** `--workers=1` and `test.describe.configure({ mode: 'serial' })`
both make it pass by giving up parallelism, and the second one breaks again as
soon as another file books A1 on the same event.

**Discussion point.** If the test is really about the *front row*, a seat
collision is something users can hit too. The app's 409 handling deserves its
own deliberate test, with two request contexts in sequence. `TC-S04` in
`smoke.spec.ts` does exactly that.
