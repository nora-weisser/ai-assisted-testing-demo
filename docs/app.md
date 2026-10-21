# Front Row — Application Reference

A small concert-ticket app built for one job: teaching how to find and fix
**flaky tests** with an AI agent. Nothing in it is broken. Every behaviour that
makes a test flaky here is something real apps do on purpose: variable network
latency, debounced search, optimistic UI, expiring reservations, background
payment processing, and inventory shared between users.

**Stack:** React + TypeScript + Vite (UI) · Express + TypeScript (in-memory REST API) · Docker Compose · Playwright

---

## 1. Running it

| Command | What it does |
| --- | --- |
| `npm run app:up` | Builds and starts the container on <http://localhost:3000>. Blocks until healthy. |
| `npm run app:down` | Stops it and removes volumes. |
| `npm run app:dev` | API + Vite on the host with hot reload (UI on :5173, API on :3000), test settings applied. |

### Configuration

| Var | Default | Compose | Purpose |
| --- | --- | --- | --- |
| `LATENCY_MS` | `50-350` | `50-350` | Random delay added to every `/api` response (not `/api/health` or `/api/test/*`). `0` turns it off. |
| `HOLD_SECONDS` | `300` | `10` | How long a seat hold lasts. |
| `PAYMENT_PROCESSING_MS` | `300-2000` | `300-2000` | Delay before a pending order is confirmed. |
| `ENABLE_TEST_ROUTES` | `false` | `true` | Mounts `/api/test/*`. |

Setting `LATENCY_MS=0` is a good demo: exercises 01, 02 and 04 start passing
every time, which is exactly why such tests slip through on a fast laptop and
fail in CI. Exercises 03 and 05 keep failing: payment processing and shared
seats don't depend on the network.

---

## 2. Screens

### `/` — Upcoming events

- Searchbox **"Search events"**, debounced by **300 ms**. Each new search aborts the previous request, so results never arrive out of order.
- A `role="status"` summary: `Loading events…`, then `Showing N events`. It keeps the old count while a search is in flight.
- A list named **"Events"** of six cards. Each card has a level-2 heading with a link to the event.
- A **"Favourite {event name}"** toggle button per card, with `aria-pressed`. **Optimistic**: it flips on click and the `PUT`/`DELETE` is sent in the background; it flips back if the request fails.

### `/events/:id` — Seats and checkout

- A group named **"Seats"** with 48 buttons, **"Seat A1"** … **"Seat F8"** (rows A–F, 8 per row). `aria-pressed` = selected; `disabled` = held or sold by someone, or while a hold is active.
- **"Hold seats"** creates a hold. While a hold is active:
  - a `role="status"` countdown **"Hold expires in m:ss"**, ticking once per second on the browser's clock;
  - **"Pay €N"** (the name carries the total) and **"Release seats"**.
- When the countdown reaches zero, the app shows the alert **"Your hold expired and the seats were released."**, calls `DELETE /api/holds/:id` and reloads the seat map.
- If another customer got there first: alert **"Sorry, someone else just took one of those seats. Please choose again."**
- Seat availability is loaded once on arrival and after each action. It is **not** live: a seat taken by someone else stays enabled until the page reloads it.

### `/orders/:id` — Booking

- Heading **"Processing your payment…"** while the order is `pending`. The page polls every 500 ms.
- Then heading **"Booking confirmed"** with the ticket code (`FR-` + 6 hex characters), seats and total.

---

## 3. Customers, seats and isolation

There is no login. The first `/api` request from a browser sets an `fr_uid`
cookie, and holds, orders and favourites belong to that id. In Playwright, every
test gets a new browser context, so **every test is a new customer**.

**Seats are global.** If two customers try to hold the same seat, the second
gets `409 SEAT_UNAVAILABLE`. With tests running in parallel, two tests that use
the same seat on the same event will collide. The `seats` fixture avoids this
by giving each parallel worker its own row.

---

## 4. API

Base path `/api`. JSON in and out. Error shape everywhere:

```json
{ "error": { "code": "SEAT_UNAVAILABLE", "message": "seat no longer available: A1", "seats": ["A1"] } }
```

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| `GET` | `/events?q=` | `200` → `EventSummary[]` sorted by date | — |
| `GET` | `/events/:id` | `200` → `EventSummary` + `seats: {id, status, mine}[]` | `404` |
| `PUT` | `/favourites/:eventId` | `204` | `404` unknown event |
| `DELETE` | `/favourites/:eventId` | `204` | `404` unknown event |
| `POST` | `/holds` `{eventId, seats[]}` | `201` → `{id, eventId, seats, expiresAt, expiresInMs}` | `400` invalid, `404` event, `409 SEAT_UNAVAILABLE` |
| `GET` | `/holds/:id` | `200` | `404` unknown, expired or not yours |
| `DELETE` | `/holds/:id` | `204` | `404` |
| `POST` | `/orders` `{holdId}` | **`202`** → `Order` with `status: "pending"`, `ticketCode: null` | `400`, `409 HOLD_EXPIRED` |
| `GET` | `/orders` | `200` → your orders | — |
| `GET` | `/orders/:id` | `200` → `Order` | `404` unknown or not yours |
| `GET` | `/health` | `200` → `{"status":"ok"}` | — |
| `GET` | `/config` | `200` → `{"holdSeconds": n}` | — |
| `POST` | `/test/reset` | `204` — deletes the **calling customer's** holds, orders and favourites, and frees their seats | `404` when test routes are off |
| `POST` | `/test/reset-all` | `204` — empties the store for everyone | `404` when test routes are off |

`EventSummary` = `{ id, name, artist, venue, startsAt, genre, price, isFavourite, seatsAvailable }`.
`Order` = `{ id, eventId, seats, total, status: "pending" | "confirmed", ticketCode, createdAt }`.

`/health`, `/config` and `/test/*` respond without the simulated latency.

---

## 5. Events

| id | Name | Genre | Price |
| --- | --- | --- | --- |
| `late-night-jazz-trio` | Late Night Jazz Trio | Jazz | €35 |
| `jazz-under-the-stars` | Jazz Under the Stars | Jazz | €45 |
| `indie-rock-night` | Indie Rock Night | Rock | €30 |
| `beethoven-ninth` | Beethoven: Symphony No. 9 | Classical | €60 |
| `warehouse-techno` | Warehouse Techno | Electronic | €40 |
| `folk-on-the-canal` | Folk on the Canal | Folk | €25 |

Search matches name, artist, genre and venue, case-insensitively.

---

## 6. Behavioural decisions

| Decision | Why it matters for tests |
| --- | --- |
| **Latency on every API call** | A test that is correct only on a fast network is a flaky test. |
| **`POST /orders` returns `202`, not `201`** | The order exists but is not confirmed yet. Tests must wait for `confirmed`. |
| **Hold countdown runs on the browser clock** | The deadline is `Date.now() + expiresInMs`, so `page.clock` controls it completely. |
| **Holds also expire on the server** | Checked lazily on every read. A test that only fast-forwards the browser clock still sees the server release the seats, because the UI calls `DELETE /holds/:id` on expiry. |
| **Seat map is not live** | A test that waits for a seat to become enabled after *another customer* frees it will wait forever. |
| **Per-customer reset** | The fixture resets after each test, so parallel tests never wipe each other's data. Only seats are shared. |
