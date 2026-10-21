import type { Locator, Page } from '@playwright/test';

/** A single event at `/events/:id`: seat map, hold and checkout. */
export class EventPage {
  readonly seatMap: Locator;
  readonly holdButton: Locator;
  readonly releaseButton: Locator;
  /** "Hold expires in m:ss" — only rendered while a hold is active. */
  readonly holdCountdown: Locator;
  /** Expired holds, seat conflicts and payment errors all surface here. */
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.seatMap = page.getByRole('group', { name: 'Seats' });
    this.holdButton = page.getByRole('button', { name: 'Hold seats' });
    this.releaseButton = page.getByRole('button', { name: 'Release seats' });
    this.holdCountdown = page.getByRole('status').filter({ hasText: 'Hold expires in' });
    this.alert = page.getByRole('alert');
  }

  async goto(eventId: string): Promise<void> {
    await this.page.goto(`/events/${eventId}`);
  }

  heading(eventName: string): Locator {
    return this.page.getByRole('heading', { name: eventName, level: 1 });
  }

  seat(id: string): Locator {
    return this.seatMap.getByRole('button', { name: `Seat ${id}`, exact: true });
  }

  /** The Pay button's name carries the total, e.g. "Pay €70". */
  payButton(total?: string): Locator {
    return total
      ? this.page.getByRole('button', { name: `Pay ${total}`, exact: true })
      : this.page.getByRole('button', { name: /^Pay / });
  }

  async selectSeats(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      await this.seat(id).click();
    }
  }

  async holdSeats(ids: readonly string[]): Promise<void> {
    await this.selectSeats(ids);
    await this.holdButton.click();
  }
}
