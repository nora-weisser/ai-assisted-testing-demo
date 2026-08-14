import type { Locator, Page } from '@playwright/test';

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
  readonly items: Locator;
  readonly emptyState: Locator;
  readonly counter: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Todos' });
    this.newTodoInput = page.getByRole('textbox', { name: 'What needs to be done?' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.items = page.getByRole('listitem');
    this.emptyState = page.getByText('Nothing to do yet. Add your first todo.');
    this.counter = page.getByRole('status');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  item(title: string): Locator {
    return this.items.filter({ hasText: title });
  }

  async add(title: string): Promise<void> {
    await this.newTodoInput.fill(title);
    await this.addButton.click();
  }

  async remove(title: string): Promise<void> {
    await this.page.getByRole('button', { name: `Delete ${title}` }).click();
  }

  /**
   * Opens the inline editor and saves with Enter. The edit input keeps the
   * *original* title in its accessible name while it is open.
   */
  async edit(title: string, newTitle: string): Promise<void> {
    await this.page.getByRole('button', { name: `Edit ${title}` }).click();
    const editInput = this.page.getByRole('textbox', { name: `Edit ${title}` });
    await editInput.fill(newTitle);
    await editInput.press('Enter');
  }
}
