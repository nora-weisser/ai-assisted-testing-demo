import type { Locator, Page } from '@playwright/test';

export type FilterName = 'All' | 'Active' | 'Completed';

/**
 * The single todo screen. Locators only — assertions stay in the specs so a
 * failure points at the expectation that broke, not at a helper.
 *
 * Every element is reached by role and accessible name, per the app's
 * testability contract in ../../docs/todo-app.md.
 */
export class TodoPage {
  readonly heading: Locator;
  readonly newTodoInput: Locator;
  readonly addButton: Locator;
  readonly formError: Locator;
  readonly list: Locator;
  readonly items: Locator;
  readonly emptyState: Locator;
  readonly counter: Locator;
  readonly clearCompletedButton: Locator;
  readonly errorBanner: Locator;
  readonly dismissErrorButton: Locator;
  readonly filters: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Todos' });
    this.newTodoInput = page.getByRole('textbox', { name: 'What needs to be done?' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.formError = page.getByText('Title must');
    this.list = page.getByRole('list');
    this.items = page.getByRole('listitem');
    this.emptyState = page.getByText('Nothing to do yet. Add your first todo.');
    // Also the loading indicator's role, but the footer is withheld while
    // loading so the two never coexist — see docs/todo-app.md §8.
    this.counter = page.getByRole('status');
    this.clearCompletedButton = page.getByRole('button', { name: 'Clear completed' });
    this.errorBanner = page.getByRole('alert');
    this.dismissErrorButton = page.getByRole('button', { name: 'Dismiss error' });
    this.filters = page.getByRole('navigation', { name: 'Filters' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** The row for a todo. Titles may repeat, so this can match more than one. */
  item(title: string): Locator {
    return this.items.filter({ hasText: title });
  }

  checkbox(title: string): Locator {
    return this.page.getByRole('checkbox', { name: title });
  }

  editButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Edit ${title}` });
  }

  deleteButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Delete ${title}` });
  }

  /** The inline input that replaces the title while a row is being edited. */
  editInput(title: string): Locator {
    return this.page.getByRole('textbox', { name: `Edit ${title}` });
  }

  filterLink(name: FilterName): Locator {
    return this.filters.getByRole('link', { name });
  }

  async add(title: string): Promise<void> {
    await this.newTodoInput.fill(title);
    await this.addButton.click();
  }

  /** Opens the inline editor, replaces the title and commits with Enter. */
  async rename(title: string, newTitle: string): Promise<void> {
    await this.editButton(title).click();
    const input = this.editInput(title);
    await input.fill(newTitle);
    await input.press('Enter');
  }

  async remove(title: string): Promise<void> {
    await this.deleteButton(title).click();
  }

  async complete(title: string): Promise<void> {
    await this.checkbox(title).check();
  }

  async reopen(title: string): Promise<void> {
    await this.checkbox(title).uncheck();
  }

  async filterBy(name: FilterName): Promise<void> {
    await this.filterLink(name).click();
  }

  async clearCompleted(): Promise<void> {
    await this.clearCompletedButton.click();
  }

  async dismissError(): Promise<void> {
    await this.dismissErrorButton.click();
  }
}
