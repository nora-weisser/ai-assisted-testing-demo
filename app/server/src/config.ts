/**
 * Runtime knobs. The defaults describe a realistic service: responses take a
 * variable amount of time, holds last five minutes, and payment confirmation
 * happens in the background a little after checkout.
 */

export type Range = { min: number; max: number };

function parseRange(raw: string | undefined, fallback: Range): Range {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const [minText, maxText = minText] = raw.split('-');
  const min = Number.parseInt(minText ?? '', 10);
  const max = Number.parseInt(maxText ?? '', 10);
  if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < min) {
    throw new Error(`Invalid range "${raw}" — expected "<min>-<max>" in milliseconds`);
  }
  return { min, max };
}

function parseSeconds(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Invalid HOLD_SECONDS "${raw}" — expected a positive integer`);
  }
  return value;
}

export function randomIn({ min, max }: Range): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  testRoutes: process.env.ENABLE_TEST_ROUTES === 'true',
  /** Added to every /api response, to behave like a server on a real network. */
  latency: parseRange(process.env.LATENCY_MS, { min: 50, max: 350 }),
  /** How long a seat hold lasts before the seats go back on sale. */
  holdSeconds: parseSeconds(process.env.HOLD_SECONDS, 300),
  /** How long the payment provider takes to confirm an order. */
  paymentProcessing: parseRange(process.env.PAYMENT_PROCESSING_MS, { min: 300, max: 2000 }),
};
