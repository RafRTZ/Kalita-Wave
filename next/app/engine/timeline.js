// Timer logic. Pure functions only: everything is worked out from timestamps passed in, never by counting
// ticks, so a reload or an app switch lands on the right second. See docs/BUILD_BRIEF.md section 5.3.
//
// A "run" is one brew in progress. It is a plain object that can be saved and loaded as JSON.
// The "brew clock" is seconds since 0:00; it is negative during the count-in.

import { AUTO_END_AFTER_S, PAUSE_EXPIRES_S, STEP_FLASH_S, TICK_OFFSETS_S } from './constants.js';

export const PHASE = Object.freeze({
  GET_READY: 'get_ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  DONE: 'done',
});

export const CUE = Object.freeze({ HEADS_UP: 'headsup', TICK: 'tick', POUR: 'pour', FINISH: 'finish' });

const CUE_TOLERANCE_S = 0.05;

/** Start a run. plan needs { steps: [{ startS, targetG, style }], totalS } and may carry anything else. */
export function createRun(plan, { nowMs, countInS, headsUpS, id = null }) {
  return {
    v: 1,
    id: id ?? `run-${nowMs}`,
    plan,
    countInS,
    headsUpS,
    startedAtMs: nowMs,
    pausedAtMs: null,
    pausedMs: 0,
    doneAtMs: null,
    actualS: null,
    autoEnded: false,
  };
}

/** Seconds on the brew clock. Frozen while paused and after Done. */
export function elapsedS(run, nowMs) {
  const readAtMs = run.doneAtMs ?? run.pausedAtMs ?? nowMs;
  return (readAtMs - run.startedAtMs - run.pausedMs) / 1000 - run.countInS;
}

export function pauseRun(run, nowMs) {
  if (run.pausedAtMs != null || run.doneAtMs != null) return run;
  return { ...run, pausedAtMs: nowMs };
}

export function resumeRun(run, nowMs) {
  if (run.pausedAtMs == null || run.doneAtMs != null) return run;
  return { ...run, pausedMs: run.pausedMs + (nowMs - run.pausedAtMs), pausedAtMs: null };
}

/** The user tapped Done. Records the actual total time in whole seconds. */
export function finishRun(run, nowMs) {
  if (run.doneAtMs != null) return run;
  const live = resumeRun(run, nowMs);
  const done = { ...live, doneAtMs: nowMs, autoEnded: false };
  return { ...done, actualS: Math.max(0, Math.round(elapsedS(done, nowMs))) };
}

/** Nobody tapped Done. The run ends with no actual time recorded. */
export function autoEndRun(run, nowMs) {
  if (run.doneAtMs != null) return run;
  return { ...resumeRun(run, nowMs), doneAtMs: nowMs, actualS: null, autoEnded: true };
}

/** Undo Done. The clock carries on as if Done had not been tapped. */
export function reopenRun(run) {
  if (run.doneAtMs == null) return run;
  return { ...run, doneAtMs: null, actualS: null, autoEnded: false };
}

export function phaseOf(run, nowMs) {
  if (run.doneAtMs != null) return PHASE.DONE;
  if (run.pausedAtMs != null) return PHASE.PAUSED;
  return elapsedS(run, nowMs) < 0 ? PHASE.GET_READY : PHASE.RUNNING;
}

/**
 * How far each step has run at brew-clock time t, from 0 to 1, for the shading that moves across the step
 * list. A step runs from its start to the start of the next one; the last pour runs to the target finish
 * time. Every step is 0 during the count-in and 1 once the target has passed.
 */
export function stepProgress(plan, t) {
  const { steps, totalS } = plan;
  return steps.map((step, i) => {
    const endS = i + 1 < steps.length ? steps[i + 1].startS : totalS;
    if (t >= endS) return 1;
    if (t <= step.startS) return 0;
    return (t - step.startS) / (endS - step.startS);
  });
}

/**
 * Everything the timer screen shows at one instant.
 * stepIndex is -1 during the count-in. nextInS counts down to the next pour, or to the target finish time
 * once the last pour has started. countdown and fill are the visual twin of the sound cues: a whole number
 * of seconds and a 0 to 1 fill, present only inside the heads-up window (or the count-in). progress is
 * stepProgress() for this instant.
 */
export function snapshot(run, nowMs) {
  const t = elapsedS(run, nowMs);
  const { steps, totalS } = run.plan;
  const phase = phaseOf(run, nowMs);

  let stepIndex = -1;
  for (let i = 0; i < steps.length; i++) if (steps[i].startS <= t) stepIndex = i;
  const step = stepIndex >= 0 ? steps[stepIndex] : null;
  const nextStep = steps[stepIndex + 1] ?? null;
  const nextAtS = nextStep ? nextStep.startS : totalS;
  const nextInS = nextAtS - t;
  const atTarget = t >= totalS;

  let countdown = null;
  let fill = 0;
  if (t < 0) {
    countdown = Math.ceil(-t);
    fill = run.countInS > 0 ? 1 - -t / run.countInS : 1;
  } else if (nextStep && nextInS <= run.headsUpS) {
    countdown = Math.max(1, Math.ceil(nextInS));
    fill = 1 - nextInS / run.headsUpS;
  }

  const sinceStepS = step ? t - step.startS : null;
  return {
    phase,
    elapsedS: t,
    stepIndex,
    step,
    nextStep,
    nextAtS,
    nextInS,
    atTarget,
    overS: Math.max(0, t - totalS),
    countdown,
    fill: Math.min(1, Math.max(0, fill)),
    flash: step != null && sinceStepS < STEP_FLASH_S && !atTarget,
    targetFlash: atTarget && t - totalS < STEP_FLASH_S,
    canFinish: steps.length > 0 && t >= steps[steps.length - 1].startS,
    progress: stepProgress(run.plan, t),
  };
}

/**
 * The sound cues for a plan, sorted by time on the brew clock.
 * Count-in: ticks in its last 3 seconds, and the pour chime at 0:00.
 * Each pour after the bloom: a heads-up tone, ticks at T-3, T-2, T-1, and the pour chime at T. With a 3 s
 * heads-up the tone replaces the T-3 tick.
 * A finish cue (a double chime) at the target finish time.
 */
export function cueSchedule(plan, { countInS, headsUpS }) {
  const cues = [];
  for (const offset of TICK_OFFSETS_S) {
    if (offset <= countInS) cues.push({ atS: -offset, kind: CUE.TICK, stepIndex: 0 });
  }
  cues.push({ atS: 0, kind: CUE.POUR, stepIndex: 0 });

  plan.steps.forEach((step, i) => {
    if (i === 0) return;
    const previousS = plan.steps[i - 1].startS;
    const add = (atS, kind) => {
      if (atS > previousS) cues.push({ atS, kind, stepIndex: i });
    };
    add(step.startS - headsUpS, CUE.HEADS_UP);
    for (const offset of TICK_OFFSETS_S) {
      if (offset < headsUpS) add(step.startS - offset, CUE.TICK);
    }
    cues.push({ atS: step.startS, kind: CUE.POUR, stepIndex: i });
  });

  cues.push({ atS: plan.totalS, kind: CUE.FINISH, stepIndex: null });
  return cues.sort((a, b) => a.atS - b.atS);
}

/** Cues still to come. Missed cues are never replayed. */
export function pendingCues(cues, nowElapsedS) {
  return cues.filter((cue) => cue.atS >= nowElapsedS - CUE_TOLERANCE_S);
}

/** True when a run left on the phone is too old to resume: it should be dropped, not shown. */
export function isExpired(run, nowMs) {
  if (run.doneAtMs != null) return nowMs - run.doneAtMs > PAUSE_EXPIRES_S * 1000;
  if (run.pausedAtMs != null) return nowMs - run.pausedAtMs > PAUSE_EXPIRES_S * 1000;
  return elapsedS(run, nowMs) > run.plan.totalS + AUTO_END_AFTER_S;
}

/** True when a running brew has gone so far past its target that it should end itself. */
export function shouldAutoEnd(run, nowMs) {
  return run.doneAtMs == null && run.pausedAtMs == null && elapsedS(run, nowMs) > run.plan.totalS + AUTO_END_AFTER_S;
}
