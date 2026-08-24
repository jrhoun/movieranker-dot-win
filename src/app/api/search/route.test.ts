import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tmdb = {
  searchPerson: vi.fn(async () => []),
  searchCompany: vi.fn(async () => []),
  searchMovies: vi.fn(async () => []),
  searchByKeyword: vi.fn(async () => []),
  getPersonCredits: vi.fn(async () => []),
  discoverByCompany: vi.fn(async () => []),
};

vi.mock("@/lib/tmdb", () => tmdb);

const { GET } = await import("./route");

function call(params: string) {
  return new NextRequest(`http://localhost/api/search?${params}`);
}

beforeEach(() => {
  for (const fn of Object.values(tmdb)) fn.mockClear();
});

describe("GET /api/search", () => {
  it.each(["person", "company", "keyword", "title"])(
    "rejects empty q with 400 for mode=%s without hitting TMDB",
    async (mode) => {
      const res = await GET(call(`mode=${mode}&q=%20%20`));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "q required" });
      for (const fn of Object.values(tmdb)) expect(fn).not.toHaveBeenCalled();
    },
  );

  it("does not require q for company-discover (ref-based)", async () => {
    const res = await GET(call("mode=company-discover&ref=42"));
    expect(res.status).toBe(200);
    expect(tmdb.discoverByCompany).toHaveBeenCalledWith(42);
  });

  it("maps mode=keyword to real keyword search", async () => {
    await GET(call("mode=keyword&q=time+travel"));
    expect(tmdb.searchByKeyword).toHaveBeenCalledWith("time travel");
    expect(tmdb.searchMovies).not.toHaveBeenCalled();
  });
});
