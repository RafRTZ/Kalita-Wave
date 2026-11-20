// The worked examples in docs/BUILD_BRIEF.md section 5.1 are normative.
// If one of these fails, the code is wrong or the brief is ambiguous: stop and tell the owner which.

import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_RECIPE } from '../next/app/engine/constants.js';
import { planBrew } from '../next/app/engine/plan.js';
import { checkBrew, checkSource, familyForDevice, r5, sourceFromCard, translate } from '../next/app/engine/translate.js';
import { formatClock } from '../next/app/engine/units.js';
import { brewerById, BREWERS } from '../next/app/data/catalog/brewers.js';
import { grinderById } from '../next/app/data/catalog/grinders.js';

// Source A is the house default. Source B is a flat-bottom card with no microns printed.
const A = HOUSE_RECIPE;
const B = {
  id: 'card-b',
  name: 'Flat card',
  family: 'flat',
  doseG: 30,
  waterG: 500,
  tempF: 199,
  grindMicrons: null,
  totalS: 225,
  steps: [
    { startS: 0, targetG: 100, style: 'bloom' },
    { startS: 30, targetG: 300, style: 'center' },
    { startS: 90, targetG: 500, style: 'spiral' },
  ],
};
const VIRTUOSO = grinderById('baratza_virtuoso');

function plan(card, brewerId, doseG, grinderOffset = 0) {
  return planBrew({ card, brewer: brewerById(brewerId), doseG, grinder: VIRTUOSO, grinderOffset });
}
const stepsText = (brew) => brew.steps.map((s) => `${formatClock(s.startS)} ${s.targetG}`).join(', ');

const EXAMPLES = [
  ['T1', A, 'wave185', 36, 0, 576, 18, '4:25', '0:00 90, 0:40 210, 1:20 335, 2:00 455, 2:40 576'],
  ['T2', A, 'wave185', 20, 0, 320, 16, '3:30', '0:00 50, 0:30 140, 1:20 230, 2:05 320'],
  ['T3', A, 'wave185', 30, 0, 480, 17, '4:05', '0:00 75, 0:35 210, 1:30 345, 2:25 480'],
  ['T4', A, 'wave155', 15, 0, 240, 15, '3:05', '0:00 40, 0:30 105, 1:10 175, 1:50 240'],
  ['T5', A, 'v60_02', 20, 0, 320, 15, '3:30', '0:00 50, 0:30 140, 0:55 230, 1:30 320'],
  ['T6', A, 'v60_02', 30, 0, 480, 16, '4:05', '0:00 75, 0:35 210, 1:05 345, 1:45 480'],
  ['T7', B, 'wave185', 36, 0, 600, 18, '4:00', '0:00 120, 0:30 360, 1:35 600'],
  ['T8', B, 'wave185', 30, 0, 500, 17, '3:45', '0:00 100, 0:30 300, 1:30 500'],
  ['T9', A, 'wave185', 45, 0, 720, 19, '4:50', '0:00 115, 0:40 235, 1:15 355, 1:50 480, 2:20 600, 2:55 720'],
  ['T10', A, 'chemex6', 40, 0, 640, 20, '4:35', '0:00 100, 0:40 280, 1:30 460, 2:20 640'],
  ['T11', A, 'wave185', 36, 2, 576, 20, '4:25', '0:00 90, 0:40 210, 1:20 335, 2:00 455, 2:40 576'],
];

for (const [id, card, brewerId, doseG, offset, water, grind, done, steps] of EXAMPLES) {
  test(`${id}: ${card === A ? 'A' : 'B'} to ${brewerId} at ${doseG} g`, () => {
    const brew = plan(card, brewerId, doseG, offset);
    assert.equal(brew.waterG, water, 'water');
    assert.equal(brew.grind.setting, grind, 'grind setting');
    assert.equal(formatClock(brew.totalS), done, 'done time');
    assert.equal(stepsText(brew), steps, 'steps');
    assert.deepEqual(checkBrew(brew), []);
  });
}

test('T12: A to wave155 at 36 g is out of range with 6 pulses', () => {
  const brew = plan(A, 'wave155', 36);
  assert.equal(brew.waterG, 576);
  assert.equal(brew.grind.setting, 18);
  assert.equal(formatClock(brew.totalS), '4:25');
  assert.equal(brew.advisory.status, 'out_of_range');
  assert.equal(brew.steps.length - 1, 6, 'pulses after the bloom');
  assert.deepEqual(checkBrew(brew), []);
});

test('T9 is a caution, and the examples inside the comfortable range carry no advisory', () => {
  assert.equal(plan(A, 'wave185', 45).advisory.status, 'caution');
  for (const [id, card, brewerId, doseG] of EXAMPLES) {
    if (id === 'T9') continue;
    assert.equal(plan(card, brewerId, doseG).advisory.status, 'ok', id);
  }
});

test('which rule each example uses', () => {
  assert.equal(plan(A, 'wave185', 36).rule, 'R2');
  assert.equal(plan(A, 'v60_02', 20).rule, 'R0');
  assert.equal(plan(A, 'v60_02', 30).rule, 'R1');
  assert.equal(plan(B, 'wave185', 30).rule, 'R0');
  assert.equal(plan(B, 'wave185', 36).rule, 'R1');
  assert.equal(plan(A, 'chemex6', 40).rule, 'R2');
});

test('identity returns the card unchanged, for both families', () => {
  for (const [card, brewerId] of [[A, 'v60_02'], [B, 'wave185'], [B, 'wave155']]) {
    const brew = translate(card, brewerById(brewerId), card.doseG);
    assert.equal(brew.rule, 'R0');
    assert.equal(brew.waterG, card.waterG);
    assert.equal(brew.totalS, card.totalS);
    assert.equal(brew.tempF, card.tempF);
    assert.deepEqual(brew.steps, card.steps.map((s) => ({ startS: s.startS, targetG: s.targetG, style: s.style })));
  }
});

test('identity keeps a drain time that is not a multiple of 5', () => {
  const card = { ...B, totalS: 223 };
  assert.equal(translate(card, brewerById('wave185'), 30).totalS, 223);
});

test('a card with no drain time uses the baseline: 195 s at 20 g, scaled by dose', () => {
  const noDrain = { ...A, totalS: null };
  assert.equal(translate(noDrain, brewerById('v60_02'), 20).totalS, 195);
  assert.equal(translate({ ...B, totalS: null }, brewerById('wave185'), 30).totalS, r5(195 * Math.pow(1.5, 0.4)));
});

test('temperature passes through, and defaults to 203 F', () => {
  assert.equal(plan(B, 'wave185', 36).tempF, 199);
  assert.equal(plan(A, 'wave185', 36).tempF, 203);
  assert.equal(translate({ ...A, tempF: null }, brewerById('wave185'), 36).tempF, 203);
});

test('R2 styles: bloom, then a center pour, then spirals', () => {
  assert.deepEqual(plan(A, 'wave185', 36).steps.map((s) => s.style), ['bloom', 'center', 'spiral', 'spiral', 'spiral']);
});

test('R2 bloom ratio is clamped to 2 to 3 times the dose', () => {
  const big = { ...A, steps: [{ startS: 0, targetG: 80, style: 'bloom' }, ...A.steps.slice(1)] };
  const small = { ...A, steps: [{ startS: 0, targetG: 30, style: 'bloom' }, ...A.steps.slice(1)] };
  assert.equal(translate(big, brewerById('wave185'), 36).steps[0].targetG, 110); // 3 x 36 = 108, rounded to 5
  assert.equal(translate(small, brewerById('wave185'), 36).steps[0].targetG, 70); // 2 x 36 = 72, rounded to 5
});

test('r5 rounds to the nearest 5, halves up', () => {
  assert.equal(r5(37.5), 40);
  assert.equal(r5(112.5), 115);
  assert.equal(r5(77.5), 80);
  assert.equal(r5(137.5), 140);
  assert.equal(r5(211.5), 210);
  assert.equal(r5(212.4), 210);
  assert.equal(r5(0), 0);
  assert.equal(r5(15 * (7 / 3) * 0.5), 20); // 17.5 reached through a fraction that is not exact in binary
});

test('every reachable brew is in order: house default and card B, every brewer, 5 to 60 g', () => {
  for (const card of [A, B]) {
    for (const brewer of BREWERS) {
      for (let doseG = 5; doseG <= 60; doseG++) {
        const brew = translate(card, brewer, doseG);
        assert.deepEqual(checkBrew(brew), [], `${card.name} to ${brewer.id} at ${doseG} g`);
        assert.equal(brew.steps[0].startS, 0);
        assert.equal(brew.steps.at(-1).targetG, brew.waterG);
        assert.equal(brew.waterG, Math.round((doseG * card.waterG) / card.doseG));
      }
    }
  }
});

test('R2 keeps at least 20 s between pours and never more than 6 pulses', () => {
  for (const brewer of BREWERS) {
    if (brewer.family === A.family) continue;
    for (let doseG = 5; doseG <= 60; doseG++) {
      const { steps } = translate(A, brewer, doseG);
      assert.ok(steps.length - 1 <= 6, `${brewer.id} at ${doseG} g has ${steps.length - 1} pulses`);
      assert.ok(steps.length - 1 >= brewer.minPulses);
      assert.ok(steps[1].startS >= 30 && steps[1].startS <= 50, 'first pour between 0:30 and 0:50');
      for (let i = 2; i < steps.length; i++) {
        assert.ok(steps[i].startS - steps[i - 1].startS >= 20, `${brewer.id} at ${doseG} g: gap under 20 s`);
      }
    }
  }
});

test('the house default is a valid source recipe', () => {
  assert.deepEqual(checkSource(A), []);
  assert.deepEqual(checkSource(B), []);
});

test('checkSource reports the problems the bean form must catch', () => {
  assert.ok(checkSource({ ...A, waterG: 300 }).some((p) => p.includes('last target')));
  assert.ok(checkSource({ ...A, tempF: 150 }).some((p) => p.includes('Temperature')));
  assert.ok(checkSource({ ...A, doseG: 40 }).some((p) => p.includes('ratio')));
  const backwards = { ...A, steps: [A.steps[0], A.steps[2], A.steps[1], A.steps[3]] };
  assert.ok(checkSource(backwards).length >= 2);
});

test('printed device to family', () => {
  for (const name of ['HARIO CONE', 'Hario V60', 'Kono', 'Origami with cone filter']) assert.equal(familyForDevice(name), 'cone', name);
  for (const name of ['Kalita Wave 185', 'Orea', 'April', 'Stagg', 'Origami with Wave filter']) assert.equal(familyForDevice(name), 'flat', name);
  assert.equal(familyForDevice('Chemex'), 'chemex');
  for (const name of ['AeroPress', 'Clever', 'Hario Switch', 'French press', 'Espresso']) assert.equal(familyForDevice(name), 'other', name);
  assert.equal(familyForDevice('Origami'), null, 'Origami alone is ambiguous');
  assert.equal(familyForDevice(''), null);
});

test('a card for an "other" device is rebuilt from the house default at its ratio and temperature', () => {
  const aeropress = { id: 'ap', name: 'AeroPress card', device: 'AeroPress', family: 'other', doseG: 15, waterG: 225, tempF: 185, grindMicrons: 500, totalS: 120, steps: [] };
  const { source, rebuilt, reason } = sourceFromCard(aeropress);
  assert.equal(rebuilt, true);
  assert.match(reason, /AeroPress/);
  assert.equal(source.family, 'cone');
  assert.equal(source.doseG, 20);
  assert.equal(source.waterG, 300, 'ratio 15');
  assert.equal(source.tempF, 185);
  assert.equal(source.grindMicrons, 720, 'grind comes from the house default, not the card');
  assert.equal(source.totalS, 210);
  assert.deepEqual(source.steps.map((s) => s.targetG), [45, 130, 215, 300]);
  assert.deepEqual(checkSource(source), []);
  const brew = planBrew({ card: aeropress, brewer: brewerById('wave185'), doseG: 36, grinder: VIRTUOSO });
  assert.equal(brew.waterG, 540);
  assert.equal(brew.sourceRebuilt, true);
  assert.deepEqual(checkBrew(brew), []);
});

test('the ratio of an "other" card is clamped to 14 to 18', () => {
  const strong = { family: 'other', doseG: 18, waterG: 200, tempF: 200, steps: [] }; // 11.1
  const weak = { family: 'other', doseG: 15, waterG: 300, tempF: 200, steps: [] }; // 20
  assert.equal(sourceFromCard(strong).source.waterG, 280);
  assert.equal(sourceFromCard(weak).source.waterG, 360);
  assert.equal(sourceFromCard(A).rebuilt, false);
  assert.equal(sourceFromCard(A).source, A);
});
