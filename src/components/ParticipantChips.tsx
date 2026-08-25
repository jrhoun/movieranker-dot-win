import Link from "next/link";
import type { ParticipantChip } from "@/lib/participants";

// Subtle linked-person marker per DESIGN.md "labels over icons": tiny glyph,
// muted color, aria-hidden since the chip already reads as a name.
export function PersonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="ml-1 inline size-3.5 shrink-0 text-gold/80 align-[-2px]"
      fill="currentColor"
    >
      <circle cx="8" cy="5" r="3" />
      <path d="M2.5 14a5.5 5.5 0 0 1 11 0z" />
    </svg>
  );
}

/** Participant names as quiet chips; attributed + public ones link to profiles. */
export default function ParticipantChips({ chips }: { chips: ParticipantChip[] }) {
  return (
    <>
      {chips.map((chip, i) => (
        <span key={`${chip.name}-${i}`}>
          {i > 0 && ", "}
          {chip.handle ? (
            <Link
              href={`/u/${chip.handle}`}
              title={`@${chip.handle}`}
              className="underline-offset-4 transition-colors duration-200 ease-out hover:text-gold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {chip.name}
              <PersonIcon />
            </Link>
          ) : (
            <span>{chip.name}</span>
          )}
          {chip.attributed && !chip.handle && <PersonIcon />}
        </span>
      ))}
    </>
  );
}
