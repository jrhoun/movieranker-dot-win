"use client";

function SoundOnIcon({ className = "size-3.5 sm:size-4" }: { className?: string }) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon({ className = "size-3.5 sm:size-4" }: { className?: string }) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export interface SoundToggleProps {
  isSoundEnabled: boolean;
  onToggle: () => void;
  className?: string;
}

export default function SoundToggle({
  isSoundEnabled,
  onToggle,
  className = "",
}: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSoundEnabled}
      aria-label={
        isSoundEnabled
          ? "Cinema sound enabled. Click to mute vintage audio effects."
          : "Cinema sound muted. Click to enable vintage audio effects."
      }
      title={isSoundEnabled ? "Mute audio (Sound: ON)" : "Unmute audio (Sound: OFF)"}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95 cursor-pointer ${
        isSoundEnabled
          ? "bg-gold/15 text-gold ring-gold/40 hover:bg-gold/25"
          : "bg-surface-raised/80 text-muted ring-white/10 hover:bg-white/10 hover:text-text"
      } ${className}`}
    >
      {isSoundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
      <span className="hidden sm:inline">
        {isSoundEnabled ? "Sound ON" : "Sound OFF"}
      </span>
    </button>
  );
}
