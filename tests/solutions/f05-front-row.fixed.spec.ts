import { expect, test } from '@fixtures/test-options';

/** Reference fix for FLAKY-05 — spoiler, see docs/solutions.md. */

test('FIXED-05a: holding two seats shows the total', { tag: ['@e2e', '@fixed'] }, async ({
  eventPage,
  seats,
}) => {
  await eventPage.goto('indie-rock-night');
  await eventPage.holdSeats(seats);

  await expect(eventPage.holdCountdown).toBeVisible();
  await expect(eventPage.payButton('€60')).toBeEnabled();
});

test('FIXED-05b: seats can be booked and paid for', { tag: ['@e2e', '@fixed'] }, async ({
  eventPage,
  orderPage,
  seats,
}) => {
  await eventPage.goto('indie-rock-night');
  await eventPage.holdSeats(seats);
  await eventPage.payButton('€60').click();

  await expect(orderPage.confirmedHeading).toBeVisible({ timeout: 10_000 });
});
