import { expect, test } from '../fixtures/pom/test-options';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('TC-S01: app shell renders with the empty state', { tag: ['@e2e', '@public'] }, async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: 'Todos' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What needs to be done?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  await expect(page.getByText('Nothing to do yet. Add your first todo.')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('0 items left');
});

test('TC-S02: a todo can be added', { tag: ['@e2e', '@public'] }, async ({ page }) => {
  const title = 'Water the plants';
  const input = page.getByRole('textbox', { name: 'What needs to be done?' });

  await input.fill(title);
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: title })).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(page.getByRole('status')).toHaveText('1 item left');
});
