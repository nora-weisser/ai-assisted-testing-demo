import { defineConfig, devices } from '@playwright/test';

// Set by the compose `playwright` service, where the app is reachable by
// service name and no local container needs starting.
const containerised = Boolean(process.env.BASE_URL);
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './specs',
  // One worker: the app keeps todos in a single in-memory store, so parallel
  // workers would reset each other mid-test. At this suite's size serial is
  // also simply faster — worker startup costs more than the parallelism saves.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
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
        // The app lives in its own project one level up; app:up is a root
        // script, so the server is started from the repo root, not from here.
        command: 'npm run app:up',
        cwd: '..',
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
