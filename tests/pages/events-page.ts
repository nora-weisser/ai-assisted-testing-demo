import type { Locator, Page } from '@playwright/test';

/** The event listing at `/`. Locators and actions only — specs own the expects. */
export class EventsPage {
  readonly heading: Locator;
  readonly searchBox: Locator;
  /** "Showing N events" — the page's only role="status". */
  readonly summary: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Upcoming events', level: 1 });
    this.searchBox = page.getByRole('searchbox', { name: 'Search events' });
    this.summary = page.getByRole('status');
    this.cards = page.getByRole('list', { name: 'Events' }).getByRole('listitem');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  card(eventName: string): Locator {
    return this.cards.filter({ has: this.page.getByRole('heading', { name: eventName, exact: true }) });
  }

  favouriteButton(eventName: string): Locator {
    return this.page.getByRole('button', { name: `Favourite ${eventName}`, exact: true });
  }

  async search(text: string): Promise<void> {
    await this.searchBox.fill(text);
  }
}
