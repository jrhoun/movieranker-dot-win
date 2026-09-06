"use client";

function ProjectorBeamIcon({ className = "size-3.5 sm:size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="14" height="10" rx="2" fill="currentColor" fillOpacity="0.2" />
      <polygon points="16 10 22 7 22 17 16 14 16 10" fill="currentColor" />
      <circle cx="9" cy="12" r="2" />
    </svg>
  );
}

export interface LightsDownToggleProps {
  isLightsDown: boolean;
  onToggle: () => void;
  className?: string;
}

export default function LightsDownToggle({
  isLightsDown,
  onToggle,
  className = "",
}: LightsDownToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isLightsDown}
      aria-label={
        isLightsDown
          ? "Theater mode enabled. Click to restore room lights."
          : "Click to dim room lights and focus on the matchup stage."
      }
      title={
        isLightsDown
          ? "Lights up (Exit Theater Mode)"
          : "Dim lights (Theater Mode)"
      }
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 cursor-pointer ${
        isLightsDown
          ? "bg-gold/15 text-gold ring-gold/40 shadow-[0_0_12px_rgba(245,197,24,0.2)] hover:bg-gold/25"
          : "bg-surface-raised/80 text-muted ring-white/10 hover:bg-white/10 hover:text-text"
      } ${className}`}
    >
      <ProjectorBeamIcon />
      <span className="hidden sm:inline">
        {isLightsDown ? "Lights Up" : "Dim Lights"}
      </span>
    </button>
  );
}
