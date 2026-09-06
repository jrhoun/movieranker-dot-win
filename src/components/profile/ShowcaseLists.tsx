"use client";

import { useState } from "react";
import ParticipantChips from "@/components/ParticipantChips";
import ListCard from "./ListCard";
import ListRow, { ListActions, type ListRowData } from "./ListRow";
import { patchShowcase } from "@/lib/public-profile";

/** Same UTC formatting the rows use, so the two never disagree by a day. */
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The owner's rankings: finished ones on the poster wall the public profile
 * shows, drafts as rows beneath them.
 *
 * Owns the single-favourite rule across the wall — featuring a ranking
 * unfeatures the old one, optimistically, persisted via PATCH /api/profile.
 */
export default function ShowcaseLists({
  cards,
  initialFavoriteId,
  userLevel = 1,
}: {
  cards: ListRowData[];
  initialFavoriteId: string | null;
  userLevel?: number;
}) {
  const [favoriteId, setFavoriteId] = useState<string | null>(initialFavoriteId);

  async function toggle(id: string) {
    const prev = favoriteId;
    const next = prev === id ? null : id;
    setFavoriteId(next); // optimistic
    if (!(await patchShowcase({ favoriteListId: next }))) setFavoriteId(prev);
  }

  const done = cards.filter((c) => c.status === "done");
  const drafts = cards.filter((c) => c.status === "draft");
  // The featured ranking leads the wall, exactly as it does on the public page.
  const featured = done.find((c) => c.id === favoriteId);
  const wall = featured ? [featured, ...done.filter((c) => c.id !== featured.id)] : done;

  return (
    <>
      {wall.length > 0 && (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {wall.map((card) => {
            const isFeatured = card.id === favoriteId;
            return (
              <li key={card.id} className={isFeatured ? "sm:col-span-2" : undefined}>
                <ListCard
                  href={`/l/${card.id}`}
                  title={card.title}
                  meta={`${card.posters.length} ${card.posters.length === 1 ? "film" : "films"}, ${shortDate(card.createdAt)}`}
                  caption={
                    card.chips && card.chips.length > 0 ? (
                      <>
                        With <ParticipantChips chips={card.chips} />
                      </>
                    ) : undefined
                  }
                  posters={card.posters}
                  slots={isFeatured ? 5 : 3}
                  featured={isFeatured}
                  footer={
                    <ListActions
                      list={card}
                      featured={isFeatured}
                      onToggleFeature={() => void toggle(card.id)}
                      userLevel={userLevel}
                      className="mt-2.5"
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {drafts.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-2xl uppercase tracking-[0.08em] text-text">
            Still ranking
          </h3>
          <ul className="mt-2">
            {drafts.map((list) => (
              <li key={list.id}>
                <ListRow list={list} userLevel={userLevel} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
