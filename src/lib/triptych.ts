/**
 * Triptych card art: take the top-ranked posters (best first) and return
 * exactly three slots — posters first, then null fillers for surface panels.
 */
export function triptychSlots<T>(posters: T[]): (T | null)[] {
  const slots: (T | null)[] = posters.slice(0, 3);
  while (slots.length < 3) slots.push(null);
  return slots;
}
