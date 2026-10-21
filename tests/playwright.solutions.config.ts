import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Runs the reference fixes in solutions/ — `npm run test:solutions`. Spoilers. */
export default defineConfig({
  ...base,
  testDir: './solutions',
});
