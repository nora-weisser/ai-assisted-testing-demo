import { expect, test } from '@fixtures/test-options';

/** Flaky on purpose — workshop exercise 02, see docs/exercises.md. */
test('FLAKY-02: a favourite is still there after a reload', { tag: ['@e2e', '@flaky'] }, async ({
  page,
  eventsPage,
}) => {
  const event = 'Folk on the Canal';

  await eventsPage.goto();
  await eventsPage.favouriteButton(event).click();
  await expect(eventsPage.favouriteButton(event)).toHaveAttribute('aria-pressed', 'true');

  await page.reload();

  await expect(eventsPage.favouriteButton(event)).toHaveAttribute('aria-pressed', 'true');
});
