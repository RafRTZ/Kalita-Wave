import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_RECIPE } from '../next/app/engine/constants.js';
import {
  autoEndRun,
  createRun,
  cueSchedule,
  elapsedS,
  finishRun,
  isExpired,
  pauseRun,
  pendingCues,
  phaseOf,
  reopenRun,
  resumeRun,
  shouldAutoEnd,
  snapshot,
} from '../next/app/engine/timeline.js';
import { translate } from '../next/app/engine/translate.js';
import { brewerById } from '../next/app/data/catalog/brewers.js';

// T1: 0:00 90, 0:40 210, 1:20 335, 2:00 455, 2:40 576, done 4:25
const T1 = translate(HOUSE_RECIPE, brewerById('wave185'), 36);
const T0 = 1_800_000_000_000; // an arbitrary wall-clock start, in ms
const at = (seconds) => T0 + seconds * 1000;
const start = (opts = {}) => createRun(T1, { nowMs: T0, countInS: 5, headsUpS: 5, ...opts });

test('the brew clock comes from timestamps: negative in the count-in, 0:00 after it', () => {
  const run = start();
  assert.equal(elapsedS(run, at(0)), -5);
  assert.equal(elapsedS(run, at(5)), 0);
  assert.equal(elapsedS(run, at(45)), 40);
  assert.equal(phaseOf(run, at(2)), 'get_ready');
  assert.equal(phaseOf(run, at(5)), 'running');
});

test('no count-in: the clock starts at 0:00 on the tap', () => {
  const run = start({ countInS: 0 });
  assert.equal(elapsedS(run, at(0)), 0);
  assert.equal(phaseOf(run, at(0)), 'running');
});

test('a reload or an app switch resumes at the right second', () => {
  const saved = JSON.parse(JSON.stringify(start()));
  assert.equal(elapsedS(saved, at(5 + 95)), 95);
  assert.equal(snapshot(saved, at(5 + 95)).stepIndex, 2);
});

test('pause freezes the clock and resume carries on from the same second', () => {
  let run = start();
  run = pauseRun(run, at(35)); // 0:30 on the brew clock
  assert.equal(phaseOf(run, at(60)), 'paused');
  assert.equal(elapsedS(run, at(60)), 30);
  assert.equal(elapsedS(run, at(600)), 30);
  run = resumeRun(run, at(95)); // paused for 60 s
  assert.equal(elapsedS(run, at(95)), 30);
  assert.equal(elapsedS(run, at(105)), 40);
  run = pauseRun(run, at(105));
  run = resumeRun(run, at(115));
  assert.equal(elapsedS(run, at(125)), 50, 'two pauses add up');
});

test('pause and resume are safe to call twice', () => {
  const run = start();
  const paused = pauseRun(run, at(10));
  assert.equal(pauseRun(paused, at(20)), paused);
  assert.equal(resumeRun(run, at(20)), run);
});

test('the current step advances by the clock', () => {
  const run = start();
  assert.equal(snapshot(run, at(2)).stepIndex, -1, 'count-in');
  assert.equal(snapshot(run, at(5)).stepIndex, 0, 'bloom at 0:00');
  assert.equal(snapshot(run, at(5 + 39.9)).stepIndex, 0);
  assert.equal(snapshot(run, at(5 + 40)).stepIndex, 1);
  assert.equal(snapshot(run, at(5 + 160)).stepIndex, 4);
  assert.equal(snapshot(run, at(5 + 300)).stepIndex, 4);
});

test('the next pour and its countdown', () => {
  const run = start();
  const s = snapshot(run, at(5 + 17));
  assert.equal(s.step.targetG, 90);
  assert.equal(s.nextStep.targetG, 210);
  assert.equal(s.nextInS, 23);
  assert.equal(s.countdown, null, 'outside the heads-up window');
  assert.equal(s.canFinish, false);
});

test('after the last pour the countdown is to the target finish time, and Done becomes available', () => {
  const run = start();
  const s = snapshot(run, at(5 + 200));
  assert.equal(s.nextStep, null);
  assert.equal(s.nextAtS, 265);
  assert.equal(s.nextInS, 65);
  assert.equal(s.atTarget, false);
  assert.equal(s.canFinish, true);
  const late = snapshot(run, at(5 + 280));
  assert.equal(late.atTarget, true);
  assert.equal(late.overS, 15);
  assert.equal(late.phase, 'running', 'still running until Done is tapped');
});

test('visual twin of the cues: a countdown number and a fill inside the heads-up window', () => {
  const run = start();
  assert.equal(snapshot(run, at(5 + 34.9)).countdown, null);
  const five = snapshot(run, at(5 + 35));
  assert.equal(five.countdown, 5);
  assert.equal(five.fill, 0);
  const mid = snapshot(run, at(5 + 37.5));
  assert.equal(mid.countdown, 3);
  assert.equal(mid.fill, 0.5);
  assert.equal(snapshot(run, at(5 + 39.5)).countdown, 1);
  const now = snapshot(run, at(5 + 40));
  assert.equal(now.countdown, null);
  assert.equal(now.flash, true, 'the step that just started is flashed');
  assert.equal(snapshot(run, at(5 + 43)).flash, false);
});

test('a 3 s heads-up shortens the visual window too', () => {
  const run = start({ headsUpS: 3 });
  assert.equal(snapshot(run, at(5 + 36)).countdown, null);
  assert.equal(snapshot(run, at(5 + 37)).countdown, 3);
});

test('the count-in counts 5, 4, 3, 2, 1', () => {
  const run = start();
  assert.equal(snapshot(run, at(0)).countdown, 5);
  assert.equal(snapshot(run, at(0.1)).countdown, 5);
  assert.equal(snapshot(run, at(1)).countdown, 4);
  assert.equal(snapshot(run, at(4.2)).countdown, 1);
  assert.equal(snapshot(run, at(5)).countdown, null);
  assert.equal(snapshot(run, at(2.5)).fill, 0.5);
});

test('no cue countdown for the target finish, only a flash', () => {
  const run = start();
  assert.equal(snapshot(run, at(5 + 263)).countdown, null);
  assert.equal(snapshot(run, at(5 + 265.5)).targetFlash, true);
  assert.equal(snapshot(run, at(5 + 268)).targetFlash, false);
});

test('cue schedule for T1 with a 5 s count-in and a 5 s heads-up', () => {
  const cues = cueSchedule(T1, { countInS: 5, headsUpS: 5 });
  const text = cues.map((c) => `${c.atS}:${c.kind}`);
  assert.deepEqual(text.slice(0, 4), ['-3:tick', '-2:tick', '-1:tick', '0:pour']);
  assert.deepEqual(text.slice(4, 9), ['35:headsup', '37:tick', '38:tick', '39:tick', '40:pour']);
  assert.equal(text.at(-1), '265:finish');
  assert.equal(cues.filter((c) => c.kind === 'pour').length, 5, 'one chime per step including the bloom');
  assert.equal(cues.filter((c) => c.kind === 'headsup').length, 4, 'none for the bloom');
  assert.equal(cues.filter((c) => c.kind === 'finish').length, 1);
  assert.deepEqual(cues.map((c) => c.atS), [...cues.map((c) => c.atS)].sort((a, b) => a - b), 'sorted');
});

test('with a 3 s heads-up the tone replaces the T-3 tick', () => {
  const cues = cueSchedule(T1, { countInS: 5, headsUpS: 3 });
  const around = cues.filter((c) => c.atS > 30 && c.atS <= 40).map((c) => `${c.atS}:${c.kind}`);
  assert.deepEqual(around, ['37:headsup', '38:tick', '39:tick', '40:pour']);
});

test('count-in options: 3 s ticks from the tap, 0 s has only the chime', () => {
  const three = cueSchedule(T1, { countInS: 3, headsUpS: 5 }).filter((c) => c.atS <= 0).map((c) => `${c.atS}:${c.kind}`);
  assert.deepEqual(three, ['-3:tick', '-2:tick', '-1:tick', '0:pour']);
  const none = cueSchedule(T1, { countInS: 0, headsUpS: 5 }).filter((c) => c.atS <= 0).map((c) => `${c.atS}:${c.kind}`);
  assert.deepEqual(none, ['0:pour']);
});

test('missed cues are not replayed', () => {
  const cues = cueSchedule(T1, { countInS: 5, headsUpS: 5 });
  assert.equal(pendingCues(cues, -5).length, cues.length, 'at the Start tap every cue is still to come');
  const afterSwitch = pendingCues(cues, 95); // back from another app at 1:35
  assert.ok(afterSwitch.every((c) => c.atS >= 95));
  assert.equal(afterSwitch[0].atS, 115);
  assert.equal(afterSwitch[0].kind, 'headsup');
  assert.deepEqual(pendingCues(cues, 300), []);
  assert.equal(pendingCues(cues, 40)[0].atS, 40, 'a cue due this instant still plays');
});

test('Done records the actual total time in whole seconds', () => {
  const run = finishRun(start(), at(5 + 278.4));
  assert.equal(phaseOf(run, at(999)), 'done');
  assert.equal(run.actualS, 278);
  assert.equal(elapsedS(run, at(999)), 278.4, 'the clock is frozen after Done');
  assert.equal(finishRun(run, at(2000)), run, 'tapping Done twice changes nothing');
});

test('Done while paused records the paused time', () => {
  let run = pauseRun(start(), at(5 + 270));
  run = finishRun(run, at(5 + 400));
  assert.equal(run.actualS, 270);
  assert.equal(run.pausedAtMs, null);
});

test('undoing Done carries the clock on as if it had not been tapped', () => {
  const done = finishRun(start(), at(5 + 200));
  const back = reopenRun(done);
  assert.equal(back.actualS, null);
  assert.equal(phaseOf(back, at(5 + 230)), 'running');
  assert.equal(elapsedS(back, at(5 + 230)), 230);
});

test('a run nobody marks Done ends itself 10 minutes after the target, with no time recorded', () => {
  const run = start();
  assert.equal(shouldAutoEnd(run, at(5 + 265 + 599)), false);
  assert.equal(shouldAutoEnd(run, at(5 + 265 + 601)), true);
  assert.equal(shouldAutoEnd(pauseRun(run, at(100)), at(99999)), false, 'a paused run does not auto-end');
  const ended = autoEndRun(run, at(5 + 265 + 601));
  assert.equal(ended.actualS, null);
  assert.equal(ended.autoEnded, true);
  assert.equal(phaseOf(ended, at(99999)), 'done');
});

test('stale runs are dropped when the app is opened later', () => {
  const run = start();
  assert.equal(isExpired(run, at(100)), false);
  assert.equal(isExpired(run, at(5 + 265 + 601)), true);
  const paused = pauseRun(run, at(100));
  assert.equal(isExpired(paused, at(100 + 1799)), false);
  assert.equal(isExpired(paused, at(100 + 1801)), true);
  const done = finishRun(run, at(300));
  assert.equal(isExpired(done, at(400)), false);
  assert.equal(isExpired(done, at(300 + 1801)), true);
});
