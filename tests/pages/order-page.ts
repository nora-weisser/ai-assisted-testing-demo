import type { Locator, Page } from '@playwright/test';

/** The booking page at `/orders/:id`. It polls until payment is confirmed. */
export class OrderPage {
  readonly processingHeading: Locator;
  readonly confirmedHeading: Locator;
  /** e.g. "FR-3A9C1F" — only rendered once the booking is confirmed. */
  readonly ticketCode: Locator;

  constructor(private readonly page: Page) {
    this.processingHeading = page.getByRole('heading', { name: 'Processing your payment…' });
    this.confirmedHeading = page.getByRole('heading', { name: 'Booking confirmed' });
    this.ticketCode = page.getByText(/^FR-[0-9A-F]{6}$/);
  }

  orderIdFromUrl(): string {
    const match = /\/orders\/([^/?#]+)/.exec(this.page.url());
    if (!match?.[1]) {
      throw new Error(`Not on an order page: ${this.page.url()}`);
    }
    return match[1];
  }
}
