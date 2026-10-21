import { defineConfig, devices } from '@playwright/test';

// Set by the compose `playwright` service, which needs no local container.
const containerised = Boolean(process.env.BASE_URL);
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.ts',

  // Each test is its own customer, so tests run in parallel. Seats are shared: see the `seats` fixture.
  fullyParallel: true,
  workers: 2,

  // No retries: a retry turns a flaky test green and hides what we're looking for.
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: containerised
    ? undefined
    : {
        command: 'npm run app:up',
        cwd: '..',
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
