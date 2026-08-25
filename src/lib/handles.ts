// Profile handles: pure helpers shared by API validation and the claim UI.
// Stored normalized (lowercase) in profiles.handle.

export const HANDLE_RE = /^[a-z0-9_-]{3,20}$/;

// ponytail: blocklist catches obvious cases only; user reports + admin review cover the rest
export const PROFANITY_BLOCKLIST = [
  "asshole",
  "bastard",
  "bitch",
  "cock",
  "cunt",
  "dick",
  "dildo",
  "fag",
  "fuck",
  "jizz",
  "nigg",
  "penis",
  "porn",
  "prick",
  "pussy",
  "rape",
  "retard",
  "shit",
  "slut",
  "spunk",
  "twat",
  "vagina",
  "wank",
  "whore",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
};

/** Fold common leetspeak substitutions; used for profanity checks only. */
function deLeet(handle: string): string {
  return handle.replace(/[013457@$]/g, (c) => LEET[c]);
}

/** True if the handle contains a blocklisted term after leetspeak folding. */
export function isProfane(handle: string): boolean {
  const folded = deLeet(normalizeHandle(handle));
  return PROFANITY_BLOCKLIST.some((word) => folded.includes(word));
}

/** Routes that must never be shadowed by a public profile path. */
export const RESERVED = new Set([
  "admin",
  "login",
  "signup",
  "api",
  "u",
  "l",
  "r",
  "about",
  "privacy",
  "terms",
  "support",
  "help",
  "me",
  "profile",
  "settings",
  "root",
  "moderator",
]);

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

export function isReserved(handle: string): boolean {
  return RESERVED.has(handle);
}

export type HandleCheck =
  | { ok: true; handle: string }
  | { ok: false; reason: "invalid" | "reserved" | "profane" };

/** Normalize then validate; reason is user-facing ("invalid" | "reserved" | "profane"). */
export function checkHandle(raw: string): HandleCheck {
  const handle = normalizeHandle(raw);
  // Profanity before shape: leet spellings with symbols (@/$) fail the regex
  // but users deserve the accurate rejection reason.
  if (isProfane(handle)) return { ok: false, reason: "profane" };
  if (!isValidHandle(handle)) return { ok: false, reason: "invalid" };
  if (isReserved(handle)) return { ok: false, reason: "reserved" };
  return { ok: true, handle };
}
