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
 * WHY 380 AND NOT LESS. This was 240 for one release and that was too short:
 * the recoil stopped reading as a recoil, and the animation was reported as
 * simply not happening. The motion is a 70px flight with a scale, a rotation
 * and an overshoot ease — it was authored at 380ms to be legible, and cutting
 * it to 240 to chase "snappy" removed the thing the fix was meant to restore.
 *
 * Speed was never the defect. The defect was that the swap fired at 260ms and
 * a full-page cross-fade sat on top; between them the gesture cost about 630ms
 * and never resolved. At 380ms with the swap aligned and the cross-fade gone,
 * the whole vote is a little over half what it was AND the animation actually
 * completes. Making it shorter than the motion needs buys milliseconds at the
 * price of the feedback the tap exists to give.
 */
export const MATCHUP_SETTLE_MS = 380;
