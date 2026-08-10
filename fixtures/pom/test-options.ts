import { test as base, expect, type APIRequestContext } from '@playwright/test';

type TestFixtures = {
  api: APIRequestContext;
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
});

export { expect };
