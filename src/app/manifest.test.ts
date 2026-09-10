import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "./manifest";

describe("Web App Manifest (src/app/manifest.ts)", () => {
  const result = manifest();

  it("aligns theme_color and background_color with viewport themeColor (#0d0d10)", () => {
    expect(result.theme_color).toBe("#0d0d10");
    expect(result.background_color).toBe("#0d0d10");
  });

  it("includes updated copy in description without marketing filler", () => {
    expect(result.description).toContain("see how everyone else ranked them");
    expect(result.description).not.toContain("community consensus");
  });

  it("specifies standalone display and root start URL", () => {
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.short_name).toBe("MovieRanker");
  });

  it("includes maskable 192 and 512 PNG icons alongside SVG icon", () => {
    expect(result.icons).toBeDefined();
    const icons = result.icons ?? [];

    const svgIcon = icons.find((i) => i.type === "image/svg+xml");
    expect(svgIcon).toBeDefined();
    expect(svgIcon?.src).toBe("/icon.svg");
    expect(svgIcon?.sizes).toBe("any");

    const icon192 = icons.find((i) => i.sizes === "192x192");
    expect(icon192).toBeDefined();
    expect(icon192?.src).toBe("/icons/icon-192.png");
    expect(icon192?.type).toBe("image/png");
    expect(icon192?.purpose).toBe("maskable");

    const icon512 = icons.find((i) => i.sizes === "512x512");
    expect(icon512).toBeDefined();
    expect(icon512?.src).toBe("/icons/icon-512.png");
    expect(icon512?.type).toBe("image/png");
    expect(icon512?.purpose).toBe("maskable");
  });

  it("verifies all referenced icon assets exist on disk in public/", () => {
    const icons = result.icons ?? [];
    for (const icon of icons) {
      const relativePath = icon.src.startsWith("/") ? icon.src.slice(1) : icon.src;
      const inPublic = join(process.cwd(), "public", relativePath);
      const inApp = join(process.cwd(), "src/app", relativePath);
      const exists = existsSync(inPublic) || existsSync(inApp);
      expect(exists).toBe(true);
    }
  });
});
