import { describe, expect, test, vi } from "vitest";
import {
  copyPremierePassToClipboard,
  downloadPremierePass,
  drawBarcode,
  exportPremierePassBlob,
  formatTicketDate,
  generatePremierePassCanvas,
  generateTicketSerialNumber,
  type TicketRenderOptions,
} from "./ticket-canvas";

function createMockContext() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn().mockImplementation((text: string) => ({ width: text.length * 8 })),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "",
    textBaseline: "",
  } as unknown as CanvasRenderingContext2D;
}

function createMockCanvas(mockCtx = createMockContext(), fakeBlob = new Blob(["png"], { type: "image/png" })) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(mockCtx),
    toBlob: vi.fn().mockImplementation((cb: (b: Blob | null) => void) => cb(fakeBlob)),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,mock"),
  } as unknown as HTMLCanvasElement;
}

describe("ticket-canvas.ts Stress & Edge Case Testing", () => {
  test("handles empty items array gracefully without crash", async () => {
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx);
    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => (tag === "canvas" ? mockCanvas : {})),
    };

    const canvas = await generatePremierePassCanvas({
      title: "",
      items: [],
    });
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(675);
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  test("handles massive title and movie title strings (5,000 characters)", async () => {
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx);
    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => (tag === "canvas" ? mockCanvas : {})),
    };

    const longTitle = "A".repeat(5000);
    const canvas = await generatePremierePassCanvas({
      title: longTitle,
      items: [
        { rank: 1, title: longTitle, releaseYear: 2026 },
        { rank: 2, title: longTitle },
        { rank: 3, title: longTitle },
      ],
      creatorHandle: longTitle,
    });
    expect(canvas.width).toBe(1200);
  });

  test("handles extreme dates and invalid formats safely", () => {
    expect(formatTicketDate("not-a-date")).toBe("SEPTEMBER 2026");
    expect(formatTicketDate(new Date(NaN))).toBe("SEPTEMBER 2026");
    expect(formatTicketDate(new Date(1900, 0, 1))).toContain("1900");
    expect(formatTicketDate(new Date(2099, 11, 31))).toContain("2099");
  });

  test("serial number generator is deterministic and bounded for any input", () => {
    for (let i = 0; i < 1000; i++) {
      const title = `List ${Math.random()}`;
      const serial = generateTicketSerialNumber(title);
      expect(serial).toMatch(/^№ MR-\d{5}$/);
      const num = parseInt(serial.replace("№ MR-", ""), 10);
      expect(num).toBeGreaterThanOrEqual(10000);
      expect(num).toBeLessThan(100000);
    }
  });

  test("100 concurrent canvas generation calls execute without conflict", async () => {
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx);
    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => (tag === "canvas" ? mockCanvas : {})),
    };

    const promises = Array.from({ length: 100 }, (_, i) =>
      generatePremierePassCanvas({
        title: `Concurrent List ${i}`,
        items: [{ rank: 1, title: `Movie ${i}` }],
      })
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(100);
    results.forEach((c) => expect(c.width).toBe(1200));
  });
});
