import { describe, expect, it } from "vitest";
import {
  isOwnerEmail,
  parseProposal,
  parseProposalStatus,
} from "./proposals-api";

const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("parseProposal", () => {
  it("accepts a valid proposal and returns trimmed values", () => {
    const r = parseProposal({
      title: "  Rain again  ",
      blurb: " wet ",
      movieIds: [550, 550, ...ids(6)],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("Rain again");
      expect(r.value.blurb).toBe("wet");
      // dedupe: 550 twice -> 7 distinct
      expect(r.value.movieIds).toHaveLength(7);
    }
  });

  it("rejects bad titles", () => {
    expect(parseProposal({ title: "", movieIds: ids(6) }).ok).toBe(false);
    expect(parseProposal({ title: "x".repeat(81), movieIds: ids(6) }).ok).toBe(false);
    expect(parseProposal({ movieIds: ids(6) }).ok).toBe(false);
  });

  it("rejects over-long blurbs", () => {
    expect(parseProposal({ title: "t", blurb: "b".repeat(201), movieIds: ids(6) }).ok).toBe(false);
  });

  it("requires 6-8 distinct integer movieIds", () => {
    expect(parseProposal({ title: "t", movieIds: ids(5) }).ok).toBe(false);
    expect(parseProposal({ title: "t", movieIds: ids(9) }).ok).toBe(false);
    expect(parseProposal({ title: "t", movieIds: ["11", null, 3.5] as unknown[] }).ok).toBe(false);
    expect(parseProposal({ title: "t" }).ok).toBe(false);
    // dedupe can rescue a longer list into range
    expect(parseProposal({ title: "t", movieIds: [1, 1, 1, 1, ...ids(6)] }).ok).toBe(true);
  });
});

describe("parseProposalStatus", () => {
  it("whitelists the three real states and nothing else", () => {
    expect(parseProposalStatus("approved")).toBe("approved");
    expect(parseProposalStatus("rejected")).toBe("rejected");
    // Accepted so a decision can be undone — reverting an approval pulls the
    // theme back out of the live shortlist, which is the point.
    expect(parseProposalStatus("pending")).toBe("pending");
  });

  it("refuses anything that is not one of them", () => {
    for (const bad of [undefined, null, "", "APPROVED", "deleted", 1, {}, ["approved"]]) {
      expect(parseProposalStatus(bad), JSON.stringify(bad) ?? "undefined").toBeNull();
    }
  });
});

describe("isOwnerEmail", () => {
  const saved = process.env.OWNER_EMAIL;

  function withOwner(v: string | undefined) {
    if (v === undefined) delete process.env.OWNER_EMAIL;
    else process.env.OWNER_EMAIL = v;
  }

  it("matches case-insensitively around whitespace", () => {
    withOwner(" Owner@Example.com ");
    expect(isOwnerEmail("owner@example.com")).toBe(true);
    expect(isOwnerEmail("other@example.com")).toBe(false);
  });

  it("is closed when OWNER_EMAIL is unset or empty", () => {
    withOwner(undefined);
    expect(isOwnerEmail("owner@example.com")).toBe(false);
    withOwner("");
    expect(isOwnerEmail("owner@example.com")).toBe(false);
  });

  it("never matches an absent email", () => {
    withOwner("owner@example.com");
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
  });

  if (saved === undefined) delete process.env.OWNER_EMAIL;
  else process.env.OWNER_EMAIL = saved;
});
