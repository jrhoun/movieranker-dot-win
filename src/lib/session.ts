import type { RankedMovie } from "./ranking";

export interface PlaySession {
  title: string;
  participants: string[];
  movies: RankedMovie[];
  votesSinceOrderChange: number;
  nudgeShown: boolean;
}

const KEY = "mr-session";

export function loadSession(): PlaySession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlaySession;
  } catch {
    return null;
  }
}

export function saveSession(s: PlaySession): void {
  // ponytail: quota errors swallowed silently; surface a toast if users ever hit it
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
