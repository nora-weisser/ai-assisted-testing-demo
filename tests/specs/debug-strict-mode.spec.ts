import { expect, test } from '@fixtures/test-options';

/**
 * Intentionally broken — the strict-mode variant of the `--debug=cli` / trace
 * walkthrough. Delete this file once the demo is over.
 */
test('DEBUG_TRACE: a todo can be completed', { tag: ['@e2e', '@public'] }, async ({
  api,
  todoPage,
}) => {
  const target = 'Buy milk';
  const other = 'Buy milk for the cake';
  await api.post('/api/todos', { data: { title: target } });
  await api.post('/api/todos', { data: { title: other } });

  await todoPage.goto();
  await todoPage.item(target).getByRole('checkbox').check();

  await expect(todoPage.item(target).getByRole('checkbox')).toBeChecked();
  await expect(todoPage.counter).toHaveText('1 item left');
});
