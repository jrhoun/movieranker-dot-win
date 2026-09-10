import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PremierePassCard analytics instrumentation contracts", () => {
  const raw = readFileSync(join(process.cwd(), "src/components/share/PremierePassCard.tsx"), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("imports trackEvent from @/lib/analytics", () => {
    expect(src).toMatch(/import\s*\{[^}]*trackEvent[^}]*\}\s*from\s*["']@\/lib\/analytics["']/);
  });

  it("tracks pass share on handleShare, handleCopy, and handleDownload", () => {
    expect(src).toMatch(/handleShare[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']pass["']\s*\}\)/);
    expect(src).toMatch(/handleCopy[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']pass["']\s*\}\)/);
    expect(src).toMatch(/handleDownload[\s\S]*?trackEvent\(["']share_clicked["'],\s*\{\s*surface:\s*["']pass["']\s*\}\)/);
  });
});
