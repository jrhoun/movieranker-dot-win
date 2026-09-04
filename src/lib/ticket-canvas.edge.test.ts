import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  copyPremierePassToClipboard,
  downloadPremierePass,
  drawBarcode,
  exportPremierePassBlob,
  formatTicketDate,
  generatePremierePassCanvas,
  generateTicketSerialNumber,
  loadTicketImage,
  type TicketMovieItem,
  type TicketRenderOptions,
} from "./ticket-canvas";
import {
  computeVersus,
  findSharpestClash,
  findSharedFavorites,
  type VersusEntry,
  type SharedMovie,
} from "./versus";

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

describe("Empirical Stress Tests: Ticket Canvas & Export Fallbacks", () => {
  let mockCtx: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCtx = createMockContext();
    mockCanvas = createMockCanvas(mockCtx);

    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        if (tag === "a") {
          return {
            href: "",
            download: "",
            click: vi.fn(),
          };
        }
        return {};
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    (globalThis as any).URL = {
      createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
      revokeObjectURL: vi.fn(),
    };
  });

  describe("1. Missing poster URLs and Image load failures", () => {
    test("handles champion with missing/null/undefined posterPath by rendering gold plaque", async () => {
      const options: TicketRenderOptions = {
        title: "No Poster Test",
        items: [
          { rank: 1, title: "Mystery Film", posterPath: null },
          { rank: 2, title: "Second Film", posterPath: undefined },
        ],
      };

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(675);
      // Verify plaque fallback text "#1" was drawn
      expect(mockCtx.fillText).toHaveBeenCalledWith("#1", expect.any(Number), expect.any(Number));
      // drawImage should NOT have been called because posterPath was null
      expect(mockCtx.drawImage).not.toHaveBeenCalled();
    });

    test("handles posterPath where network image load fails or times out without crashing", async () => {
      const options: TicketRenderOptions = {
        title: "Failed Image Load",
        items: [
          { rank: 1, title: "Offline Movie", posterPath: "/broken-poster-path.jpg" },
        ],
      };

      // In Node environment, loadTicketImage throws since Image is undefined
      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      // Should fall back to #1 plaque
      expect(mockCtx.fillText).toHaveBeenCalledWith("#1", expect.any(Number), expect.any(Number));
    });
  });

  describe("2. Special Characters, Emojis, HTML Entities, and Long Text", () => {
    test("handles Unicode, Emojis, and HTML entity-like characters in title and handle", async () => {
      const options: TicketRenderOptions = {
        title: '🎬 "Top & Best" <Sci-Fi> / 2026 ✨ &amp; <b>Bold</b> 🔥',
        creatorHandle: 'cinephile_❤️_🚀<script>alert("xss")</script>',
        participants: ['user_&_1', 'user_<b>2</b>'],
        items: [
          { rank: 1, title: '2001: A Space Odyssey 🚀 & <Beyond>', releaseYear: 1968 },
          { rank: 2, title: 'Everything Everywhere All at Once 🥯 👁️', releaseYear: 2022 },
          { rank: 3, title: '千と千尋の神隠し (Spirited Away)', releaseYear: 2001 },
          { rank: 4, title: 'Parasite (기생충)', releaseYear: 2019 },
          { rank: 5, title: 'La Haine 🇫🇷 [1995]', releaseYear: 1995 },
        ],
      };

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    test("handles extremely long titles (> 500 characters) without infinite loops", async () => {
      const longTitle = "EXTREMELY LONG MOVIE TITLE ".repeat(30);
      const options: TicketRenderOptions = {
        title: longTitle,
        items: [
          { rank: 1, title: "LONG CHAMPION TITLE ".repeat(20), releaseYear: 2026 },
          { rank: 2, title: "LONG RUNNER UP ".repeat(20), releaseYear: 2025 },
        ],
      };

      // Mock measureText to simulate wide text that requires truncation
      (mockCtx.measureText as any).mockImplementation((text: string) => ({
        width: text.length * 15,
      }));

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    test("handles empty string title and missing items gracefully", async () => {
      const options: TicketRenderOptions = {
        title: "",
        items: [],
      };

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  describe("3. Empty rankings list and Single-movie list", () => {
    test("handles completely empty rankings list (0 items)", async () => {
      const options: TicketRenderOptions = {
        title: "Empty List",
        items: [],
        totalRanked: 0,
      };

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      // Champion defaults to "Undisputed Champion"
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "Undisputed Champion",
        expect.any(Number),
        expect.any(Number),
      );
      // Stub shows 0 FILMS RANKED
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "0 FILMS RANKED",
        expect.any(Number),
        expect.any(Number),
      );
    });

    test("handles single-movie list (1 item, no runners-up)", async () => {
      const options: TicketRenderOptions = {
        title: "Solo Favorite",
        items: [{ rank: 1, title: "Citizen Kane", releaseYear: 1941 }],
      };

      const canvas = await generatePremierePassCanvas(options);
      expect(canvas).toBeDefined();
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "Citizen Kane",
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "1 FILMS RANKED",
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("4. Clipboard API rejection simulation and download fallback", () => {
    test("returns false when navigator.clipboard.write throws DOMException (e.g. focus/permission rejection)", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          clipboard: {
            write: vi.fn().mockRejectedValue(new DOMException("Document is not focused.", "NotAllowedError")),
          },
        },
        writable: true,
        configurable: true,
      });

      (globalThis as any).ClipboardItem = class ClipboardItem {
        constructor(public data: any) {}
      };

      const result = await copyPremierePassToClipboard({
        title: "Permission Test",
        items: [{ rank: 1, title: "Test Film" }],
      });

      expect(result).toBe(false);
    });

    test("returns false when ClipboardItem is not supported", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          clipboard: {
            write: vi.fn().mockResolvedValue(undefined),
          },
        },
        writable: true,
        configurable: true,
      });
      (globalThis as any).ClipboardItem = undefined;

      const result = await copyPremierePassToClipboard({
        title: "No ClipboardItem Test",
        items: [{ rank: 1, title: "Test Film" }],
      });

      expect(result).toBe(false);
    });

    test("downloadPremierePass sanitizes exotic title characters in downloaded filename", async () => {
      const appendChild = vi.fn();
      const removeChild = vi.fn();
      let capturedAnchor: any = null;

      (globalThis as any).document = {
        createElement: vi.fn().mockImplementation((tag: string) => {
          if (tag === "canvas") return mockCanvas;
          if (tag === "a") {
            capturedAnchor = {
              href: "",
              download: "",
              click: vi.fn(),
            };
            return capturedAnchor;
          }
          return {};
        }),
        body: { appendChild, removeChild },
      };

      await downloadPremierePass({
        title: "🔥 Top 10 Sci-Fi / Cyberpunk (1990s) & 2000s! 🚀",
        items: [{ rank: 1, title: "Matrix" }],
      });

      expect(capturedAnchor).toBeDefined();
      expect(capturedAnchor.download).toBe("premiere-pass-top-10-sci-fi-cyberpunk-1990s-2000s.png");
      expect(capturedAnchor.click).toHaveBeenCalled();
    });
  });
});

describe("Empirical Stress Tests: Versus Compare Math & Edge Cases", () => {
  test("handles 0 shared movies without NaN or crashes", () => {
    const listA: VersusEntry[] = [
      { tmdbId: 1, title: "Movie 1", posterPath: null, rank: 1 },
      { tmdbId: 2, title: "Movie 2", posterPath: null, rank: 2 },
    ];
    const listB: VersusEntry[] = [
      { tmdbId: 3, title: "Movie 3", posterPath: null, rank: 1 },
      { tmdbId: 4, title: "Movie 4", posterPath: null, rank: 2 },
    ];

    const result = computeVersus(listA, listB);
    expect(result.shared).toHaveLength(0);
    expect(result.agreementPct).toBeNull();
    expect(result.compatibilityScore).toBeNull();
    expect(result.sharpestClash).toBeNull();
    expect(result.sharedFavorites).toHaveLength(0);
    expect(result.onlyInA).toHaveLength(2);
    expect(result.onlyInB).toHaveLength(2);
  });

  test("handles 1 shared movie (no pairs exist)", () => {
    const listA: VersusEntry[] = [
      { tmdbId: 10, title: "Inception", posterPath: null, rank: 1 },
      { tmdbId: 11, title: "Dunkirk", posterPath: null, rank: 2 },
    ];
    const listB: VersusEntry[] = [
      { tmdbId: 10, title: "Inception", posterPath: null, rank: 5 },
      { tmdbId: 12, title: "Tenet", posterPath: null, rank: 1 },
    ];

    const result = computeVersus(listA, listB);
    expect(result.shared).toHaveLength(1);
    expect(result.agreementPct).toBeNull(); // No pairs
    expect(result.sharpestClash).toEqual({
      tmdbId: 10,
      title: "Inception",
      posterPath: null,
      rankA: 1,
      rankB: 5,
      delta: 4,
    });
  });

  test("sharpest clash resolves ties deterministically preferring top ranks", () => {
    const shared: SharedMovie[] = [
      { tmdbId: 1, title: "Film A", posterPath: null, rankA: 10, rankB: 15, delta: 5 }, // |delta| = 5, min rank = 10
      { tmdbId: 2, title: "Film B", posterPath: null, rankA: 2, rankB: 7, delta: 5 },   // |delta| = 5, min rank = 2 (should win)
      { tmdbId: 3, title: "Film C", posterPath: null, rankA: 1, rankB: 2, delta: 1 },   // |delta| = 1
    ];

    const clash = findSharpestClash(shared);
    expect(clash?.tmdbId).toBe(2);
  });

  test("shared favorites filters and sorts mutual top choices accurately", () => {
    const shared: SharedMovie[] = [
      { tmdbId: 1, title: "Mutual #1/#2", posterPath: null, rankA: 1, rankB: 2, delta: 1 },
      { tmdbId: 2, title: "Mutual #2/#1", posterPath: null, rankA: 2, rankB: 1, delta: -1 },
      { tmdbId: 3, title: "Mutual #4/#5", posterPath: null, rankA: 4, rankB: 5, delta: 1 },
      { tmdbId: 4, title: "Disagreed #1/#10", posterPath: null, rankA: 1, rankB: 10, delta: 9 },
    ];

    const favorites = findSharedFavorites(shared, 5);
    expect(favorites).toHaveLength(3);
    // Best sum of ranks (1+2=3, 2+1=3, then 4+5=9)
    expect(favorites[0].tmdbId).toBe(1);
    expect(favorites[1].tmdbId).toBe(2);
    expect(favorites[2].tmdbId).toBe(3);
  });
});
