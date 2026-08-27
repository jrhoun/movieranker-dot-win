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
      <div className="flex items-center justify-end pb-2">
        <ViewToggle mode={mode} onChange={change} />
      </div>
      {/* inactive tabpanel is hidden (display: none) so it never occupies space or affects document scrollHeight */}
      <div className="mt-2">
        <div
          role="tabpanel"
          id="view-toggle-panel-stacked"
          aria-labelledby="view-toggle-tab-stacked"
          tabIndex={mode === "stacked" ? 0 : -1}
          aria-hidden={mode !== "stacked"}
          className={mode === "stacked" ? "block" : "hidden"}
        >
          <StackedView movies={movies} />
        </div>
        <div
          role="tabpanel"
          id="view-toggle-panel-rows"
          aria-labelledby="view-toggle-tab-rows"
          tabIndex={mode === "rows" ? 0 : -1}
          aria-hidden={mode !== "rows"}
          className={mode === "rows" ? "block" : "hidden"}
        >
          <RowsView movies={movies} />
        </div>
      </div>
    </section>
  );
}
