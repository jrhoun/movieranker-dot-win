"use client";

import { useState } from "react";
import { patchShowcase } from "@/lib/public-profile";
import type { Slot } from "@/lib/cosmetics/types";

/**
 * Already-resolved display label, never a raw catalogue lookup: the tagline
 * slot's items carry earned lines whose real `.text`/`.name` is a "{count}"
 * template (or, for `tagline.earned.pioneer`, the exact spoiler text a user
 * who hasn't earned it must not see). The page resolves labels through
 * `resolveTaglineText` before handing them to this client component, which
 * never imports gamification code to do it itself.
 */
export interface PickerItem {
  id: string;
  name: string;
}

export default function CosmeticPicker({
  slot,
  items,
  owned,
  current,
}: {
  slot: Slot;
  items: PickerItem[];
  owned: string[];
  current?: string;
}) {
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  const ownedSet = new Set(owned);

  async function equip(id: string) {
    setSaving(true);
    const ok = await patchShowcase({ equipped: { [slot]: id } });
    if (ok) setSelected(id);
    setSaving(false);
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => {
        const has = ownedSet.has(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!has || saving}
              aria-pressed={selected === item.id}
              onClick={() => equip(item.id)}
              className={`rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
                selected === item.id
                  ? "bg-gold/15 text-gold ring-gold/40"
                  : has
                    ? "bg-surface-raised text-text ring-white/10 hover:ring-gold/40"
                    : "bg-surface-raised/40 text-muted/60 ring-white/5"
              }`}
            >
              {item.name}
              {!has && <span className="ml-1.5" aria-label="locked">🔒</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
