import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { TodoPage } from '@pages/todo-page';

type TestFixtures = {
  api: APIRequestContext;
  todoPage: TodoPage;
};

export const test = base.extend<TestFixtures>({
  api: async ({ playwright, baseURL }, use) => {
    const context = await playwright.request.newContext({ baseURL });
    await use(context);
    await context.dispose();
  },

  // Auto-runs before each test: empties the store so no test inherits state
  // from the one before it. The store is global, which is why the suite runs
  // single-worker — see workers in playwright.config.ts.
  page: async ({ page, api }, use) => {
    await api.post('/api/test/reset');
    await use(page);
  },

  // Constructed only — never navigated here, so a test can seed through the
  // `api` fixture first and load a page that already has its data.
  todoPage: async ({ page }, use) => {
    await use(new TodoPage(page));
  },
});

export { expect };
