"use client";

import { useEffect, useState } from "react";
import type { RankedRow } from "@/lib/list-view";
import RowsView from "./RowsView";
import StackedView from "./StackedView";
import ViewToggle, { type ViewMode } from "./ViewToggle";

function isViewMode(v: string | null): v is ViewMode {
  return v === "stacked" || v === "rows";
}

export default function ListViews({ movies }: { movies: RankedRow[] }) {
  const [mode, setMode] = useState<ViewMode>("stacked");

  // async hop so pre-hydration server markup (stacked) matches first client render
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = localStorage.getItem("mr-view");
      if (isViewMode(saved)) setMode(saved);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function change(next: ViewMode) {
    setMode(next);
    try {
      localStorage.setItem("mr-view", next);
    } catch {
      // private mode etc. — preference just won't persist
    }
  }

  return (
    <section aria-label="Ranked list">
      <div className="flex justify-center">
        <ViewToggle mode={mode} onChange={change} />
      </div>
      {/* both views stay mounted; the hidden one is absolute so it never affects layout height */}
      <div className="relative mt-8">
        <div
          aria-hidden={mode !== "stacked"}
          className={`transition-opacity duration-200 ease-out ${
            mode === "stacked" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
          }`}
        >
          <StackedView movies={movies} />
        </div>
        <div
          aria-hidden={mode !== "rows"}
          className={`transition-opacity duration-200 ease-out ${
            mode === "rows" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
          }`}
        >
          <RowsView movies={movies} />
        </div>
      </div>
    </section>
  );
}
