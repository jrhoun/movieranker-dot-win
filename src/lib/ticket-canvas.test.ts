import { describe, expect, test, vi, type Mock } from "vitest";
import {
  copyPremierePassToClipboard,
  downloadPremierePass,
  drawBarcode,
  exportPremierePassBlob,
  formatTicketDate,
  generatePremierePassCanvas,
  generateTicketSerialNumber,
  loadTicketImage,
  type TicketRenderOptions,
} from "./ticket-canvas";

/**
 * Minimal shapes for the DOM/BOM globals these tests monkey-patch onto
 * globalThis (document, URL, ClipboardItem). Node's test environment has no
 * real DOM, so canvas/export code paths are exercised against these stand-ins
 * rather than jsdom. Typed narrowly to what the code under test actually
 * touches, so assignments don't need `as any`.
 */
type MockAnchor = {
  href: string;
  download: string;
  click: Mock;
};

type MockDocument = {
  createElement: Mock<(tag: string) => unknown>;
  body?: {
    appendChild: Mock;
    removeChild: Mock;
  };
};

type MockUrlStatic = {
  createObjectURL: Mock<(blob: Blob) => string>;
  revokeObjectURL: Mock<(url: string) => void>;
};

type MockClipboardItemCtor = new (data: Record<string, Blob>) => { data: Record<string, Blob> };

describe("generateTicketSerialNumber", () => {
  test("generates deterministic serial numbers matching format", () => {
    const s1 = generateTicketSerialNumber("Nolan Top Films", "2026-09-01");
    const s2 = generateTicketSerialNumber("Nolan Top Films", "2026-09-01");
    expect(s1).toBe(s2);
    expect(s1).toMatch(/^№ MR-\d{5}$/);
  });

  test("differs for different titles", () => {
    const s1 = generateTicketSerialNumber("Nolan Top Films");
    const s2 = generateTicketSerialNumber("Tarantino Top Films");
    expect(s1).not.toBe(s2);
  });
});

describe("formatTicketDate", () => {
  test("formats Date objects cleanly", () => {
    const d = new Date(2026, 8, 2); // Sept 2, 2026
    const res = formatTicketDate(d);
    expect(res).toContain("2026");
    expect(res).toMatch(/SEP/i);
  });

  test("formats string dates or falls back gracefully", () => {
    expect(formatTicketDate("2026-05-15")).toContain("2026");
    expect(formatTicketDate("invalid-date-string")).toBe("SEPTEMBER 2026");
    expect(formatTicketDate(undefined)).toBeDefined();
  });
});

describe("drawBarcode", () => {
  test("calls fillRect on context repeatedly to draw bars", () => {
    const fillRect = vi.fn();
    const save = vi.fn();
    const restore = vi.fn();
    const mockCtx = {
      fillRect,
      save,
      restore,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    drawBarcode(mockCtx, 100, 100, 200, 80, "№ MR-12345");
    expect(save).toHaveBeenCalled();
    expect(restore).toHaveBeenCalled();
    expect(fillRect.mock.calls.length).toBeGreaterThan(10);
  });

  // Regression test: drawBarcode used to accept a `seedStr` parameter and
  // never read it, so every ticket rendered an identical hardcoded bar
  // pattern regardless of input. Seeding is now real — same seed must
  // produce the same bars, and different seeds should (almost always)
  // produce different bars, so the "random" texture is actually
  // deterministic per list rather than universally the same image.
  test("produces identical bar output for the same seed string", () => {
    const fillRectA = vi.fn();
    const ctxA = {
      fillRect: fillRectA,
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    const fillRectB = vi.fn();
    const ctxB = {
      fillRect: fillRectB,
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    drawBarcode(ctxA, 100, 100, 200, 80, "№ MR-12345");
    drawBarcode(ctxB, 100, 100, 200, 80, "№ MR-12345");

    expect(fillRectA.mock.calls).toEqual(fillRectB.mock.calls);
  });

  test("produces different bar output for different seed strings", () => {
    const fillRectA = vi.fn();
    const ctxA = {
      fillRect: fillRectA,
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    const fillRectB = vi.fn();
    const ctxB = {
      fillRect: fillRectB,
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    drawBarcode(ctxA, 100, 100, 200, 80, "№ MR-12345");
    drawBarcode(ctxB, 100, 100, 200, 80, "№ MR-99999");

    expect(fillRectA.mock.calls).not.toEqual(fillRectB.mock.calls);
  });
});

describe("loadTicketImage", () => {
  test("rejects when Image is undefined", async () => {
    // In Node test environment, global Image is undefined
    await expect(loadTicketImage("https://example.com/poster.jpg", 50)).rejects.toThrow();
  });
});

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
    measureText: vi.fn().mockReturnValue({ width: 100 }),
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

describe("generatePremierePassCanvas", () => {
  test("creates canvas and executes full drawing pipeline with mock context", async () => {
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx);

    (globalThis as unknown as { document: MockDocument }).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      }),
    };

    const options: TicketRenderOptions = {
      title: "Christopher Nolan Masterpieces",
      creatorHandle: "cinephile99",
      date: new Date(2026, 8, 2),
      items: [
        { rank: 1, title: "Oppenheimer", releaseYear: 2023, posterPath: "/oppenheimer.jpg" },
        { rank: 2, title: "Interstellar", releaseYear: 2014, posterPath: "/interstellar.jpg" },
        { rank: 3, title: "Inception", releaseYear: 2010, posterPath: "/inception.jpg" },
        { rank: 4, title: "The Dark Knight", releaseYear: 2008, posterPath: "/darkknight.jpg" },
        { rank: 5, title: "Memento", releaseYear: 2000, posterPath: "/memento.jpg" },
      ],
      totalRanked: 12,
    };

    const canvas = await generatePremierePassCanvas(options);
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(675);
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });
});

describe("exportPremierePassBlob", () => {
  test("resolves with Blob from canvas.toBlob", async () => {
    const fakeBlob = new Blob(["fake-image-png"], { type: "image/png" });
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx, fakeBlob);

    (globalThis as unknown as { document: MockDocument }).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      }),
    };

    const blob = await exportPremierePassBlob({
      title: "Test List",
      items: [{ rank: 1, title: "Top Movie" }],
    });
    expect(blob).toBe(fakeBlob);
  });
});

describe("copyPremierePassToClipboard", () => {
  test("writes to navigator.clipboard and returns true", async () => {
    const fakeBlob = new Blob(["fake-image-png"], { type: "image/png" });
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx, fakeBlob);

    const writeFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          write: writeFn,
        },
      },
      writable: true,
      configurable: true,
    });
    (globalThis as unknown as { ClipboardItem: MockClipboardItemCtor }).ClipboardItem = class ClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    };
    (globalThis as unknown as { document: MockDocument }).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      }),
    };

    const success = await copyPremierePassToClipboard({
      title: "Test List",
      items: [{ rank: 1, title: "Top Movie" }],
    });
    expect(success).toBe(true);
    expect(writeFn).toHaveBeenCalled();
  });

  test("returns false when clipboard write fails or is unsupported", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    (globalThis as unknown as { ClipboardItem?: MockClipboardItemCtor }).ClipboardItem = undefined;

    const success = await copyPremierePassToClipboard({
      title: "Test List",
      items: [{ rank: 1, title: "Top Movie" }],
    });
    expect(success).toBe(false);
  });
});

describe("downloadPremierePass", () => {
  test("creates download anchor, triggers click, and removes anchor", async () => {
    const fakeBlob = new Blob(["fake-image-png"], { type: "image/png" });
    const mockCtx = createMockContext();
    const mockCanvas = createMockCanvas(mockCtx, fakeBlob);

    const clickFn = vi.fn();
    const mockAnchor: MockAnchor = {
      href: "",
      download: "",
      click: clickFn,
    };
    const appendChild = vi.fn();
    const removeChild = vi.fn();

    (globalThis as unknown as { URL: MockUrlStatic }).URL = {
      createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/fake-blob-url"),
      revokeObjectURL: vi.fn(),
    };

    (globalThis as unknown as { document: MockDocument }).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        if (tag === "a") return mockAnchor;
        return {};
      }),
      body: {
        appendChild,
        removeChild,
      },
    };

    await downloadPremierePass({
      title: "My Nolan List",
      items: [{ rank: 1, title: "Oppenheimer" }],
    });

    expect(clickFn).toHaveBeenCalled();
    expect(mockAnchor.download).toContain("premiere-pass-my-nolan-list.png");
    expect(appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(removeChild).toHaveBeenCalledWith(mockAnchor);
  });
});
