"use client";

import Tabs from "../Tabs";

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
    <Tabs
      idPrefix="view-toggle"
      panelId={(key) => `view-toggle-panel-${key}`}
      ariaLabel="List layout"
      options={OPTIONS}
      value={mode}
      onSelect={onChange}
      tabClassName={(active) =>
        `min-h-11 rounded px-5 text-sm transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          active ? "bg-accent font-semibold text-bg" : "text-muted hover:text-text active:text-text"
        }`
      }
    />
  );
}
