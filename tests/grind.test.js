import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_RECIPE } from '../next/app/engine/constants.js';
import {
  cardMicrons,
  defaultMicronsPerUnit,
  formatSetting,
  grindSetting,
  nudgeOffset,
  offsetInSteps,
  settingCount,
  solveGrinderOffset,
  targetMicrons,
} from '../next/app/engine/grind.js';
import { grinderById } from '../next/app/data/catalog/grinders.js';

const VIRTUOSO = grinderById('baratza_virtuoso');
const FLAT_CARD = { family: 'flat', doseG: 30, grindMicrons: null };

test('card microns: printed value wins, otherwise family and dose', () => {
  assert.equal(cardMicrons(HOUSE_RECIPE), 720);
  assert.equal(cardMicrons(FLAT_CARD), 775); // 720 + 25 + (30 - 20) x 3
  assert.equal(cardMicrons({ family: 'chemex', doseG: 20, grindMicrons: null }), 795);
  assert.equal(cardMicrons({ family: 'cone', doseG: 15, grindMicrons: null }), 705);
  assert.equal(cardMicrons({ family: 'flat', doseG: 30, grindMicrons: 800 }), 800);
});

test('target microns move with brewer family and dose', () => {
  assert.equal(targetMicrons(HOUSE_RECIPE, 'flat', 36), 793);
  assert.equal(targetMicrons(HOUSE_RECIPE, 'cone', 20), 720);
  assert.equal(targetMicrons(HOUSE_RECIPE, 'chemex', 40), 855);
  assert.equal(targetMicrons(FLAT_CARD, 'flat', 36), 793);
  assert.equal(targetMicrons(FLAT_CARD, 'cone', 30), 750);
});

test('Virtuoso settings for the worked examples', () => {
  assert.equal(grindSetting(793, VIRTUOSO).setting, 18);
  assert.equal(grindSetting(745, VIRTUOSO).setting, 16);
  assert.equal(grindSetting(720, VIRTUOSO).setting, 15);
  assert.equal(grindSetting(855, VIRTUOSO).setting, 20);
});

test('"17 to 19 is normal": the band is one step either side', () => {
  const g = grindSetting(793, VIRTUOSO);
  assert.equal(g.low, 17);
  assert.equal(g.high, 19);
  assert.equal(g.clamped, false);
});

test('offsets add in grinder numbers, and the result is clamped to the range', () => {
  assert.equal(grindSetting(793, VIRTUOSO, { grinderOffset: 2 }).setting, 20);
  assert.equal(grindSetting(793, VIRTUOSO, { grinderOffset: 2, beanOffset: -1 }).setting, 19);
  const top = grindSetting(793, VIRTUOSO, { grinderOffset: 30 });
  assert.equal(top.setting, 40);
  assert.equal(top.high, 40);
  assert.equal(top.low, 39);
  assert.equal(top.clamped, true);
  const bottom = grindSetting(793, VIRTUOSO, { grinderOffset: -30 });
  assert.equal(bottom.setting, 1);
  assert.equal(bottom.low, 1);
  assert.equal(bottom.clamped, true);
});

test('the grinder own-manual sanity check: pour-over sits at the fine end of the filter range', () => {
  const t1 = grindSetting(793, VIRTUOSO).setting;
  assert.ok(t1 >= 16 && t1 <= 24, `T1 gives ${t1}`);
});

test('calibration: the offset makes the app agree with the owner, in whole steps', () => {
  assert.equal(solveGrinderOffset(20, 793, VIRTUOSO), 2);
  assert.equal(solveGrinderOffset(18, 793, VIRTUOSO), 0);
  assert.equal(solveGrinderOffset(14, 793, VIRTUOSO), -4);
  for (const actual of [12, 16, 18, 21, 25]) {
    const grinderOffset = solveGrinderOffset(actual, 793, VIRTUOSO);
    assert.equal(grindSetting(793, VIRTUOSO, { grinderOffset }).setting, actual);
  }
});

test('finer and coarser taps move one step in the right direction', () => {
  assert.equal(nudgeOffset(0, VIRTUOSO, +1), 1);
  assert.equal(nudgeOffset(0, VIRTUOSO, -1), -1);
  assert.equal(offsetInSteps(2, VIRTUOSO), 2);
  const reversed = { ...VIRTUOSO, coarser: 'lower' };
  assert.equal(nudgeOffset(0, reversed, +1), -1, 'coarser is a lower number on this grinder');
  assert.equal(offsetInSteps(-2, reversed), 2);
});

test('a grinder where lower numbers are coarser', () => {
  const reversed = { id: 'x', min: 0, max: 30, step: 1, coarser: 'lower', refSetting: 20, micronsPerUnit: 25 };
  assert.equal(grindSetting(793, reversed).setting, 17); // 20 - 2.92
  assert.equal(grindSetting(720, reversed).setting, 20);
});

test('a grinder with half steps', () => {
  const half = { id: 'h', min: 0, max: 10, step: 0.5, coarser: 'higher', refSetting: 4, micronsPerUnit: 100 };
  const g = grindSetting(793, half); // 4 + 0.73 = 4.73, nearest half step is 4.5
  assert.equal(g.setting, 4.5);
  assert.equal(g.low, 4);
  assert.equal(g.high, 5);
  assert.equal(formatSetting(half, g.setting), '4.5');
  assert.equal(formatSetting(half, 5), '5.0');
  assert.equal(nudgeOffset(0, half, +1), 0.5);
  assert.equal(solveGrinderOffset(6, 793, half), 1.5);
  assert.equal(settingCount(half), 21);
});

test('custom grinder default: 1000 microns across the whole range', () => {
  assert.equal(defaultMicronsPerUnit(1, 40, 1), 25, 'matches the Virtuoso estimate');
  assert.equal(defaultMicronsPerUnit(0, 10, 0.5), 1000 / 10.5);
  assert.equal(settingCount(VIRTUOSO), 40);
  assert.equal(formatSetting(VIRTUOSO, 18), '18');
});

test('display format: the profile can fix the decimals, otherwise the step decides', () => {
  assert.equal(VIRTUOSO.displayDecimals, 0);
  assert.equal(formatSetting({ step: 1, displayDecimals: 1 }, 18), '18.0');
  assert.equal(formatSetting({ step: 0.25 }, 4.25), '4.25');
});
