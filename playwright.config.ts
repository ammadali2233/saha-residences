import { defineConfig } from '@playwright/test';

// Brand-guide breakpoints we must pass at: phone, tablet, desktop (CLAUDE.md quality gates).
export const WIDTHS = [360, 768, 1440] as const;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
