/**
 * How long the vote animation runs, in one place, because two copies drifted.
 *
 * THE BUG THIS FIXES. `handleVote` waited 260ms before swapping in the next
 * pair — a number tuned in bc3eca8 ("snappy recoil") against an animation that
 * was then a 180ms bop followed by a fade. 7c15b4d ("prep: 1.0 release")
 * replaced that with a 380ms flight (translateX 70px, rotate, fade to zero)
 * and did not touch the 260ms. So for every vote since, the next pair mounted
 * at 68% of the outgoing animation: the loser still visibly on screen at
 * roughly a third opacity and half its travel, the winner still displaced
 * mid-lunge. Motion that never resolves does not read as fast, it reads as
 * broken — which is exactly the "not crisp" complaint.
 *
 * The stale comment said "(260ms)" and the CSS said 380ms. Neither was wrong
 * on its own; they simply had no reason to agree. Now they do, and
 * `matchup-timing.test.ts` fails if they stop agreeing.
 *
 * WHY 240 AND NOT 380. Letting the flight finish was one option, but 380ms of
 * animation plus the full-page cross-fade this commit also removes came to
 * roughly 630ms between tap and next matchup — and "laggy" was the other half
 * of the report. 240ms completes the whole gesture and is nearer the snappy
 * 180ms the animation replaced. Ranking is a long sequence of taps; the cost
 * of this number is paid on every single one.
 */
export const MATCHUP_SETTLE_MS = 240;
