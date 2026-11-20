// One call that turns "this recipe, this brewer, this dose, this grinder" into everything the brew screen
// shows. Pure functions only.

import { doseAdvisory } from './advisory.js';
import { grindSetting, targetMicrons } from './grind.js';
import { sourceFromCard, translate } from './translate.js';

/**
 * card: a recipe as printed (or the house default).
 * brewer: the active brewer profile. otherBrewers: the household's other brewer profiles.
 * grinder: the active grinder profile, or null.
 * grinderOffset: the grinder's calibration offset. beanOffset: this bag's finer or coarser adjustment.
 */
export function planBrew({ card, brewer, doseG, grinder = null, grinderOffset = 0, beanOffset = 0, otherBrewers = [] }) {
  const { source, rebuilt, reason } = sourceFromCard(card);
  const brew = translate(source, brewer, doseG);
  const microns = targetMicrons(source, brewer.family, doseG);
  const grind = grinder
    ? { microns, ...grindSetting(microns, grinder, { grinderOffset, beanOffset }) }
    : { microns, setting: null, raw: null, low: null, high: null, clamped: false };
  return {
    ...brew,
    sourceName: card.name ?? null,
    sourceRebuilt: rebuilt,
    sourceNote: reason,
    grind,
    advisory: doseAdvisory(brewer, doseG, otherBrewers),
  };
}
