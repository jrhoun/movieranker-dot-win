"use client";

import React, { useState } from "react";
import BetaRequirementsModal from "./BetaRequirementsModal";

export interface BetaBadgeProps {
  className?: string;
}

export default function BetaBadge({ className }: BetaBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label="View beta requirements"
        title="View beta requirements"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleOpen(e);
          }
        }}
        className={`inline-flex items-center rounded-md bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold ring-1 ring-gold/40 cursor-pointer hover:bg-gold/25 hover:ring-gold/60 focus-visible:outline-2 focus-visible:outline-gold ${className ?? ""}`}
      >
        Beta
      </span>
      {isOpen && <BetaRequirementsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  );
}
