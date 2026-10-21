import { expect, test } from '@fixtures/test-options';

/** Flaky on purpose — workshop exercise 01, see docs/exercises.md. */
test('FLAKY-01: searching for jazz shows the two jazz events', { tag: ['@e2e', '@flaky'] }, async ({
  page,
  eventsPage,
}) => {
  await eventsPage.goto();
  await expect(page).toHaveTitle('Front Row — tickets');
  await expect(eventsPage.heading).toBeVisible();
  await expect(eventsPage.searchBox).toBeEditable();

  await eventsPage.search('jazz');

  // Wait for the search to come back before checking the results.
  await page.waitForResponse((response) => response.url().includes('/api/events'));

  const titles = await eventsPage.cards.getByRole('heading').allTextContents();
  expect(titles).toEqual(['Late Night Jazz Trio', 'Jazz Under the Stars']);
});
