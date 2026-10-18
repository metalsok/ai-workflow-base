import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'retain-on-failure',
    timezoneId: 'Europe/Vienna',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        timezoneId: 'America/Los_Angeles',
      },
    },
  ],
  webServer: {
    command: 'node --import tsx tests/support/browser-server.ts',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
