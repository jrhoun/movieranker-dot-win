import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("play-room analytics instrumentation contracts", () => {
  const raw = readFileSync(join(process.cwd(), "src/app/r/play/play-room.tsx"), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("imports trackEvent from @/lib/analytics", () => {
    expect(src).toMatch(/import\s*\{[^}]*trackEvent[^}]*\}\s*from\s*["']@\/lib\/analytics["']/);
  });

  it("tracks ranking_started on session load with correct source", () => {
    expect(src).toMatch(/trackEvent\(["']ranking_started["'],\s*\{\s*source:\s*s\.themeSlug\s*\?\s*["']marquee["']\s*:\s*["']custom["']/);
  });

  it("tracks ranking_finished when ranking is completed", () => {
    expect(src).toMatch(/trackEvent\(["']ranking_finished["'],\s*\{\s*votes/);
    expect(src).toMatch(/movies:\s*active\.length/);
  });

  it("tracks connection_guessed when connection quiz is revealed", () => {
    expect(src).toMatch(/CONNECTION_REVEALED_EVENT/);
    expect(src).toMatch(/trackEvent\(["']connection_guessed["'],\s*\{\s*correct:\s*parsed\.correct\s*\}\)/);
  });
});
