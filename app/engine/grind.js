// Grind: microns first, then the grinder's own numbers. Pure functions only.
// Rules are in docs/BUILD_BRIEF.md sections 5.1 and 5.2.

import {
  ANCHOR_DOSE_G,
  ANCHOR_MICRONS,
  CUSTOM_GRINDER_SPAN_MICRONS,
  DOSE_GRIND_SLOPE,
  FAMILY_GRIND_OFFSET,
} from './constants.js';

export function familyOffset(family) {
  return FAMILY_GRIND_OFFSET[family] ?? 0;
}

/** The grind the card intends, in microns: printed if present, otherwise worked out from its family and dose. */
export function cardMicrons(source) {
  if (source.grindMicrons != null) return source.grindMicrons;
  return ANCHOR_MICRONS + familyOffset(source.family) + (source.doseG - ANCHOR_DOSE_G) * DOSE_GRIND_SLOPE;
}

/** The grind for our brewer family and our dose, in microns. */
export function targetMicrons(source, brewerFamily, doseG) {
  return (
    cardMicrons(source) -
    familyOffset(source.family) +
    familyOffset(brewerFamily) +
    (doseG - source.doseG) * DOSE_GRIND_SLOPE
  );
}

/** +1 when a higher number is coarser on this grinder, -1 when a lower number is coarser. */
export function coarserSign(grinder) {
  return grinder.coarser === 'lower' ? -1 : 1;
}

function decimalsOf(step) {
  const text = String(step);
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0;
}

function tidy(value, grinder) {
  return Number(value.toFixed(decimalsOf(grinder.step) + 2));
}

/** The nearest setting the grinder can actually be set to, before clamping to its range. */
export function snapToStep(grinder, value) {
  return tidy(grinder.min + Math.round((value - grinder.min) / grinder.step) * grinder.step, grinder);
}

export function clampToRange(grinder, value) {
  return Math.min(grinder.max, Math.max(grinder.min, value));
}

/**
 * A grind in microns as a setting on a grinder.
 * setting = refSetting + direction x (microns - anchor) / micronsPerUnit + grinderOffset + beanOffset,
 * rounded to the grinder's step and clamped to its range. Offsets are in the grinder's own numbers.
 * Returns the setting, the unrounded value, and the "normal" band of one step either side.
 */
export function grindSetting(microns, grinder, { grinderOffset = 0, beanOffset = 0 } = {}) {
  const raw =
    grinder.refSetting +
    (coarserSign(grinder) * (microns - ANCHOR_MICRONS)) / grinder.micronsPerUnit +
    grinderOffset +
    beanOffset;
  const snapped = snapToStep(grinder, raw);
  const setting = clampToRange(grinder, snapped);
  return {
    setting,
    raw,
    low: clampToRange(grinder, tidy(setting - grinder.step, grinder)),
    high: clampToRange(grinder, tidy(setting + grinder.step, grinder)),
    clamped: snapped !== setting,
  };
}

/**
 * One-time calibration. Given the setting the owner actually uses for a brew, return the grinder offset
 * (in whole steps) that makes the app agree with them for that brew.
 */
export function solveGrinderOffset(actualSetting, microns, grinder) {
  const appSetting = grindSetting(microns, grinder).setting;
  const steps = Math.round((actualSetting - appSetting) / grinder.step);
  return tidy(steps * grinder.step, grinder);
}

/** Bean or house offset after one tap of "coarser" (+1) or "finer" (-1). */
export function nudgeOffset(currentOffset, grinder, coarserOrFiner) {
  return tidy(currentOffset + coarserSign(grinder) * coarserOrFiner * grinder.step, grinder);
}

/** How many steps coarser (+) or finer (-) an offset is. */
export function offsetInSteps(offset, grinder) {
  return Math.round((coarserSign(grinder) * offset) / grinder.step);
}

export function settingCount(grinder) {
  return Math.round((grinder.max - grinder.min) / grinder.step) + 1;
}

/** Default microns per unit for a custom grinder: its whole range spans about 1000 microns. */
export function defaultMicronsPerUnit(min, max, step) {
  return CUSTOM_GRINDER_SPAN_MICRONS / (max - min + step);
}

/**
 * A setting written the way the grinder shows it. A profile may say how many decimals its dial shows
 * (displayDecimals); otherwise the step decides: a step of 1 shows "18", a step of 0.5 shows "4.5".
 */
export function formatSetting(grinder, value) {
  return value.toFixed(grinder.displayDecimals ?? decimalsOf(grinder.step));
}
