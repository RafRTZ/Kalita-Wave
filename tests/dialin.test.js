// Dial-in after a brew: docs/BUILD_BRIEF.md section 6.3, and the owner's request of 2026-11-21 to be
// asked how the brew drained. More than 25 s over the target is slow and suggests one step coarser, more
// than 25 s under is fast and suggests one step finer. One step per brew, never more.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { grinderById } from '../next/app/data/catalog/grinders.js';
import { addBrew, brewRecord, repairHouse, setBrewDrain } from '../next/app/data/local.js';
import { DIAL_IN_STEPS, DIAL_IN_TOLERANCE_S } from '../next/app/engine/constants.js';
import { DRAIN, drainByClock, grindStepsFor, isDrain, offsetAfterDrain } from '../next/app/engine/dialin.js';
import { grindSetting } from '../next/app/engine/grind.js';
import { createRun, finishRun } from '../next/app/engine/timeline.js';

const VIRTUOSO = grinderById('baratza_virtuoso');
const T1_TARGET_S = 265; // worked example T1: 36 g on the Wave 185 finishes at 4:25
const T1_MICRONS = 793;

test('the constants are the ones in the brief: 25 seconds, one step', () => {
  assert.equal(DIAL_IN_TOLERANCE_S, 25);
  assert.equal(DIAL_IN_STEPS, 1);
});

test('the clock: more than 25 s over is slow, more than 25 s under is fast', () => {
  assert.equal(drainByClock(T1_TARGET_S, 265), DRAIN.OK);
  assert.equal(drainByClock(T1_TARGET_S, 290), DRAIN.OK, 'exactly 25 s over is still on target');
  assert.equal(drainByClock(T1_TARGET_S, 291), DRAIN.SLOW);
  assert.equal(drainByClock(T1_TARGET_S, 310), DRAIN.SLOW);
  assert.equal(drainByClock(T1_TARGET_S, 240), DRAIN.OK, 'exactly 25 s under is still on target');
  assert.equal(drainByClock(T1_TARGET_S, 239), DRAIN.FAST);
  assert.equal(drainByClock(T1_TARGET_S, 25), DRAIN.FAST, 'a Done tapped far too early reads as fast');
});

test('the clock has no opinion when no time was recorded', () => {
  assert.equal(drainByClock(T1_TARGET_S, null), null);
  assert.equal(drainByClock(null, 265), null);
  assert.equal(drainByClock(T1_TARGET_S, undefined), null);
});

test('slow means coarser, fast means finer, about right means no change', () => {
  assert.equal(grindStepsFor(DRAIN.SLOW), 1);
  assert.equal(grindStepsFor(DRAIN.FAST), -1);
  assert.equal(grindStepsFor(DRAIN.OK), 0);
  assert.equal(grindStepsFor(null), 0);
  assert.equal(grindStepsFor('bitter'), 0, 'taste is not part of this rule yet');
});

test('only the three answers count as answers', () => {
  for (const answer of ['fast', 'ok', 'slow']) assert.ok(isDrain(answer));
  for (const other of [null, undefined, '', 'Slow', 'right', 1]) assert.ok(!isDrain(other));
});

test('the Virtuoso moves one number per answer, from the grind the brew was made with', () => {
  const settingAt = (offset) => grindSetting(T1_MICRONS, VIRTUOSO, { beanOffset: offset }).setting;
  assert.equal(settingAt(0), 18, 'T1 with no adjustment');
  assert.equal(settingAt(offsetAfterDrain(0, VIRTUOSO, DRAIN.SLOW)), 19);
  assert.equal(settingAt(offsetAfterDrain(0, VIRTUOSO, DRAIN.FAST)), 17);
  assert.equal(settingAt(offsetAfterDrain(0, VIRTUOSO, DRAIN.OK)), 18);
  assert.equal(settingAt(offsetAfterDrain(2, VIRTUOSO, DRAIN.SLOW)), 21, 'an earlier adjustment is kept and built on');
});

test('changing the answer replaces it and never stacks', () => {
  const from = 0;
  const first = offsetAfterDrain(from, VIRTUOSO, DRAIN.SLOW);
  assert.equal(first, 1);
  // The second answer starts again from the offset the brew was made with, not from the first answer.
  assert.equal(offsetAfterDrain(from, VIRTUOSO, DRAIN.SLOW), 1, 'the same answer twice is still one step');
  assert.equal(offsetAfterDrain(from, VIRTUOSO, DRAIN.FAST), -1, 'slow then fast ends one step finer, not back at zero');
  assert.equal(offsetAfterDrain(from, VIRTUOSO, DRAIN.OK), 0, 'slow then about right puts the grind back');
});

test('a grinder whose lower numbers are coarser moves the other way', () => {
  const reversed = { ...VIRTUOSO, coarser: 'lower' };
  assert.equal(offsetAfterDrain(0, reversed, DRAIN.SLOW), -1, 'coarser is a lower number on this grinder');
  assert.equal(offsetAfterDrain(0, reversed, DRAIN.FAST), 1);
});

test('a grinder with half steps moves half a number', () => {
  const half = { ...VIRTUOSO, step: 0.5 };
  assert.equal(offsetAfterDrain(0, half, DRAIN.SLOW), 0.5);
  assert.equal(offsetAfterDrain(1.5, half, DRAIN.FAST), 1);
});

test('the brew screen shows the grind to read and has no Finer or Coarser (owner, 2026-11-21)', () => {
  // The brief (5.2) put the two buttons beside the grind on the brew screen. The owner moved them: the
  // grind changes after a brew, from the drain question, and by hand only on the grind page.
  const read = (path) => readFileSync(fileURLToPath(new URL(`../next/app/ui/${path}`, import.meta.url)), 'utf8');
  const brewScreen = read('brew.js');
  assert.doesNotMatch(brewScreen, /nudgeGrind|'Finer'|'Coarser'/, 'no grind buttons on the brew screen');
  assert.match(brewScreen, /openSheet\('grind'\)/, 'the grind opens its own page');
  assert.match(brewScreen, /undoGrindChange/, 'the line about a changed grind offers Undo');
  assert.match(read('grind.js'), /nudgeGrind\(-1\)[\s\S]*nudgeGrind\(1\)/, 'Finer and Coarser live on the grind page');
  assert.match(read('timer.js'), /answerDrain/, 'the Done screen asks how it drained');
});

test('the saved house record keeps a change only when it is whole', () => {
  assert.deepEqual(repairHouse(null), { grind_offset: 0, grind_change: null });
  assert.deepEqual(repairHouse({ grind_offset: 2 }), { grind_offset: 2, grind_change: null }, 'a record saved before this version loads cleanly');
  const change = { brew_id: 'run-1', from_offset: 0, drain: 'slow', changed_at: '2026-11-21T15:00:00.000Z' };
  assert.deepEqual(repairHouse({ grind_offset: 1, grind_change: change }), { grind_offset: 1, grind_change: change });
  assert.equal(repairHouse({ grind_offset: 1, grind_change: { ...change, drain: 'ok' } }).grind_change, null, 'about right changes nothing, so it is never a change');
  assert.equal(repairHouse({ grind_offset: 1, grind_change: { ...change, from_offset: 'x' } }).grind_change, null);
  assert.equal(repairHouse({ grind_offset: 1, grind_change: 'slow' }).grind_change, null);
});

test('a saved brew carries the answer once there is one', () => {
  const plan = { steps: [{ startS: 0, targetG: 90, style: 'bloom' }], totalS: T1_TARGET_S, brewerId: 'wave185', doseG: 36, waterG: 576 };
  const run = finishRun(createRun(plan, { nowMs: 1_800_000_000_000, countInS: 5, headsUpS: 5 }), 1_800_000_000_000 + 315_000);
  const record = brewRecord(run, { grindSetting: 18 });
  assert.equal(record.drain, null, 'unanswered until someone taps');
  assert.equal(drainByClock(record.target_s, record.actual_s), DRAIN.SLOW, 'this brew ran 45 s over');

  const brews = setBrewDrain(addBrew([], record), record.id, DRAIN.SLOW);
  assert.equal(brews[0].drain, 'slow');
  assert.equal(setBrewDrain(brews, 'another-brew', DRAIN.FAST)[0].drain, 'slow', 'other brews are left alone');
  assert.equal(setBrewDrain(brews, record.id, 'nonsense')[0].drain, null, 'anything else clears the answer');

  const answered = brewRecord({ ...run, drain: { answer: DRAIN.FAST, fromOffset: 0 } }, { grindSetting: 18 });
  assert.equal(answered.drain, 'fast');
});
