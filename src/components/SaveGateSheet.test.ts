import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SaveGateSheet analytics instrumentation contracts", () => {
  const raw = readFileSync(join(process.cwd(), "src/components/SaveGateSheet.tsx"), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("imports trackEvent from @/lib/analytics", () => {
    expect(src).toMatch(/import\s*\{[^}]*trackEvent[^}]*\}\s*from\s*["']@\/lib\/analytics["']/);
  });

  it("tracks save_gate_shown on mount", () => {
    expect(src).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*trackEvent\(["']save_gate_shown["']\);\s*\},/);
  });

  it("tracks signup_completed with password provider on successful user creation", () => {
    expect(src).toMatch(/trackEvent\(["']signup_completed["'],\s*\{\s*provider:\s*["']password["']\s*\}\)/);
  });

  it("narrows handleOAuth provider type to google only", () => {
    expect(src).toMatch(/handleOAuth\(provider:\s*["']google["']\)/);
    expect(src).not.toMatch(/provider:\s*["']google["']\s*\|\s*["']azure["']/);
  });
});
