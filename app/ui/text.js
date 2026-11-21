// Words shared by more than one screen.

import { formatSetting } from '../engine/grind.js';

const STYLE_LABELS = Object.freeze({ bloom: 'Bloom', center: 'Center pour', spiral: 'Spiral pour' });

export function stepLabel(step) {
  return STYLE_LABELS[step.style] || 'Pour';
}

export const UNIT_OPTIONS = Object.freeze([
  { value: 'g', label: 'g' },
  { value: 'oz', label: 'oz' },
]);

export function grinderName(grinder) {
  return [grinder.brand, grinder.model].filter(Boolean).join(' ');
}

export function temperature(tempF) {
  return `${tempF}°F`;
}

/** "17 to 19" for the band around a grind setting. */
export function grindBand(grinder, grind) {
  return `${formatSetting(grinder, grind.low)} to ${formatSetting(grinder, grind.high)}`;
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
