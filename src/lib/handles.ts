// Profile handles: pure helpers shared by API validation and the claim UI.
// Stored normalized (lowercase) in profiles.handle.

export const HANDLE_RE = /^[a-z0-9_-]{3,20}$/;

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

export type HandleCheck = { ok: true; handle: string } | { ok: false; reason: "invalid" | "reserved" };

/** Normalize then validate; reason is user-facing ("invalid" | "reserved"). */
export function checkHandle(raw: string): HandleCheck {
  const handle = normalizeHandle(raw);
  if (!isValidHandle(handle)) return { ok: false, reason: "invalid" };
  if (isReserved(handle)) return { ok: false, reason: "reserved" };
  return { ok: true, handle };
}
