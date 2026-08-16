import { expect, test } from '@fixtures/test-options';

/**
 * Intentionally broken — the subject of the `--debug=cli` / trace walkthrough.
 * Locators are inlined here on purpose so the bug is visible in the spec under
 * debug; the rest of the suite keeps them in `pages/todo-page.ts`.
 * Delete this file once the demo is over.
 */
test('DEBUG_CLI: a todo can be edited', { tag: ['@e2e', '@public'] }, async ({
  api,
  page,
  todoPage,
}) => {
  const original = 'Buy milk';
  const renamed = 'Buy oat milk';
  await api.post('/api/todos', { data: { title: original } });

  await todoPage.goto();
  await page.getByRole('button', { name: `Edit ${original}` }).click();

  const editInput = page.getByRole('textbox', { name: `Edit ${renamed}` });
  await editInput.fill(renamed);
  await editInput.press('Enter');

  await expect(todoPage.item(renamed)).toBeVisible();
  await expect(todoPage.item(original)).toHaveCount(0);
});
