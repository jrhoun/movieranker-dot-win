import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReferralInviteCard from "@/components/profile/ReferralInviteCard";
import type { ReferralStats } from "@/lib/referrals";

const stats: ReferralStats = { activeReferrals: 0, totalReferred: 0, bonusXp: 0 };

const render = (handle: string | null) =>
  renderToStaticMarkup(createElement(ReferralInviteCard, { handle, stats }));

describe("ReferralInviteCard", () => {
  it("shares a link that carries the handle", () => {
    const html = render("nolanfan");
    expect(html).toContain("https://www.movieranker.win/?ref=nolanfan");
    expect(html).toContain("Copy link");
    expect(html).not.toContain("Claim your handle");
  });

  it("offers no link at all until a handle is claimed", () => {
    // `?ref=join` resolved to nobody, so every friend who followed it was
    // credited to no one.
    const html = render(null);
    expect(html).not.toContain("?ref=");
    expect(html).not.toContain("ref=join");
    expect(html).not.toContain("Copy link");
    expect(html).toContain('href="#claim-heading"');
    expect(html).toContain("Claim your handle");
    expect(html).toContain("to get your invite link.");
  });
});
