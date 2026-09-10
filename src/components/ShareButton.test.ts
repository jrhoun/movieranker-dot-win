import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ShareButton analytics instrumentation contracts", () => {
  const raw = readFileSync(join(process.cwd(), "src/components/ShareButton.tsx"), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("imports trackEvent from @/lib/analytics", () => {
    expect(src).toMatch(/import\s*\{[^}]*trackEvent[^}]*\}\s*from\s*["']@\/lib\/analytics["']/);
  });

  it("tracks pass share on copyPass", () => {
    expect(src).toMatch(/copyPass[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']pass["']\s*\}\)/);
  });

  it("tracks list share on copyResult, copyLink, and nativeShare", () => {
    expect(src).toMatch(/copyResult[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']list["']\s*\}\)/);
    expect(src).toMatch(/copyLink[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']list["']\s*\}\)/);
    expect(src).toMatch(/nativeShare[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']list["']\s*\}\)/);
  });

  it("tracks list share on social and email links", () => {
    expect(src).toMatch(/threadsUrl[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']list["']\s*\}\)/);
    expect(src).toMatch(/blueskyUrl[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']list["']\s*\}\)/);
    expect(src).toMatch(/mailto[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']list["']\s*\}\)/);
  });
});
