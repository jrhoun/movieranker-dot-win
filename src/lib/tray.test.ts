import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStagedDraft,
  loadStagedDraft,
  MAX_LIST_SIZE,
  mergeCandidates,
  parseParticipantNames,
  rangeIndices,
  removeCandidates,
  saveStagedDraft,
} from "./tray";
import type { TmdbMovieCredit } from "@/lib/tmdb";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
});

const movie = (tmdbId: number, title: string): TmdbMovieCredit => ({
  tmdbId,
  title,
  posterPath: null,
  releaseYear: 2000,
});

describe("mergeCandidates", () => {
  it("adds new movies sorted by title", () => {
    const merged = mergeCandidates([movie(1, "Alien")], [movie(2, "Beetlejuice"), movie(3, "Arrival")]);
    expect(merged.map((m) => m.title)).toEqual(["Alien", "Arrival", "Beetlejuice"]);
  });

  it("dedupes by tmdbId without duplicating or dropping existing entries", () => {
    const existing = [movie(1, "Alien")];
    expect(mergeCandidates(existing, [movie(1, "Alien"), movie(2, "Barbie")])).toHaveLength(2);
    expect(existing).toHaveLength(1);
  });

  it("returns an equivalent list when everything is a duplicate", () => {
    const existing = [movie(1, "Alien"), movie(2, "Barbie")];
    expect(mergeCandidates(existing, [movie(1, "Alien")])).toEqual(existing);
  });

  it("silently stops a batch add exactly at the cap", () => {
    const existing = Array.from({ length: 99 }, (_, i) => movie(i + 1, `T${String(i + 1).padStart(3, "0")}`));
    const batch = Array.from({ length: 50 }, (_, i) => movie(1000 + i, `Z${i}`));
    const merged = mergeCandidates(existing, batch);
    expect(merged).toHaveLength(MAX_LIST_SIZE);
    expect(merged.map((m) => m.tmdbId)).toContain(1000); // first of batch fits
    expect(merged.map((m) => m.tmdbId)).not.toContain(1049); // overflow dropped
  });

  it("caps a single oversized batch added from empty", () => {
    const batch = Array.from({ length: 150 }, (_, i) => movie(i + 1, `M${String(i + 1).padStart(3, "0")}`));
    expect(mergeCandidates([], batch)).toHaveLength(MAX_LIST_SIZE);
  });
});

describe("removeCandidates", () => {
  it("removes every candidate matching incoming tmdbIds", () => {
    const current = [movie(1, "Alien"), movie(2, "Barbie"), movie(3, "Coco")];
    expect(removeCandidates(current, [movie(2, "Barbie")]).map((m) => m.tmdbId)).toEqual([1, 3]);
  });

  it("removes nothing when incoming overlaps no candidates", () => {
    const current = [movie(1, "Alien")];
    expect(removeCandidates(current, [movie(9, "Dune")])).toEqual(current);
  });

  it("dedupes-safe: duplicate ids and empty incoming are fine", () => {
    const current = [movie(1, "Alien"), movie(2, "Barbie")];
    expect(removeCandidates(current, [movie(1, "Alien"), movie(1, "Alien")])).toEqual([movie(2, "Barbie")]);
    expect(removeCandidates(current, [])).toEqual(current);
  });
});

describe("rangeIndices", () => {
  it("returns the inclusive forward range", () => {
    expect(rangeIndices(0, 3)).toEqual([0, 1, 2, 3]);
  });

  it("handles reverse selection (clicked above last)", () => {
    expect(rangeIndices(4, 2)).toEqual([2, 3, 4]);
  });

  it("single-element range when clicking the same index", () => {
    expect(rangeIndices(5, 5)).toEqual([5]);
  });
});

describe("parseParticipantNames", () => {
  it("splits comma-separated names and trims whitespace", () => {
    expect(parseParticipantNames("Dave, Sarah")).toEqual(["Dave", "Sarah"]);
    expect(parseParticipantNames(" Dave ,  Sarah,Kim ")).toEqual(["Dave", "Sarah", "Kim"]);
  });

  it("keeps single names working like before", () => {
    expect(parseParticipantNames("Sarah")).toEqual(["Sarah"]);
  });

  it("drops empties and duplicates within the batch", () => {
    expect(parseParticipantNames(", Dave,,Dave")).toEqual(["Dave"]);
    expect(parseParticipantNames("  ,")).toEqual([]);
  });
});

describe("staged draft persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads staged draft correctly", () => {
    const draft = {
      title: "My Ranking",
      participants: ["Alice", "Bob"],
      candidates: [movie(1, "Inception"), movie(2, "Interstellar")],
    };
    saveStagedDraft(draft);
    expect(loadStagedDraft()).toEqual(draft);
  });

  it("clears draft from storage", () => {
    saveStagedDraft({
      title: "Test",
      participants: [],
      candidates: [movie(1, "Inception")],
    });
    expect(loadStagedDraft()).not.toBeNull();
    clearStagedDraft();
    expect(loadStagedDraft()).toBeNull();
  });

  it("removes storage entry when saving empty draft", () => {
    saveStagedDraft({
      title: "Test",
      participants: [],
      candidates: [movie(1, "Inception")],
    });
    saveStagedDraft({
      title: "",
      participants: [],
      candidates: [],
    });
    expect(loadStagedDraft()).toBeNull();
  });
});
