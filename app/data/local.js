// Everything the app keeps on the phone, read and written through one module.
// Local-first: the app runs a full brew from this data with no network and no sign-in.
// In Milestone 2 app/data/api.js syncs the same records with the backend.

import {
  COUNT_IN_OPTIONS_S,
  DEFAULT_COUNT_IN_S,
  DEFAULT_HEADS_UP_S,
  DOSE_MAX_G,
  DOSE_MIN_G,
  HEADS_UP_OPTIONS_S,
} from '../engine/constants.js';
import { DRAIN, isDrain } from '../engine/dialin.js';
import { isExpired } from '../engine/timeline.js';
import { repairHousehold, seedHousehold } from './household.js';

export const NAMES = Object.freeze({
  SETTINGS: 'settings',
  HOUSEHOLD: 'household',
  HOUSE: 'house',
  RUN: 'run',
  BREWS: 'brews',
});

const MAX_BREWS = 500;

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true,
  headsUpS: DEFAULT_HEADS_UP_S,
  countInS: DEFAULT_COUNT_IN_S,
  playOnSilent: true,
  unit: 'g',
  calibrationAsked: false,
  doseByBrewer: Object.freeze({}),
});

/** Settings from storage with every value checked; anything missing or odd takes its default. */
export function repairSettings(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const doseByBrewer = {};
  if (s.doseByBrewer && typeof s.doseByBrewer === 'object') {
    for (const [brewerId, dose] of Object.entries(s.doseByBrewer)) {
      if (Number.isInteger(dose) && dose >= DOSE_MIN_G && dose <= DOSE_MAX_G) doseByBrewer[brewerId] = dose;
    }
  }
  return {
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
    headsUpS: HEADS_UP_OPTIONS_S.includes(s.headsUpS) ? s.headsUpS : DEFAULT_SETTINGS.headsUpS,
    countInS: COUNT_IN_OPTIONS_S.includes(s.countInS) ? s.countInS : DEFAULT_SETTINGS.countInS,
    playOnSilent: typeof s.playOnSilent === 'boolean' ? s.playOnSilent : DEFAULT_SETTINGS.playOnSilent,
    unit: s.unit === 'oz' ? 'oz' : 'g',
    calibrationAsked: s.calibrationAsked === true,
    doseByBrewer,
  };
}

/**
 * The per-bag grind adjustment for the house default recipe (stands in for a bean until Milestone 2), and
 * the latest change that a brew's answer to "How did it drain?" made to it. grind_change is kept until
 * the next brew starts, so the brew screen can say what changed, and why, and offer to undo it.
 */
export function repairHouse(saved) {
  const offset = saved && Number.isFinite(saved.grind_offset) ? saved.grind_offset : 0;
  const c = saved && saved.grind_change;
  const good = c && typeof c === 'object' && Number.isFinite(c.from_offset) && (c.drain === DRAIN.FAST || c.drain === DRAIN.SLOW);
  const change = good
    ? {
        brew_id: typeof c.brew_id === 'string' ? c.brew_id : null,
        from_offset: c.from_offset,
        drain: c.drain,
        changed_at: typeof c.changed_at === 'string' ? c.changed_at : null,
      }
    : null;
  return { grind_offset: offset, grind_change: change };
}

/** A finished brew in the shape the Milestone 2 `brews` table will use. */
export function brewRecord(run, { grindSetting = null } = {}) {
  return {
    id: run.id,
    bean_id: run.plan.beanId ?? null,
    member_id: null,
    brewed_at: new Date(run.doneAtMs).toISOString(),
    brewer_id: run.plan.brewerId,
    dose_g: run.plan.doseG,
    water_g: run.plan.waterG,
    grind_setting: grindSetting,
    target_s: run.plan.totalS,
    actual_s: run.actualS,
    // The answer to "How did it drain?": fast, ok, or slow. Null until it is answered. Not in the brief's
    // table: the owner asked for the question on 2026-11-21, so Milestone 2 adds the column.
    drain: run.drain && isDrain(run.drain.answer) ? run.drain.answer : null,
    rating: null,
    taste: null,
    note: null,
  };
}

export function addBrew(brews, record) {
  return [...brews.filter((b) => b.id !== record.id), record].slice(-MAX_BREWS);
}

/** Write the answer to "How did it drain?" onto a saved brew. */
export function setBrewDrain(brews, id, drain) {
  return brews.map((b) => (b.id === id ? { ...b, drain: isDrain(drain) ? drain : null } : b));
}

export function removeBrew(brews, id) {
  return brews.filter((b) => b.id !== id);
}

function looksLikeRun(run) {
  return Boolean(
    run &&
      run.v === 1 &&
      Number.isFinite(run.startedAtMs) &&
      run.plan &&
      Array.isArray(run.plan.steps) &&
      run.plan.steps.length > 0 &&
      Number.isFinite(run.plan.totalS),
  );
}

/** Load everything. A saved run that is too old to resume is dropped. */
export function loadAll(store, nowMs) {
  const settings = repairSettings(store.get(NAMES.SETTINGS));
  const household = repairHousehold(store.get(NAMES.HOUSEHOLD) || seedHousehold());
  const house = repairHouse(store.get(NAMES.HOUSE));
  const savedBrews = store.get(NAMES.BREWS, []);
  const brews = Array.isArray(savedBrews) ? savedBrews : [];
  let run = store.get(NAMES.RUN);
  if (!looksLikeRun(run) || isExpired(run, nowMs)) {
    run = null;
    store.remove(NAMES.RUN);
  }
  return { settings, household, house, brews, run };
}

export function saveSettings(store, settings) {
  return store.set(NAMES.SETTINGS, settings);
}
export function saveHousehold(store, household) {
  return store.set(NAMES.HOUSEHOLD, household);
}
export function saveHouse(store, house) {
  return store.set(NAMES.HOUSE, house);
}
export function saveBrews(store, brews) {
  return store.set(NAMES.BREWS, brews);
}
export function saveRun(store, run) {
  return run ? store.set(NAMES.RUN, run) : store.remove(NAMES.RUN);
}
