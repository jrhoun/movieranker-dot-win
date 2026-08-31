"use client";

import { useEffect, useState } from "react";
import { CONNECTION_REVEALED_EVENT, connectionStorageKey } from "@/lib/connection-state";
import { readConnectionOutcome } from "@/lib/share-text";

/**
 * A finished Marquee's title, which changes once this reader knows the answer.
 *
 * WHAT IT REPLACED. The page showed an eyebrow reading "Weekly Marquee Theme"
 * over a heading reading "Weekly Marquee #2" — the words "Weekly Marquee"
 * twice, and an eyebrow promising a theme that the heading then withheld. The
 * withholding is right (a theme title paraphrases the quiz answer, so naming it
 * hands the puzzle to anyone who has not played) but between them the two lines
 * said nothing. The number now sits in the eyebrow, where an identifier
 * belongs, and this carries the actual state of play: the question while it is
 * still a question, the answer once it has been earned.
 *
 * PER-READER, NOT PER-LIST. Whether the answer is known lives in
 * localStorage("mr-conn-<slug>"), written by MarqueeConnectionGame. It is a
 * property of the person reading, not of the list, so a shared link still opens
 * on the question for someone who has not played — which is the entire point of
 * the spoiler rule. Parsed with `readConnectionOutcome`, the same reader
 * ShareButton uses, rather than a third copy of that shape.
 *
 * The title ships to the client either way: the quiz component already receives
 * it as `revealTitle`, because it has to be able to reveal it. This is a UI
 * reveal, not a secret. It never reaches og:title or the share text, which are
 * resolved on the server and stay withheld permanently.
 *
 * Renders only the words. Layout, the eyebrow and the buttons beside it stay in
 * the page, so this stops being a client component the moment it stops needing
 * to be one.
 */
export default function MarqueeListTitle({
  themeSlug,
  themeTitle,
}: {
  themeSlug: string;
  /** The real theme title, shown only once this reader has seen the answer. */
  themeTitle: string;
}) {
  const [answered, setAnswered] = useState(false);

  // After mount, like ShareButton: the server and the first client render must
  // agree or hydration mismatches.
  useEffect(() => {
    const check = () => {
      try {
        const outcome = readConnectionOutcome(
          localStorage.getItem(connectionStorageKey(themeSlug)),
        );
        // "unplayed" covers never-opened and opened-without-revealing alike.
        if (outcome !== "unplayed") setAnswered(true);
      } catch {
        // Storage blocked (private mode, cookies off): stay on the question.
        // Failing closed leaves the puzzle intact, which is the safer default.
      }
    };

    Promise.resolve().then(check);

    // The quiz sits further down THIS page, so the common case is answering it
    // while this heading is already mounted. Without listening, the heading
    // would go on asking the question directly above the card that had just
    // answered it until a reload.
    window.addEventListener(CONNECTION_REVEALED_EVENT, check);
    return () => window.removeEventListener(CONNECTION_REVEALED_EVENT, check);
  }, [themeSlug]);

  // The same question the OG card and og:title ask, so a link preview and the
  // page it opens read as one thing.
  return <span>{answered ? themeTitle : "What connects these films?"}</span>;
}
