import React from "react";

export interface BetaBadgeProps {
  className?: string;
}

export default function BetaBadge({ className }: BetaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold ring-1 ring-gold/40 ${className ?? ""}`}
    >
      Beta
    </span>
  );
}
