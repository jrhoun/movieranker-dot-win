import { defineConfig } from "@playwright/test";

// One server, one spec, two viewports. No retries, no Supabase, no real API.
// Set E2E_PORT if 3107 is taken. The server never reuses a running one, so the
// run always tests the code in this checkout.
const port = Number(process.env.E2E_PORT ?? 3107);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
  },
  projects: [
    { name: "phone-360x800", use: { viewport: { width: 360, height: 800 }, hasTouch: true } },
    { name: "desktop-1440x900", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // Production build, then start. The build bakes in the fake public values
    // below; the start step also loads e2e/no-outbound-fetch.cjs so the server
    // cannot reach Supabase or TMDB.
    command: `npx next build && NODE_OPTIONS='--require ./e2e/no-outbound-fetch.cjs' npx next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Names from .env.local.example, obviously fake values, nothing real.
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SECRET_KEY: "test-secret-key",
      TMDB_READ_TOKEN: "test-tmdb-token",
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    },
  },
});
