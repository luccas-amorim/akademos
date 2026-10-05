import { defineConfig, devices } from '@playwright/test';

const API = 'http://localhost:8788';
const WEB = 'http://localhost:5175';

/**
 * E2E: app web + API com banco em memória (PGlite). Cada execução começa do
 * zero; nada depende de serviço externo.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: WEB,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @akademos/server dev',
      url: `${API}/saude`,
      reuseExistingServer: false,
      env: {
        PORT: '8788',
        DATABASE_URL: 'pglite:memoria',
        BETTER_AUTH_URL: API,
        ORIGENS: WEB,
      },
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @akademos/web exec vite --port 5175 --strictPort',
      url: WEB,
      reuseExistingServer: false,
      env: { VITE_API_URL: API },
      timeout: 120_000,
    },
  ],
});
