"use client";

export type ViewMode = "stacked" | "rows";

const OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "stacked", label: "Stacked" },
  { key: "rows", label: "Rows" },
];

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
      className="inline-flex rounded bg-surface-raised p-1 ring-1 ring-white/10"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={mode === o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`min-h-11 rounded px-5 text-sm transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            mode === o.key ? "bg-accent font-semibold text-bg" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
