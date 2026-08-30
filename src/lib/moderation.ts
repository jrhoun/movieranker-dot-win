import { isProfane } from "./handles";

/**
 * Which words in a piece of public text trip the blocklist.
 *
 * A HINT FOR SORTING, NEVER A VERDICT. `isProfane` folds leetspeak and
 * substring-matches a small blocklist; it was written for handles, which are
 * short and have no spaces. Pointed at free prose it will both miss things and
 * cry wolf — "Scunthorpe" is the canonical example of the second, and the
 * blocklist is far too small for the first.
 *
 * So this returns the matched tokens rather than a boolean: the admin queue
 * shows what tripped, and a person decides. Nothing acts on this
 * automatically, and every public list is listed whether it matches or not —
 * a queue that showed only matches would quietly let a word list define what
 * is objectionable, which it is not fit to do.
 *
 * Tokenised rather than checked whole, because a substring match against an
 * entire description is far likelier to be an accident of adjacency than a
 * real hit.
 */
export function flagsFor(parts: (string | null | undefined)[]): string[] {
  const hits: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    for (const token of part.split(/\s+/)) {
      const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (cleaned && isProfane(cleaned) && !hits.includes(cleaned)) hits.push(cleaned);
    }
  }
  return hits;
}
