// Units and number formatting. Pure functions only.

import { GRAMS_PER_OUNCE } from './constants.js';

export const UNITS = Object.freeze({ GRAMS: 'g', OUNCES: 'oz' });

export function gramsToOunces(grams) {
  return grams / GRAMS_PER_OUNCE;
}

/** Ounces as text with a fixed number of decimals, for example 335 g gives "11.8". */
export function formatOunces(grams, decimals = 1) {
  const scale = Math.pow(10, decimals);
  return (Math.round(gramsToOunces(grams) * scale) / scale).toFixed(decimals);
}

/** A weight as a bare number in the chosen unit: "335" or "11.8". */
export function weightNumber(grams, unit, decimals = 1) {
  return unit === UNITS.OUNCES ? formatOunces(grams, decimals) : String(grams);
}

/** A weight with its unit: "335 g" or "11.8 oz". */
export function formatWeight(grams, unit, decimals = 1) {
  return `${weightNumber(grams, unit, decimals)} ${unit === UNITS.OUNCES ? 'oz' : 'g'}`;
}

/** A dose with its unit. Ounces get two decimals because one decimal is 2.8 g wide. */
export function formatDose(grams, unit) {
  return formatWeight(grams, unit, 2);
}

/** Seconds as m:ss. Whole seconds, rounded down. Negative values count toward zero: -2.4 is "-0:03". */
export function formatClock(seconds) {
  if (seconds < 0) {
    const s = Math.ceil(-seconds);
    return `-${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A difference in seconds as "+0:13", "-0:08", or "on target". */
export function formatDelta(seconds) {
  const s = Math.round(seconds);
  if (s === 0) return 'on target';
  const abs = Math.abs(s);
  return `${s > 0 ? '+' : '-'}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}
