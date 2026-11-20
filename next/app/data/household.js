// The household's gear: which brewers, grinders, and scales it owns, and which brewer and grinder are active.
// Pure functions over a plain object. In Milestone 1 the object is stored on the phone; the records use
// the same field names the Milestone 2 `gear` table will sync (kind, catalog_id or custom, offset, note,
// active).
//
// Scales have no active item: either scale may be under the brewer, so Scale help always shows them all.

import { defaultMicronsPerUnit } from '../engine/grind.js';
import { BREWERS, brewerById } from './catalog/brewers.js';
import { GRINDERS, grinderById } from './catalog/grinders.js';
import { SCALES, scaleById } from './catalog/scales.js';

export const HOUSEHOLD_SCHEMA = 1;
export const KINDS = Object.freeze(['brewer', 'grinder', 'scale']);
const HAS_ACTIVE = Object.freeze(['brewer', 'grinder']);

const CATALOGS = Object.freeze({ brewer: BREWERS, grinder: GRINDERS, scale: SCALES });
const LOOKUP = Object.freeze({ brewer: brewerById, grinder: grinderById, scale: scaleById });

function gearItem(kind, catalogId, active = false) {
  return { id: `${kind}:${catalogId}`, kind, catalog_id: catalogId, custom: null, offset: 0, note: '', active };
}

/** Our household, pre-seeded so nobody sees a setup screen. */
export function seedHousehold() {
  return {
    schema: HOUSEHOLD_SCHEMA,
    gear: [
      gearItem('brewer', 'wave185', true),
      gearItem('brewer', 'wave155'),
      gearItem('grinder', 'baratza_virtuoso', true),
      gearItem('scale', 'acaia_lunar_2021'),
      gearItem('scale', 'eureka_precisa'),
    ],
  };
}

/** The full profile behind a gear record: the catalog entry, or the custom profile stored in the record. */
export function profileOf(item) {
  if (!item) return null;
  if (item.custom) return { ...item.custom, id: item.id, custom: true };
  const lookup = LOOKUP[item.kind];
  return lookup ? lookup(item.catalog_id) : null;
}

export function gearOf(household, kind) {
  return household.gear.filter((item) => item.kind === kind);
}

export function activeItem(household, kind) {
  const items = gearOf(household, kind);
  return items.find((item) => item.active) || items[0] || null;
}

export function findItem(household, itemId) {
  return household.gear.find((item) => item.id === itemId) || null;
}

function replaceGear(household, gear) {
  return { ...household, gear };
}

/** Make one brewer or grinder the active one of its kind. */
export function setActive(household, itemId) {
  const target = findItem(household, itemId);
  if (!target || !HAS_ACTIVE.includes(target.kind)) return household;
  return replaceGear(
    household,
    household.gear.map((item) => (item.kind === target.kind ? { ...item, active: item.id === itemId } : item)),
  );
}

/** Catalog entries of a kind that the household does not own yet. */
export function catalogChoices(household, kind) {
  const owned = new Set(gearOf(household, kind).map((item) => item.catalog_id));
  return (CATALOGS[kind] || []).filter((entry) => !owned.has(entry.id));
}

export function addFromCatalog(household, kind, catalogId) {
  const lookup = LOOKUP[kind];
  if (!lookup || !lookup(catalogId)) return household;
  if (household.gear.some((item) => item.kind === kind && item.catalog_id === catalogId)) return household;
  return replaceGear(household, [...household.gear, gearItem(kind, catalogId)]);
}

function isWholeNumberOfSteps(span, step) {
  const count = span / step;
  return Math.abs(count - Math.round(count)) < 1e-6;
}

/** Problems with a custom grinder as typed. An empty list means it can be saved. */
export function checkCustomGrinder(fields) {
  const problems = [];
  const { name, min, max, step, coarser, refSetting, micronsPerUnit } = fields;
  if (!String(name || '').trim()) problems.push('Give the grinder a name.');
  const numbers = [min, max, step, refSetting].every((n) => typeof n === 'number' && Number.isFinite(n));
  if (!numbers) {
    problems.push('Lowest setting, highest setting, step, and your usual setting must all be numbers.');
    return problems;
  }
  if (!(max > min)) problems.push('The highest setting must be above the lowest.');
  if (!(step > 0)) problems.push('The step must be more than 0.');
  if (max > min && step > 0 && !isWholeNumberOfSteps(max - min, step)) {
    problems.push('The range must be a whole number of steps.');
  }
  if (refSetting < min || refSetting > max) problems.push('Your usual setting must be inside the range.');
  if (coarser !== 'higher' && coarser !== 'lower') problems.push('Say which direction is coarser.');
  if (micronsPerUnit != null && !(typeof micronsPerUnit === 'number' && micronsPerUnit > 0)) {
    problems.push('Microns per setting must be more than 0.');
  }
  return problems;
}

/**
 * Add a custom grinder. fields: { name, min, max, step, coarser, refSetting, micronsPerUnit? }.
 * refSetting is the setting used for a typical single-cup pour-over. Throws when the fields are not valid.
 */
export function addCustomGrinder(household, fields) {
  const problems = checkCustomGrinder(fields);
  if (problems.length) throw new Error(problems.join(' '));
  const taken = new Set(household.gear.map((item) => item.id));
  let n = 1;
  while (taken.has(`grinder:custom-${n}`)) n++;
  const name = String(fields.name).trim();
  const item = {
    id: `grinder:custom-${n}`,
    kind: 'grinder',
    catalog_id: null,
    custom: {
      brand: '',
      model: name,
      shortName: name,
      min: fields.min,
      max: fields.max,
      step: fields.step,
      coarser: fields.coarser,
      refSetting: fields.refSetting,
      micronsPerUnit: fields.micronsPerUnit ?? defaultMicronsPerUnit(fields.min, fields.max, fields.step),
      tips: [],
      source_url: null,
      verified: false,
      facts: [],
    },
    offset: 0,
    note: '',
    active: false,
  };
  return replaceGear(household, [...household.gear, item]);
}

/** Can this record be removed? The active brewer and grinder, and the last one of a kind, cannot. */
export function canRemove(household, itemId) {
  const item = findItem(household, itemId);
  if (!item) return false;
  if (HAS_ACTIVE.includes(item.kind)) {
    if (item.active) return false;
    if (gearOf(household, item.kind).length <= 1) return false;
  }
  return true;
}

export function removeGear(household, itemId) {
  if (!canRemove(household, itemId)) return household;
  return replaceGear(household, household.gear.filter((item) => item.id !== itemId));
}

function patchItem(household, itemId, patch) {
  if (!findItem(household, itemId)) return household;
  return replaceGear(household, household.gear.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
}

export function setNote(household, itemId, note) {
  return patchItem(household, itemId, { note: String(note ?? '').slice(0, 2000) });
}

/** For a grinder, offset is its calibration offset in the grinder's own numbers. */
export function setOffset(household, itemId, offset) {
  return patchItem(household, itemId, { offset: Number.isFinite(offset) ? offset : 0 });
}

/**
 * Repair a household loaded from storage: unknown catalog entries are dropped, and every kind that needs
 * an active item gets exactly one. Anything unreadable falls back to the seed.
 */
export function repairHousehold(saved) {
  if (!saved || typeof saved !== 'object' || !Array.isArray(saved.gear)) return seedHousehold();
  const seen = new Set();
  let gear = saved.gear.filter((item) => {
    if (!item || !KINDS.includes(item.kind) || typeof item.id !== 'string' || seen.has(item.id)) return false;
    if (!profileOf(item)) return false;
    seen.add(item.id);
    return true;
  });
  gear = gear.map((item) => ({
    id: item.id,
    kind: item.kind,
    catalog_id: item.catalog_id ?? null,
    custom: item.custom ?? null,
    offset: Number.isFinite(item.offset) ? item.offset : 0,
    note: typeof item.note === 'string' ? item.note : '',
    active: Boolean(item.active),
  }));
  const seed = seedHousehold();
  for (const kind of HAS_ACTIVE) {
    if (!gear.some((item) => item.kind === kind)) gear = [...gear, ...seed.gear.filter((item) => item.kind === kind)];
    const ofKind = gear.filter((item) => item.kind === kind);
    const active = ofKind.find((item) => item.active) || ofKind[0];
    gear = gear.map((item) => (item.kind === kind ? { ...item, active: item.id === active.id } : item));
  }
  gear = gear.map((item) => (item.kind === 'scale' ? { ...item, active: false } : item));
  return { schema: HOUSEHOLD_SCHEMA, gear };
}
