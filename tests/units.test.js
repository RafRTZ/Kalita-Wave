import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_RECIPE } from '../next/app/engine/constants.js';
import { doseAdvisory, doseStatus } from '../next/app/engine/advisory.js';
import { translate } from '../next/app/engine/translate.js';
import { formatClock, formatDelta, formatDose, formatOunces, formatWeight, gramsToOunces, weightNumber } from '../next/app/engine/units.js';
import { brewerById } from '../next/app/data/catalog/brewers.js';

const W185 = brewerById('wave185');
const W155 = brewerById('wave155');

test('ounces: 1 oz is 28.3495 g, one decimal', () => {
  assert.equal(gramsToOunces(28.3495), 1);
  assert.equal(formatOunces(576), '20.3');
  assert.equal(formatWeight(335, 'oz'), '11.8 oz');
  assert.equal(formatWeight(335, 'g'), '335 g');
  assert.equal(weightNumber(455, 'oz'), '16.0');
  assert.equal(weightNumber(455, 'g'), '455');
});

test('T1 in ounces is 3.2, 7.4, 11.8, 16.0, 20.3', () => {
  const brew = translate(HOUSE_RECIPE, W185, 36);
  assert.deepEqual(brew.steps.map((s) => formatOunces(s.targetG)), ['3.2', '7.4', '11.8', '16.0', '20.3']);
});

test('dose in ounces shows two decimals', () => {
  assert.equal(formatDose(36, 'oz'), '1.27 oz');
  assert.equal(formatDose(36, 'g'), '36 g');
});

test('clock formatting', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(59.9), '0:59');
  assert.equal(formatClock(60), '1:00');
  assert.equal(formatClock(265), '4:25');
  assert.equal(formatClock(600), '10:00');
  assert.equal(formatClock(-0.2), '-0:01');
  assert.equal(formatClock(-5), '-0:05');
  assert.equal(formatDelta(13), '+0:13');
  assert.equal(formatDelta(-8), '-0:08');
  assert.equal(formatDelta(75), '+1:15');
  assert.equal(formatDelta(0.3), 'on target');
});

test('dose status: limits are inclusive', () => {
  assert.equal(doseStatus(W185, 20), 'ok');
  assert.equal(doseStatus(W185, 40), 'ok');
  assert.equal(doseStatus(W185, 41), 'caution');
  assert.equal(doseStatus(W185, 45), 'caution');
  assert.equal(doseStatus(W185, 46), 'out_of_range');
  assert.equal(doseStatus(W185, 19), 'caution');
  assert.equal(doseStatus(W185, 16), 'caution');
  assert.equal(doseStatus(W185, 15), 'out_of_range');
  assert.equal(doseStatus(W155, 22), 'ok');
  assert.equal(doseStatus(W155, 25), 'caution');
  assert.equal(doseStatus(W155, 26), 'out_of_range');
});

test('no advisory inside the comfortable range', () => {
  assert.deepEqual(doseAdvisory(W185, 36, [W155]), { status: 'ok', side: null, alternative: null, message: null });
});

test('a caution is one line and names no other brewer', () => {
  const high = doseAdvisory(W185, 45, [W155]);
  assert.equal(high.status, 'caution');
  assert.equal(high.side, 'high');
  assert.equal(high.alternative, null);
  assert.match(high.message, /45 g is above the comfortable range for the Kalita Wave 185 \(20 to 40 g\)/);
  const low = doseAdvisory(W185, 17, [W155]);
  assert.equal(low.side, 'low');
  assert.match(low.message, /below/);
});

test('outside hard limits: a warning that names the other Wave if it fits, and never blocks', () => {
  const tooBig = doseAdvisory(W155, 36, [W185]);
  assert.equal(tooBig.status, 'out_of_range');
  assert.equal(tooBig.alternative.id, 'wave185');
  assert.match(tooBig.message, /more than the Kalita Wave 155 is made for \(25 g at most\)/);
  assert.match(tooBig.message, /The Kalita Wave 185 fits 36 g\./);
  assert.match(tooBig.message, /You can still brew\./);

  const tooSmall = doseAdvisory(W185, 12, [W155]);
  assert.equal(tooSmall.alternative.id, 'wave155');
  assert.match(tooSmall.message, /less than the Kalita Wave 185 is made for \(16 g at least\)/);

  const nothingFits = doseAdvisory(W185, 60, [W155]);
  assert.equal(nothingFits.status, 'out_of_range');
  assert.equal(nothingFits.alternative, null);
  assert.doesNotMatch(nothingFits.message, /fits/);
});

test('"fits" means inside the other brewer\'s hard limits, comfortable preferred', () => {
  assert.equal(doseAdvisory(W185, 11, [W155]).alternative.id, 'wave155', '11 g is inside the 155 hard limits');
  const v60 = brewerById('v60_02');
  assert.equal(doseAdvisory(W185, 12, [v60, W155]).alternative.id, 'v60_02', 'first comfortable brewer wins');
  assert.equal(doseAdvisory(W185, 11, [v60, W155]).alternative.id, 'v60_02', 'neither is comfortable, first within hard limits wins');
});
