"use client";

import { useState } from "react";
import { patchShowcase } from "@/lib/public-profile";

const POSTER = "https://image.tmdb.org/t/p/w185";

export default function AvatarPicker({
  films,
  current,
}: {
  films: { tmdbId: number; title: string; posterPath: string | null }[];
  current?: number;
}) {
  const [selected, setSelected] = useState(current);

  async function choose(tmdbId: number, posterPath: string) {
    const ok = await patchShowcase({
      equipped: { avatarTmdbId: tmdbId, avatarPosterPath: posterPath },
    });
    if (ok) setSelected(tmdbId);
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {films
        .filter((f): f is { tmdbId: number; title: string; posterPath: string } => !!f.posterPath)
        .map((f) => (
          <li key={f.tmdbId}>
            <button
              type="button"
              onClick={() => choose(f.tmdbId, f.posterPath)}
              aria-pressed={selected === f.tmdbId}
              title={f.title}
              className={`block rounded p-0.5 ring-2 transition-colors ${
                selected === f.tmdbId ? "ring-gold" : "ring-transparent hover:ring-gold/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${POSTER}${f.posterPath}`}
                alt={f.title}
                className="h-[72px] w-12 rounded-sm object-cover"
              />
            </button>
          </li>
        ))}
    </ul>
  );
}
