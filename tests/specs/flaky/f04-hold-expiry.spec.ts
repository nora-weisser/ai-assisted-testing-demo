import { expect, test } from '@fixtures/test-options';

/** Flaky on purpose — workshop exercise 04, see docs/exercises.md. */
test('FLAKY-04: seats go back on sale when a hold expires', { tag: ['@e2e', '@flaky'] }, async ({
  page,
  eventPage,
  seats,
}) => {
  await eventPage.goto('warehouse-techno');
  await eventPage.holdSeats(seats);

  // The test environment runs with HOLD_SECONDS=10. Wait it out, plus a margin.
  await page.waitForTimeout(10_200);

  expect(await eventPage.alert.isVisible()).toBe(true);
  await expect(eventPage.alert).toHaveText('Your hold expired and the seats were released.');
  await expect(eventPage.seat(seats[0])).toBeEnabled();
});
