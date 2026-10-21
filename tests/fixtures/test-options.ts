import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { EventPage } from '@pages/event-page';
import { EventsPage } from '@pages/events-page';
import { OrderPage } from '@pages/order-page';

type TestFixtures = {
  api: APIRequestContext;
  seats: [string, string];
  eventsPage: EventsPage;
  eventPage: EventPage;
  orderPage: OrderPage;
};

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export const test = base.extend<TestFixtures>({
  // Each test is a new customer; reset deletes what that customer owns.
  page: async ({ page }, use) => {
    await use(page);
    await page.request.post('/api/test/reset');
  },

  // Shares the page's cookies, so it acts as the same customer.
  api: async ({ page }, use) => {
    await use(page.request);
  },

  // Seats are shared by all customers: one row per parallel worker.
  seats: async ({}, use, testInfo) => {
    const row = ROWS[testInfo.parallelIndex % ROWS.length] ?? 'A';
    await use([`${row}1`, `${row}2`]);
  },

  eventsPage: async ({ page }, use) => {
    await use(new EventsPage(page));
  },

  eventPage: async ({ page }, use) => {
    await use(new EventPage(page));
  },

  orderPage: async ({ page }, use) => {
    await use(new OrderPage(page));
  },
});

export { expect };
