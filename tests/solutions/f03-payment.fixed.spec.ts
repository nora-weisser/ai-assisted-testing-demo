import { expect, test } from '@fixtures/test-options';
import type { HoldResponse, OrderResponse } from '@support/api-types';

/** Reference fix for FLAKY-03 — spoiler, see docs/solutions.md. */
test('FIXED-03: a paid order gets a ticket code', { tag: ['@api', '@fixed'] }, async ({ api, seats }) => {
  const holdResponse = await api.post('/api/holds', { data: { eventId: 'beethoven-ninth', seats } });
  expect(holdResponse.status()).toBe(201);
  const hold = (await holdResponse.json()) as HoldResponse;

  const orderResponse = await api.post('/api/orders', { data: { holdId: hold.id } });
  expect(orderResponse.status()).toBe(202);
  const order = (await orderResponse.json()) as OrderResponse;

  const fetchOrder = async (): Promise<OrderResponse> =>
    (await (await api.get(`/api/orders/${order.id}`)).json()) as OrderResponse;

  await expect
    .poll(async () => (await fetchOrder()).status, {
      message: `order ${order.id} should be confirmed by the payment provider`,
      timeout: 10_000,
    })
    .toBe('confirmed');

  expect((await fetchOrder()).ticketCode).toMatch(/^FR-[0-9A-F]{6}$/);
});
