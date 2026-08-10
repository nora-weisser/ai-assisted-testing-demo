# Smoke Test Plan

The minimum set that proves a build is worth testing further: the app serves,
the API answers, and every core todo action works on its happy path. Variations,
boundaries and error paths are out of scope here.

## Rules

- Import `test`/`expect` from `fixtures/pom/test-options` only.
- Exactly two tags: one level tag (`@e2e` or `@api`) plus `@public`.
- Locators: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText`. No `getByTestId`.
- Web-first assertions only. No `waitForTimeout`.
- State resets before every test via the `page`/`api` fixtures.

## Cases

- **TC-S01 — App shell renders with the empty state** `@e2e @public`
  Heading, input, Add button and the empty-state message are visible; counter reads `0 items left`.
  Proves the bundle mounts and `GET /api/todos` resolved.

- **TC-S02 — Add a todo** `@e2e @public`
  Fill `What needs to be done?`, click **Add**. Item appears in the list, input clears,
  counter reads `1 item left`.

- **TC-S03 — Remove a todo** `@e2e @public`
  Click **Delete _title_** on an existing item. The row disappears and the count drops.

- **TC-S04 — Edit a todo** `@e2e @public`
  Click **Edit _title_**, type a new title, press `Enter`. The new title renders and the old one is gone.

- **TC-S05 — Complete a todo** `@e2e @public`
  Check the item's checkbox. It becomes checked and the counter decrements.

- **TC-S06 — Filter todos** `@e2e @public`
  With one active and one completed item, click **Active** then **Completed**.
  Each view shows only its matching item, the URL becomes `/active` / `/completed`,
  and the chosen link carries `aria-current="page"`.

- **TC-S07 — Clear completed** `@e2e @public`
  With one active and one completed item, click **Clear completed**. The completed item is
  removed, the active one survives, and the button disappears.

- **TC-S08 — Health endpoint reports ok** `@api @public`
  `GET /api/health` returns `200` and `{ status: "ok" }`. Proves the server is up
  independently of the UI.

Each UI case sets up its own data through the API calls rather than through the
form, so a broken **Add** fails TC-S02 alone instead of cascading through the suite.
