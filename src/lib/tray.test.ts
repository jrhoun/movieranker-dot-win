import { describe, expect, it } from "vitest";
import { mergeCandidates, parseParticipantNames, rangeIndices } from "./tray";
import type { TmdbMovieCredit } from "@/lib/tmdb";

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
