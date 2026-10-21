import { expect, test } from '@fixtures/test-options';

/** Reference fix for FLAKY-02 — spoiler, see docs/solutions.md. */
test('FIXED-02: a favourite is still there after a reload', { tag: ['@e2e', '@fixed'] }, async ({
  page,
  eventsPage,
}) => {
  const event = 'Folk on the Canal';

  await eventsPage.goto();

  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/favourites/folk-on-the-canal') && response.request().method() === 'PUT',
  );
  await eventsPage.favouriteButton(event).click();
  expect((await saved).status()).toBe(204);

  await page.reload();

  await expect(eventsPage.favouriteButton(event)).toHaveAttribute('aria-pressed', 'true');
});
