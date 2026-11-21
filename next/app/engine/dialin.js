// Dial-in: what one brew says about the grind for the next one. Pure functions only.
// The rule is in docs/BUILD_BRIEF.md section 6.3: more than 25 s over the target suggests one step
// coarser, more than 25 s under suggests one step finer. The clock only suggests. The answer is the
// brewer's own, and nothing changes without a tap. Taste (bitter, sour) joins the rule in Milestone 2.

import { DIAL_IN_STEPS, DIAL_IN_TOLERANCE_S } from './constants.js';
import { nudgeOffset } from './grind.js';

/** The three answers to "How did it drain?". */
export const DRAIN = Object.freeze({ FAST: 'fast', OK: 'ok', SLOW: 'slow' });

export function isDrain(value) {
  return value === DRAIN.FAST || value === DRAIN.OK || value === DRAIN.SLOW;
}

/** What the clock says about a finished brew. Null when no time was recorded. */
export function drainByClock(targetS, actualS) {
  if (!Number.isFinite(targetS) || !Number.isFinite(actualS)) return null;
  const overS = actualS - targetS;
  if (overS > DIAL_IN_TOLERANCE_S) return DRAIN.SLOW;
  if (overS < -DIAL_IN_TOLERANCE_S) return DRAIN.FAST;
  return DRAIN.OK;
}

/** Steps for the next brew: coarser (+) after a slow drain, finer (-) after a fast one, none otherwise. */
export function grindStepsFor(drain) {
  if (drain === DRAIN.SLOW) return DIAL_IN_STEPS;
  if (drain === DRAIN.FAST) return -DIAL_IN_STEPS;
  return 0;
}

/**
 * The grind offset for the next brew, in the grinder's own numbers. fromOffset is the offset the brew
 * was made with, so answering a second time replaces the first answer instead of stacking on it.
 */
export function offsetAfterDrain(fromOffset, grinder, drain) {
  const steps = grindStepsFor(drain);
  return steps === 0 ? fromOffset : nudgeOffset(fromOffset, grinder, steps);
}
