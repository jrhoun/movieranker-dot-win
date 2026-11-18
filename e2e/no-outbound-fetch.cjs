// Preloaded into `next start` (NODE_OPTIONS=--require) by playwright.config.ts.
// The home page's server component asks Supabase and TMDB for data. Under the
// e2e run every server-side fetch() fails at once, so the page falls back to its
// built-in hero posters and nothing leaves the machine.
globalThis.fetch = async (input) => {
  const url = typeof input === "string" ? input : (input.url ?? String(input));
  throw new TypeError(`e2e: outbound fetch blocked (${url})`);
};
