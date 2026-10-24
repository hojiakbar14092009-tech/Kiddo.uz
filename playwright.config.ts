import { defineConfig, devices } from '@playwright/test'

const PORT = 4180
/**
 * A production build has no device admin without VITE_ADMIN_PIN, so the e2e
 * build gets one (not a real PIN; set your own for real builds).
 * e2e/kiddo.spec.ts types the same value.
 */
const E2E_ADMIN_PIN = process.env.VITE_ADMIN_PIN ?? '481516'

/** End-to-end tests against the production build, on a tablet and a phone. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7) landscape'], browserName: 'chromium' },
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
  webServer: {
    // `--mode e2e`: a production build with the device admin the tests drive (never deployed)
    command: `npx tsc -b && npx vite build --mode e2e && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { VITE_ADMIN_PIN: E2E_ADMIN_PIN },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
