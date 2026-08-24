"use client";

import { useRef } from "react";

interface TabOption<K extends string> {
  key: K;
  label: string;
}

/**
 * ARIA tabs tablist with roving tabindex and automatic activation:
 * ArrowLeft/ArrowRight/Home/End move focus+selection; panels are owned by the
 * parent via role="tabpanel" + aria-labelledby=`${idPrefix}-tab-<key>`.
 */
export default function Tabs<K extends string>({
  idPrefix,
  ariaLabel,
  options,
  value,
  onSelect,
  tabClassName,
}: {
  idPrefix: string;
  ariaLabel: string;
  options: TabOption<K>[];
  value: K;
  onSelect: (key: K) => void;
  tabClassName: (active: boolean) => string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    const last = options.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = idx === last ? 0 : idx + 1;
    else if (e.key === "ArrowLeft") next = idx === 0 ? last : idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    const key = options[next].key;
    onSelect(key);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={ariaLabel}>
      {options.map((o, i) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-tab-${o.key}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(o.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={tabClassName(active)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
