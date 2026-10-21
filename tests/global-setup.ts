import type { FullConfig } from '@playwright/test';

/** Clears data left behind by an aborted earlier run. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000';
  const response = await fetch(`${baseURL}/api/test/reset-all`, { method: 'POST' });
  if (response.status !== 204) {
    throw new Error(
      `POST /api/test/reset-all returned ${response.status}. ` +
        'Is the app running with ENABLE_TEST_ROUTES=true? (`npm run app:up` sets it.)',
    );
  }
}
