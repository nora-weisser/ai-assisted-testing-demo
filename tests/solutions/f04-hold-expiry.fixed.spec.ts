import { expect, test } from '@fixtures/test-options';

/** Reference fix for FLAKY-04 — spoiler, see docs/solutions.md. */
test('FIXED-04: seats go back on sale when a hold expires', { tag: ['@e2e', '@fixed'] }, async ({
  page,
  eventPage,
  seats,
}) => {
  await page.clock.install();

  await eventPage.goto('warehouse-techno');
  await eventPage.holdSeats(seats);
  await expect(eventPage.holdCountdown).toBeVisible();

  // Longer than any hold: 10 s in the test environment, 5 min by default.
  await page.clock.fastForward('05:01');

  await expect(eventPage.alert).toHaveText('Your hold expired and the seats were released.');
  await expect(eventPage.seat(seats[0])).toBeEnabled();
});
