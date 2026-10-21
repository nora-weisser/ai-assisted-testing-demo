import { expect, test } from '@fixtures/test-options';
import type { ErrorResponse, HoldResponse } from '@support/api-types';

/** The stable baseline: the patterns the flaky specs get wrong. */

test('TC-S01: the event list shows every upcoming event', { tag: ['@e2e', '@smoke'] }, async ({
  eventsPage,
}) => {
  await eventsPage.goto();

  await expect(eventsPage.heading).toBeVisible();
  await expect(eventsPage.summary).toHaveText('Showing 6 events');
  await expect(eventsPage.cards).toHaveCount(6);
});

test('TC-S02: searching narrows the event list', { tag: ['@e2e', '@smoke'] }, async ({ eventsPage }) => {
  await eventsPage.goto();
  await expect(eventsPage.summary).toHaveText('Showing 6 events');

  await eventsPage.search('folk');

  await expect(eventsPage.cards).toHaveCount(1);
  await expect(eventsPage.card('Folk on the Canal')).toBeVisible();
  await expect(eventsPage.summary).toHaveText('Showing 1 event');
});

test('TC-S03: a customer can hold seats and pay for them', { tag: ['@e2e', '@smoke'] }, async ({
  eventPage,
  orderPage,
  seats,
}) => {
  await eventPage.goto('late-night-jazz-trio');
  await eventPage.holdSeats(seats);

  await expect(eventPage.holdCountdown).toBeVisible();
  await eventPage.payButton('€70').click();

  // Payment is confirmed in the background — the page polls until it is.
  await expect(orderPage.confirmedHeading).toBeVisible({ timeout: 10_000 });
  await expect(orderPage.ticketCode).toBeVisible();
});

test('TC-S04: a seat held by one customer cannot be held by another', { tag: ['@api', '@smoke'] }, async ({
  api,
  playwright,
  baseURL,
  seats,
}) => {
  const first = await api.post('/api/holds', { data: { eventId: 'jazz-under-the-stars', seats } });
  expect(first.status()).toBe(201);
  const hold = (await first.json()) as HoldResponse;
  expect(hold.seats).toEqual(seats);

  // A second customer is a second request context with its own cookie jar.
  const otherCustomer = await playwright.request.newContext({ baseURL });
  try {
    const second = await otherCustomer.post('/api/holds', {
      data: { eventId: 'jazz-under-the-stars', seats: [seats[0]] },
    });
    expect(second.status()).toBe(409);
    const body = (await second.json()) as ErrorResponse;
    expect(body.error.code).toBe('SEAT_UNAVAILABLE');
  } finally {
    await otherCustomer.post('/api/test/reset');
    await otherCustomer.dispose();
  }
});

test('TC-S05: health endpoint reports ok', { tag: ['@api', '@smoke'] }, async ({ api }) => {
  const response = await api.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});
