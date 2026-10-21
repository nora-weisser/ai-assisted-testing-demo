import { expect, test } from '@fixtures/test-options';
import type { HoldResponse, OrderResponse } from '@support/api-types';

/** Flaky on purpose — workshop exercise 03, see docs/exercises.md. */
test('FLAKY-03: a paid order gets a ticket code', { tag: ['@api', '@flaky'] }, async ({ api, seats }) => {
  const holdResponse = await api.post('/api/holds', { data: { eventId: 'beethoven-ninth', seats } });
  expect(holdResponse.status()).toBe(201);
  const hold = (await holdResponse.json()) as HoldResponse;

  const orderResponse = await api.post('/api/orders', { data: { holdId: hold.id } });
  expect(orderResponse.status()).toBe(202);
  const order = (await orderResponse.json()) as OrderResponse;

  // Payment confirmation normally lands well within a second.
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const latest = (await (await api.get(`/api/orders/${order.id}`)).json()) as OrderResponse;
  expect(latest.status).toBe('confirmed');
  expect(latest.ticketCode).toMatch(/^FR-[0-9A-F]{6}$/);
});
