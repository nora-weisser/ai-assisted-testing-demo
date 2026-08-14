import { expect, test } from '@fixtures/test-options';

test('TC-S01: app shell renders with the empty state', { tag: ['@e2e', '@public'] }, async ({
  todoPage,
}) => {
  await todoPage.goto();

  await expect(todoPage.heading).toBeVisible();
  await expect(todoPage.newTodoInput).toBeVisible();
  await expect(todoPage.addButton).toBeVisible();
  await expect(todoPage.emptyState).toBeVisible();
  await expect(todoPage.counter).toHaveText('0 items left');
});

test('TC-S02: a todo can be added', { tag: ['@e2e', '@public'] }, async ({ todoPage }) => {
  const title = 'Water the plants';

  await todoPage.goto();
  await todoPage.add(title);

  await expect(todoPage.items).toHaveCount(1);
  await expect(todoPage.item(title)).toBeVisible();
  await expect(todoPage.newTodoInput).toHaveValue('');
  await expect(todoPage.counter).toHaveText('1 item left');
});

test('TC-S03: a todo can be removed', { tag: ['@e2e', '@public'] }, async ({ api, todoPage }) => {
  const item = 'Buy milk';
  await api.post('/api/todos', { data: { title: item } });

  await todoPage.goto();
  await todoPage.remove(item);

  await expect(todoPage.items).toHaveCount(0);
});
