# Smoke Test Plan

The minimum set that proves a build is worth testing further: the app serves,
the API answers, and every core customer journey works on its happy path.
Variations, boundaries and error paths are out of scope here.

## Rules

- Import `test`/`expect` from `@fixtures/test-options` only.
- Exactly two tags: one level tag (`@e2e` or `@api`) plus `@smoke`.
- Locators: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText`. No `getByTestId`.
- Web-first assertions only. No `waitForTimeout`, no retries.
- Book seats through the `seats` fixture; seed and check through the `api` fixture.
- Every case must pass `--repeat-each=20`.

## Cases

### Automated — `tests/specs/smoke.spec.ts`

- **TC-S01 — The event list shows every upcoming event** `@e2e @smoke`
  Heading **Upcoming events** is visible, the summary reads `Showing 6 events`, six cards render.

- **TC-S02 — Searching narrows the event list** `@e2e @smoke`
  Search `folk`. One card, **Folk on the Canal**, and the summary reads `Showing 1 event`.

- **TC-S03 — A customer can hold seats and pay for them** `@e2e @smoke`
  Hold two seats on Late Night Jazz Trio, click **Pay €70**. **Booking confirmed** appears with a ticket code.

- **TC-S04 — A seat held by one customer cannot be held by another** `@api @smoke`
  The first `POST /api/holds` returns `201`; a second customer holding one of the same seats gets `409 SEAT_UNAVAILABLE`.

- **TC-S05 — Health endpoint reports ok** `@api @smoke`
  `GET /api/health` returns `200` and `{ status: "ok" }`.

### Not yet automated

- **TC-S06 — A favourite survives a reload** `@e2e @smoke`
  Click **Favourite _event_** on any event, reload the page. The button still has `aria-pressed="true"`.

- **TC-S07 — Released seats go back on sale** `@e2e @smoke`
  Hold two seats, click **Release seats**. The countdown disappears and both seats are enabled again.

- **TC-S08 — The booking shows what was paid for** `@e2e @smoke`
  Hold two seats on Indie Rock Night and pay. The confirmed booking lists both seats and **Total paid** `€60`.

- **TC-S09 — A search with no matches says so** `@e2e @smoke`
  Search `opera`. No cards render and the page reads `No events match “opera”.`

- **TC-S10 — An expired hold releases its seats** `@e2e @smoke`
  Hold two seats and let the hold expire. The alert reads `Your hold expired and the seats were released.` and both seats are enabled again.

Each case sets up its own data through the fixtures rather than depending on
another case, so a broken **Hold seats** fails its own cases instead of
cascading through the suite.
