"use client";

import { useState } from "react";
import ListRow, { type ListRowData } from "./ListRow";
import { patchShowcase } from "@/lib/public-profile";

// Owns the single-favorite rule across rows: starring a new row unstars the
// old one, optimistically, persisted via PATCH /api/profile.
export default function ShowcaseLists({
  cards,
  initialFavoriteId,
}: {
  cards: ListRowData[];
  initialFavoriteId: string | null;
}) {
  const [favoriteId, setFavoriteId] = useState<string | null>(initialFavoriteId);

  async function toggle(id: string) {
    const prev = favoriteId;
    const next = prev === id ? null : id;
    setFavoriteId(next); // optimistic
    if (!(await patchShowcase({ favoriteListId: next }))) setFavoriteId(prev);
  }

  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {cards.map((list) => (
        <li key={list.id}>
          <ListRow
            list={list}
            featured={list.id === favoriteId}
            onToggleFeature={() => void toggle(list.id)}
          />
        </li>
      ))}
    </ul>
  );
}
