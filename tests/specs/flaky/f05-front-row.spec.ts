import { expect, test } from '@fixtures/test-options';

/** Flaky on purpose — workshop exercise 05, see docs/exercises.md. */

const FRONT_ROW = ['A1', 'A2'] as const;

test('FLAKY-05a: holding two front-row seats shows the total', { tag: ['@e2e', '@flaky'] }, async ({
  eventPage,
}) => {
  await eventPage.goto('indie-rock-night');
  await eventPage.holdSeats(FRONT_ROW);

  await expect(eventPage.holdCountdown).toBeVisible();
  await expect(eventPage.payButton('€60')).toBeEnabled();
});

test('FLAKY-05b: front-row seats can be booked and paid for', { tag: ['@e2e', '@flaky'] }, async ({
  eventPage,
  orderPage,
}) => {
  await eventPage.goto('indie-rock-night');
  await eventPage.holdSeats(FRONT_ROW);
  await eventPage.payButton('€60').click();

  await expect(orderPage.confirmedHeading).toBeVisible({ timeout: 10_000 });
});
