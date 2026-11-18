import { defineConfig } from "@playwright/test";

// One server, one spec, two viewports. No retries, no Supabase, no real API.
// Set E2E_PORT if 3107 is taken. The server never reuses a running one, so the
// run always tests the code in this checkout.
//
// Run this from a checkout WITHOUT .env.local. Next still loads any variable
// from that file that webServer.env does not set (an empty string here does not
// override it), so real keys such as a GA id could leak in. There is no
// supported switch to make `next build` skip .env.local, so this is a rule, not
// a guard. The Supabase URL below is an unroutable name on purpose: nothing,
// even a local `supabase start`, can answer it.
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
    // below. Only the start step (the server under test) loads
    // e2e/no-outbound-fetch.cjs, so it cannot reach Supabase or TMDB; the build
    // itself still downloads Google Fonts (next/font/google).
    command: `npx next build && NODE_OPTIONS='--require ./e2e/no-outbound-fetch.cjs' npx next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Names from .env.local.example, obviously fake values, nothing real.
      NEXT_PUBLIC_SUPABASE_URL: "http://supabase.e2e.invalid",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SECRET_KEY: "test-secret-key",
      TMDB_READ_TOKEN: "test-tmdb-token",
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    },
  },
});
