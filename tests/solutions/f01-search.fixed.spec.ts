import { expect, test } from '@fixtures/test-options';

/** Reference fix for FLAKY-01 — spoiler, see docs/solutions.md. */
test('FIXED-01: searching for jazz shows the two jazz events', { tag: ['@e2e', '@fixed'] }, async ({
  eventsPage,
}) => {
  await eventsPage.goto();
  await eventsPage.search('jazz');

  await expect(eventsPage.cards.getByRole('heading')).toHaveText([
    'Late Night Jazz Trio',
    'Jazz Under the Stars',
  ]);
  await expect(eventsPage.summary).toHaveText('Showing 2 events');
});
