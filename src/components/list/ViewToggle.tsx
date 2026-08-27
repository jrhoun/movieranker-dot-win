"use client";

export type ViewMode = "stacked" | "rows";

export default function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="List layout"
      className="inline-flex items-center rounded-lg bg-surface-raised/80 p-0.5 ring-1 ring-white/10"
    >
      <button
        type="button"
        role="tab"
        id="view-toggle-tab-stacked"
        aria-selected={mode === "stacked"}
        aria-controls="view-toggle-panel-stacked"
        aria-label="Podium view"
        title="Podium view"
        onClick={() => onChange("stacked")}
        className={`flex size-8 items-center justify-center rounded-md transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-gold ${
          mode === "stacked"
            ? "bg-accent font-semibold text-bg shadow-sm"
            : "text-muted hover:bg-white/5 hover:text-text"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5" />
          <path d="M9 20V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11" />
          <path d="M15 20v-8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v8" />
        </svg>
      </button>
      <button
        type="button"
        role="tab"
        id="view-toggle-tab-rows"
        aria-selected={mode === "rows"}
        aria-controls="view-toggle-panel-rows"
        aria-label="List rows view"
        title="List rows view"
        onClick={() => onChange("rows")}
        className={`flex size-8 items-center justify-center rounded-md transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-gold ${
          mode === "rows"
            ? "bg-accent font-semibold text-bg shadow-sm"
            : "text-muted hover:bg-white/5 hover:text-text"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
    </div>
  );
}
