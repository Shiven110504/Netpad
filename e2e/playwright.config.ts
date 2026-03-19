import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  workers: 1, // Electron tests must run serially — only one app instance at a time
  reporter: [['list']],
  // No webServer or baseURL — Electron launches its own window.
  // IMPORTANT: The app must be built before running e2e tests.
  // Use `npm run test:e2e` which runs `npm run build` first.
});
