import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import VisitorDoor, { shouldShowVisitorDoor, visitorDoorLinks } from "./VisitorDoor";

describe("shouldShowVisitorDoor", () => {
  it("shows for a signed-out visitor", () => {
    expect(shouldShowVisitorDoor({ viewerId: null, ownerId: "owner" })).toBe(true);
    expect(shouldShowVisitorDoor({ viewerId: undefined, ownerId: "owner" })).toBe(true);
  });

  it("shows for a signed-in visitor who is not the owner", () => {
    expect(shouldShowVisitorDoor({ viewerId: "someone-else", ownerId: "owner" })).toBe(true);
  });

  it("never shows to the owner", () => {
    expect(shouldShowVisitorDoor({ viewerId: "owner", ownerId: "owner" })).toBe(false);
  });
});

describe("visitorDoorLinks", () => {
  it("sends play to the Marquee and signup through /login with the referrer", () => {
    expect(visitorDoorLinks("moviebuff")).toEqual({
      play: "/",
      signup: "/login?mode=signup&next=%2Fu%2Fprofile&ref=moviebuff",
    });
  });

  it("encodes a handle that needs it", () => {
    expect(visitorDoorLinks("a&b").signup).toContain("ref=a%26b");
  });
});

describe("VisitorDoor", () => {
  it("renders the one sentence, one primary button and one quiet signup link", () => {
    const html = renderToStaticMarkup(h(VisitorDoor, { handle: "moviebuff" }));
    expect(html).toContain("Rank the same films and see where you and @moviebuff disagree.");
    expect(html).toContain("Play this week");
    expect(html).toContain('href="/"');
    expect(html).toContain("Create your profile");
    expect(html).toContain('href="/login?mode=signup&amp;next=%2Fu%2Fprofile&amp;ref=moviebuff"');
    // Exactly one gold primary.
    expect(html.match(/bg-gold/g)?.length).toBe(1);
    // No emoji or icon chrome.
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
