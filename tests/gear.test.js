import test from 'node:test';
import assert from 'node:assert/strict';

import { BREWERS, brewerById } from '../next/app/data/catalog/brewers.js';
import { GRINDERS, grinderById } from '../next/app/data/catalog/grinders.js';
import { REQUIRED_HELP_IDS, SCALES } from '../next/app/data/catalog/scales.js';
import {
  activeItem,
  addCustomGrinder,
  addFromCatalog,
  canRemove,
  catalogChoices,
  checkCustomGrinder,
  gearOf,
  profileOf,
  removeGear,
  repairHousehold,
  seedHousehold,
  setActive,
  setNote,
  setOffset,
} from '../next/app/data/household.js';
import { addBrew, brewRecord, loadAll, NAMES, removeBrew, repairSettings, saveRun } from '../next/app/data/local.js';
import { HOUSE_RECIPE } from '../next/app/engine/constants.js';
import { grindSetting } from '../next/app/engine/grind.js';
import { createRun, finishRun } from '../next/app/engine/timeline.js';
import { translate } from '../next/app/engine/translate.js';
import { channelFromPath } from '../next/app/platform/channel.js';
import { createStore, memoryBackend, storageKey } from '../next/app/platform/storage.js';

// ---- catalog ----

test('brewer profiles match the table in the brief', () => {
  const table = {
    wave185: ['flat', [20, 40], [16, 45], 120, 3, 0.6, false],
    wave155: ['flat', [12, 22], [10, 25], 70, 3, 0.6, false],
    v60_02: ['cone', [12, 30], [10, 36], 150, 2, 0.45, true],
    chemex6: ['chemex', [25, 45], [20, 50], 200, 2, 0.5, true],
  };
  assert.deepEqual(BREWERS.map((b) => b.id), Object.keys(table));
  for (const [id, [family, comfortable, hard, pulse, minPulses, last, provisional]] of Object.entries(table)) {
    const b = brewerById(id);
    assert.equal(b.family, family, id);
    assert.deepEqual(b.comfortableG, comfortable, id);
    assert.deepEqual(b.hardG, hard, id);
    assert.equal(b.pulseG, pulse, id);
    assert.equal(b.minPulses, minPulses, id);
    assert.equal(b.lastPourFraction, last, id);
    assert.equal(b.provisional, provisional, `${id}: only the two Waves are ours`);
  }
});

test('every brewer has three or four tips, and the untested ones are marked as drafts', () => {
  for (const b of BREWERS) {
    assert.ok(b.tips.length >= 3 && b.tips.length <= 4, b.id);
    assert.equal(b.tipsStatus, b.provisional ? 'draft' : 'owner', b.id);
    assert.ok(b.defaultDoseG >= b.comfortableG[0] && b.defaultDoseG <= b.comfortableG[1], `${b.id} default dose is comfortable`);
  }
});

test('the seeded grinder is the original Virtuoso: 40 settings, step 1, higher is coarser, V60 at 15', () => {
  const v = grinderById('baratza_virtuoso');
  assert.equal(v.min, 1);
  assert.equal(v.max, 40);
  assert.equal(v.step, 1);
  assert.equal(v.coarser, 'higher');
  assert.equal(v.refSetting, 15);
  assert.equal(v.micronsPerUnit, 25);
  assert.ok(v.tips.length >= 1);
});

test('every grinder says where its numbers came from, and unsourced facts are not marked verified', () => {
  for (const g of GRINDERS) {
    for (const key of ['brand', 'model', 'min', 'max', 'step', 'coarser', 'refSetting', 'micronsPerUnit', 'tips', 'verified']) {
      assert.ok(key in g, `${g.id} is missing ${key}`);
    }
    assert.ok('source_url' in g);
    if (g.verified) assert.match(g.source_url, /^https:\/\//, `${g.id}: verified needs a source`);
    for (const fact of g.facts) {
      if (fact.verified) assert.match(fact.source_url || '', /^https:\/\//, `${g.id} ${fact.field}: verified needs a source`);
    }
  }
  const microns = grinderById('baratza_virtuoso').facts.find((f) => f.field === 'micronsPerUnit');
  assert.equal(microns.verified, false, 'microns per unit is an estimate');
});

test('every scale has the five required help entries, starting with ounces', () => {
  for (const s of SCALES) {
    assert.deepEqual(s.help.slice(0, 5).map((h) => h.id), [...REQUIRED_HELP_IDS], s.id);
    assert.equal(s.help[0].symptom, 'Scale is showing ounces', s.id);
    for (const h of s.help) {
      const stepCount = h.steps.length + (h.generic_steps ? h.generic_steps.length : 0);
      assert.ok(stepCount > 0, `${s.id} ${h.id} has no steps`);
      if (h.verified) {
        assert.match(h.source_url || '', /^https:\/\//, `${s.id} ${h.id}: verified needs a source`);
        assert.ok(h.steps.length > 0, `${s.id} ${h.id}: verified needs sourced steps`);
      } else {
        assert.equal(h.steps.length, 0, `${s.id} ${h.id}: unverified entries carry only generic steps`);
      }
    }
    for (const key of ['brand', 'model', 'units', 'capacityG', 'resolutionG', 'autoOffMin', 'hasTimer', 'verified']) {
      assert.ok(key in s, `${s.id} is missing ${key}`);
    }
  }
});

test('no dashes or emojis in catalog text', () => {
  const text = JSON.stringify([BREWERS, GRINDERS, SCALES]);
  assert.doesNotMatch(text, new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'));
  assert.doesNotMatch(text, /\p{Extended_Pictographic}/u);
});

// ---- household ----

test('our household is pre-seeded: 185 active, 155 owned, Virtuoso active, both scales', () => {
  const h = seedHousehold();
  assert.deepEqual(gearOf(h, 'brewer').map((i) => i.catalog_id), ['wave185', 'wave155']);
  assert.equal(activeItem(h, 'brewer').catalog_id, 'wave185');
  assert.equal(activeItem(h, 'grinder').catalog_id, 'baratza_virtuoso');
  assert.equal(activeItem(h, 'grinder').offset, 0, 'zero offset until the owner calibrates');
  assert.deepEqual(gearOf(h, 'scale').map((i) => i.catalog_id), ['acaia_lunar_2021', 'eureka_precisa']);
  assert.ok(gearOf(h, 'scale').every((i) => i.active === false), 'scales have no active item');
  for (const item of h.gear) {
    assert.deepEqual(Object.keys(item).sort(), ['active', 'catalog_id', 'custom', 'id', 'kind', 'note', 'offset']);
    assert.ok(profileOf(item), `${item.id} resolves to a profile`);
  }
});

test('one tap switches the active brewer and nothing else', () => {
  const h = setActive(seedHousehold(), 'brewer:wave155');
  assert.equal(activeItem(h, 'brewer').catalog_id, 'wave155');
  assert.equal(gearOf(h, 'brewer').filter((i) => i.active).length, 1);
  assert.equal(activeItem(h, 'grinder').catalog_id, 'baratza_virtuoso');
  assert.equal(setActive(h, 'scale:acaia_lunar_2021'), h, 'scales cannot be made active');
  assert.equal(setActive(h, 'nope'), h);
});

test('adding the provisional brewers from the catalog', () => {
  let h = seedHousehold();
  assert.deepEqual(catalogChoices(h, 'brewer').map((b) => b.id), ['v60_02', 'chemex6']);
  h = addFromCatalog(h, 'brewer', 'v60_02');
  assert.equal(gearOf(h, 'brewer').length, 3);
  assert.equal(addFromCatalog(h, 'brewer', 'v60_02'), h, 'no duplicates');
  assert.equal(addFromCatalog(h, 'brewer', 'unknown'), h);
  assert.deepEqual(catalogChoices(h, 'brewer').map((b) => b.id), ['chemex6']);
  assert.equal(profileOf(gearOf(h, 'brewer')[2]).provisional, true);
});

test('removing gear: never the active one, never the last one', () => {
  let h = addFromCatalog(seedHousehold(), 'brewer', 'v60_02');
  assert.equal(canRemove(h, 'brewer:wave185'), false, 'active');
  assert.equal(canRemove(h, 'brewer:v60_02'), true);
  h = removeGear(h, 'brewer:v60_02');
  assert.equal(gearOf(h, 'brewer').length, 2);
  assert.equal(canRemove(h, 'grinder:baratza_virtuoso'), false, 'the only grinder');
  assert.equal(removeGear(h, 'grinder:baratza_virtuoso'), h);
  assert.equal(canRemove(h, 'scale:eureka_precisa'), true);
});

test('custom grinder: the usual setting becomes refSetting and microns per unit gets a default', () => {
  const h = addCustomGrinder(seedHousehold(), { name: ' Hand grinder ', min: 0, max: 30, step: 1, coarser: 'higher', refSetting: 18 });
  const item = gearOf(h, 'grinder')[1];
  const profile = profileOf(item);
  assert.equal(item.id, 'grinder:custom-1');
  assert.equal(profile.model, 'Hand grinder');
  assert.equal(profile.refSetting, 18);
  assert.equal(profile.micronsPerUnit, 1000 / 31);
  assert.equal(profile.verified, false);
  assert.equal(profile.custom, true);
  assert.equal(item.active, false);
  assert.equal(grindSetting(720, profile).setting, 18, 'the anchor grind lands on the usual setting');
  const again = addCustomGrinder(h, { name: 'Second', min: 1, max: 10, step: 0.5, coarser: 'lower', refSetting: 5, micronsPerUnit: 80 });
  assert.equal(gearOf(again, 'grinder')[2].id, 'grinder:custom-2');
  assert.equal(profileOf(gearOf(again, 'grinder')[2]).micronsPerUnit, 80, 'an edited value is kept');
});

test('custom grinder fields are checked', () => {
  const good = { name: 'X', min: 1, max: 40, step: 1, coarser: 'higher', refSetting: 15 };
  assert.deepEqual(checkCustomGrinder(good), []);
  assert.ok(checkCustomGrinder({ ...good, name: '  ' }).length);
  assert.ok(checkCustomGrinder({ ...good, max: 1 }).length);
  assert.ok(checkCustomGrinder({ ...good, step: 0 }).length);
  assert.ok(checkCustomGrinder({ ...good, step: 0.7 }).length, 'range is not a whole number of steps');
  assert.ok(checkCustomGrinder({ ...good, refSetting: 50 }).length);
  assert.ok(checkCustomGrinder({ ...good, coarser: 'sideways' }).length);
  assert.ok(checkCustomGrinder({ ...good, micronsPerUnit: 0 }).length);
  assert.ok(checkCustomGrinder({ ...good, min: NaN }).length);
  assert.throws(() => addCustomGrinder(seedHousehold(), { ...good, name: '' }));
});

test('notes and calibration offsets are stored on the gear record', () => {
  let h = setNote(seedHousehold(), 'scale:acaia_lunar_2021', 'Hold power, then tare until Unit.');
  h = setOffset(h, 'grinder:baratza_virtuoso', 2);
  assert.equal(gearOf(h, 'scale')[0].note, 'Hold power, then tare until Unit.');
  assert.equal(activeItem(h, 'grinder').offset, 2);
  assert.equal(setOffset(h, 'grinder:baratza_virtuoso', NaN).gear.find((i) => i.kind === 'grinder').offset, 0);
});

test('a household loaded from storage is repaired, never trusted', () => {
  assert.deepEqual(repairHousehold(null), seedHousehold());
  assert.deepEqual(repairHousehold({ gear: 'nope' }), seedHousehold());
  const saved = JSON.parse(JSON.stringify(setActive(seedHousehold(), 'brewer:wave155')));
  assert.deepEqual(repairHousehold(saved), saved, 'a good household survives a round trip unchanged');
  const broken = {
    gear: [
      { id: 'brewer:gone', kind: 'brewer', catalog_id: 'gone', active: true },
      { id: 'brewer:wave155', kind: 'brewer', catalog_id: 'wave155', active: false },
      { id: 'scale:acaia_lunar_2021', kind: 'scale', catalog_id: 'acaia_lunar_2021', active: true, note: 7 },
    ],
  };
  const fixed = repairHousehold(broken);
  assert.equal(activeItem(fixed, 'brewer').catalog_id, 'wave155', 'unknown gear dropped, a brewer made active');
  assert.equal(activeItem(fixed, 'grinder').catalog_id, 'baratza_virtuoso', 'a missing grinder comes from the seed');
  assert.equal(gearOf(fixed, 'scale')[0].active, false);
  assert.equal(gearOf(fixed, 'scale')[0].note, '');
});

// ---- storage, channel, and what is kept on the phone ----

test('the channel comes from the URL path', () => {
  assert.equal(channelFromPath('/Kalita-Wave/next/'), 'next');
  assert.equal(channelFromPath('/Kalita-Wave/next/index.html'), 'next');
  assert.equal(channelFromPath('/Kalita-Wave/next/audio-test.html'), 'next');
  assert.equal(channelFromPath('/next/'), 'next');
  assert.equal(channelFromPath('/Kalita-Wave/'), 'live');
  assert.equal(channelFromPath('/Kalita-Wave/index.html'), 'live');
  assert.equal(channelFromPath('/Kalita-Wave/classic.html'), 'live');
  assert.equal(channelFromPath('/nextdoor/'), 'live');
  assert.equal(channelFromPath(''), 'live');
});

test('storage keys are namespaced by channel and schema version', () => {
  assert.equal(storageKey('next', 'settings'), 'kw:next:v1:settings');
  assert.equal(storageKey('live', 'run'), 'kw:live:v1:run');
  assert.throws(() => createStore('beta', memoryBackend()));
});

test('the test copy can never read or overwrite live data', () => {
  const shared = memoryBackend(); // one origin, one localStorage
  const next = createStore('next', shared);
  const live = createStore('live', shared);
  live.set('settings', { unit: 'g' });
  next.set('settings', { unit: 'oz' });
  assert.deepEqual(live.get('settings'), { unit: 'g' });
  assert.deepEqual(next.get('settings'), { unit: 'oz' });
  next.remove('settings');
  assert.deepEqual(live.get('settings'), { unit: 'g' });
  assert.equal(next.get('settings', 'fallback'), 'fallback');
});

test('storage never throws: bad JSON and a failing backend fall back', () => {
  const bad = memoryBackend();
  bad.setItem('kw:next:v1:settings', '{not json');
  assert.equal(createStore('next', bad).get('settings', 'fallback'), 'fallback');
  const failing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('blocked'); } };
  const store = createStore('next', failing);
  assert.equal(store.get('x', 1), 1);
  assert.equal(store.set('x', 2), false);
  assert.equal(store.remove('x'), false);
});

test('settings from storage are checked value by value', () => {
  const defaults = repairSettings(null);
  assert.deepEqual(defaults, { sound: true, headsUpS: 5, countInS: 5, playOnSilent: true, unit: 'g', calibrationAsked: false, doseByBrewer: {} });
  const odd = repairSettings({ sound: 'yes', headsUpS: 4, countInS: 3, unit: 'oz', calibrationAsked: true, doseByBrewer: { wave185: 36, wave155: 500, v60_02: 'x' } });
  assert.equal(odd.sound, true);
  assert.equal(odd.headsUpS, 5);
  assert.equal(odd.countInS, 3);
  assert.equal(odd.unit, 'oz');
  assert.equal(odd.calibrationAsked, true);
  assert.deepEqual(odd.doseByBrewer, { wave185: 36 });
});

test('a finished brew is kept in the Milestone 2 brews shape', () => {
  const plan = { ...translate(HOUSE_RECIPE, brewerById('wave185'), 36) };
  const run = finishRun(createRun(plan, { nowMs: 1_800_000_000_000, countInS: 5, headsUpS: 5 }), 1_800_000_000_000 + 283_000);
  const record = brewRecord(run, { grindSetting: 18 });
  assert.deepEqual(Object.keys(record), [
    'id', 'bean_id', 'member_id', 'brewed_at', 'brewer_id', 'dose_g', 'water_g', 'grind_setting', 'target_s', 'actual_s', 'rating', 'taste', 'note',
  ]);
  assert.equal(record.brewer_id, 'wave185');
  assert.equal(record.dose_g, 36);
  assert.equal(record.water_g, 576);
  assert.equal(record.grind_setting, 18);
  assert.equal(record.target_s, 265);
  assert.equal(record.actual_s, 278);
  assert.match(record.brewed_at, /^\d{4}-\d{2}-\d{2}T/);
  const list = addBrew(addBrew([], record), record);
  assert.equal(list.length, 1, 'saving the same brew twice keeps one record');
  assert.deepEqual(removeBrew(list, record.id), []);
});

test('loading: a run in progress is resumed, a stale one is dropped, gear and settings get defaults', () => {
  const store = createStore('next', memoryBackend());
  const fresh = loadAll(store, 1_800_000_000_000);
  assert.equal(fresh.run, null);
  assert.deepEqual(fresh.household, seedHousehold());
  assert.deepEqual(fresh.house, { grind_offset: 0 });
  assert.deepEqual(fresh.brews, []);

  const plan = translate(HOUSE_RECIPE, brewerById('wave185'), 36);
  const run = createRun(plan, { nowMs: 1_800_000_000_000, countInS: 5, headsUpS: 5 });
  saveRun(store, run);
  assert.deepEqual(loadAll(store, 1_800_000_000_000 + 60_000).run, run, 'one minute later the run is still there');
  assert.equal(loadAll(store, 1_800_000_000_000 + 3_600_000).run, null, 'an hour later it is dropped');
  assert.equal(store.get(NAMES.RUN), null, 'and removed from storage');

  store.set(NAMES.RUN, { v: 1, plan: { steps: [] } });
  assert.equal(loadAll(store, 1_800_000_000_000).run, null, 'a damaged run is dropped');
});
