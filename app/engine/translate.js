// Recipe translation: a source recipe ("as printed") becomes a brew for our brewer and our dose.
// Pure functions only. Rules R0, R1, R2 are in docs/BUILD_BRIEF.md section 5.1.

import {
  ANCHOR_DOSE_G,
  BASELINE_TOTAL_S,
  BLOOM_RATIO_MAX,
  BLOOM_RATIO_MIN,
  CARD_RATIO_MAX,
  CARD_RATIO_MIN,
  CARD_TEMP_MAX_F,
  CARD_TEMP_MIN_F,
  DEFAULT_TEMP_F,
  DEVICE_FAMILY_WORDS,
  FIRST_POUR_MAX_S,
  FIRST_POUR_MIN_S,
  HOUSE_RECIPE,
  MAX_PULSES,
  MIN_POUR_GAP_S,
  OTHER_RATIO_MAX,
  OTHER_RATIO_MIN,
  ROUND_TO,
  TIME_EXPONENT,
} from './constants.js';

const EPSILON = 1e-9; // keeps a value that is mathematically x.5 from landing just under it

/** Round to the nearest 5, halves up. */
export function r5(x) {
  return Math.floor((x + EPSILON) / ROUND_TO + 0.5) * ROUND_TO;
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/** Brewer family for a device name as printed on a card, or null when it cannot be told. */
export function familyForDevice(deviceText) {
  const text = String(deviceText || '').toLowerCase();
  for (const [family, words] of DEVICE_FAMILY_WORDS) {
    if (words.some((word) => text.includes(word))) return family;
  }
  return null;
}

/** The card's own total time, or the baseline for its dose when no drain time is printed. */
export function cardTotalS(source) {
  if (source.totalS != null) return source.totalS;
  return r5(BASELINE_TOTAL_S * Math.pow(source.doseG / ANCHOR_DOSE_G, TIME_EXPONENT));
}

/**
 * Turn a card into the source recipe that translate() uses.
 * A card for a device in the "other" family (AeroPress, Clever, French press and so on) has timing and
 * grind that do not carry over to pour-over, so its source is the house default with the water and step
 * targets scaled to the card's ratio (clamped) and with the card's temperature.
 */
export function sourceFromCard(card) {
  if (card.family !== 'other') return { source: card, rebuilt: false, reason: null };
  const houseRatio = HOUSE_RECIPE.waterG / HOUSE_RECIPE.doseG;
  const ratio = clamp(card.waterG / card.doseG, OTHER_RATIO_MIN, OTHER_RATIO_MAX);
  const waterG = Math.round(HOUSE_RECIPE.doseG * ratio);
  const last = HOUSE_RECIPE.steps.length - 1;
  const steps = HOUSE_RECIPE.steps.map((step, i) => ({
    ...step,
    targetG: i === last ? waterG : r5((step.targetG * ratio) / houseRatio),
  }));
  const source = {
    ...HOUSE_RECIPE,
    id: card.id ?? HOUSE_RECIPE.id,
    name: card.name ?? HOUSE_RECIPE.name,
    waterG,
    tempF: card.tempF ?? DEFAULT_TEMP_F,
    steps,
  };
  const device = card.device ? `a ${card.device}` : 'a brewer that is not a pour-over';
  return {
    source,
    rebuilt: true,
    ratio,
    reason:
      `This card is written for ${device}. Its timing and grind do not carry over to pour-over, ` +
      "so this uses the house recipe at the card's ratio and temperature.",
  };
}

/** Problems with a recipe as printed. An empty list means it is usable. */
export function checkSource(source) {
  const problems = [];
  const steps = source.steps || [];
  if (!(source.doseG > 0)) problems.push('Dose must be more than 0 g.');
  if (!(source.waterG > 0)) problems.push('Water must be more than 0 g.');
  if (steps.length < 2) problems.push('A recipe needs a bloom and at least one pour.');
  if (steps.length && steps[0].startS !== 0) problems.push('The bloom must start at 0:00.');
  for (let i = 1; i < steps.length; i++) {
    if (!(steps[i].targetG > steps[i - 1].targetG)) problems.push(`Step ${i + 1}: the target must be higher than the step before.`);
    if (!(steps[i].startS > steps[i - 1].startS)) problems.push(`Step ${i + 1}: the time must be later than the step before.`);
  }
  if (steps.length && steps[steps.length - 1].targetG !== source.waterG) problems.push('The last target must equal the total water.');
  if (source.doseG > 0 && source.waterG > 0) {
    const ratio = source.waterG / source.doseG;
    if (ratio < CARD_RATIO_MIN || ratio > CARD_RATIO_MAX) problems.push(`The ratio must be between ${CARD_RATIO_MIN} and ${CARD_RATIO_MAX}.`);
  }
  if (source.tempF != null && (source.tempF < CARD_TEMP_MIN_F || source.tempF > CARD_TEMP_MAX_F)) {
    problems.push(`Temperature must be between ${CARD_TEMP_MIN_F} and ${CARD_TEMP_MAX_F} F.`);
  }
  if (source.totalS != null && steps.length && !(source.totalS > steps[steps.length - 1].startS)) {
    problems.push('The drain time must be later than the last pour.');
  }
  return problems;
}

function sameFamilySteps(source, doseG, waterG, totalS, cardTotal) {
  const last = source.steps.length - 1;
  return source.steps.map((step, i) => ({
    startS: i === 0 ? 0 : r5((step.startS * totalS) / cardTotal),
    targetG: i === last ? waterG : r5((doseG * step.targetG) / source.doseG),
    style: step.style,
  }));
}

function otherFamilySteps(source, brewer, doseG, waterG, totalS, cardTotal) {
  const bloomRatio = clamp(source.steps[0].targetG / source.doseG, BLOOM_RATIO_MIN, BLOOM_RATIO_MAX);
  const bloomG = r5(doseG * bloomRatio);
  const pulses = clamp(Math.round((waterG - bloomG) / brewer.pulseG), brewer.minPulses, MAX_PULSES);
  const cardBloomEndS = source.steps.length > 1 ? source.steps[1].startS : FIRST_POUR_MIN_S;
  const firstS = clamp(r5((cardBloomEndS * totalS) / cardTotal), FIRST_POUR_MIN_S, FIRST_POUR_MAX_S);
  const lastS = Math.max(r5(totalS * brewer.lastPourFraction), firstS + MIN_POUR_GAP_S * (pulses - 1));
  const steps = [{ startS: 0, targetG: bloomG, style: 'bloom' }];
  for (let i = 1; i <= pulses; i++) {
    const startS = pulses === 1 ? firstS : r5(firstS + ((lastS - firstS) * (i - 1)) / (pulses - 1));
    const targetG = i === pulses ? waterG : r5(bloomG + ((waterG - bloomG) * i) / pulses);
    steps.push({ startS, targetG, style: i === 1 ? 'center' : 'spiral' });
  }
  return steps;
}

/**
 * Translate a source recipe to a brewer and a dose.
 * source: { family, doseG, waterG, tempF, grindMicrons, totalS, steps: [{ startS, targetG, style }] }
 * brewer: a brewer profile from the catalog.
 * Returns { rule, brewerId, family, doseG, waterG, tempF, totalS, steps }.
 */
export function translate(source, brewer, doseG) {
  const cardTotal = cardTotalS(source);
  const sameFamily = source.family === brewer.family;
  const base = {
    brewerId: brewer.id,
    family: brewer.family,
    sourceId: source.id ?? null,
    doseG,
    tempF: source.tempF ?? DEFAULT_TEMP_F,
  };

  // R0 Identity: same family and same dose returns the card unchanged.
  if (sameFamily && doseG === source.doseG) {
    return {
      ...base,
      rule: 'R0',
      waterG: source.waterG,
      totalS: cardTotal,
      steps: source.steps.map((step) => ({ startS: step.startS, targetG: step.targetG, style: step.style })),
    };
  }

  const waterG = Math.round((doseG * source.waterG) / source.doseG);
  const totalS = r5(cardTotal * Math.pow(doseG / source.doseG, TIME_EXPONENT));

  // R1 Same family, different dose: keep the roaster's pours.
  if (sameFamily) {
    return { ...base, rule: 'R1', waterG, totalS, steps: sameFamilySteps(source, doseG, waterG, totalS, cardTotal) };
  }

  // R2 Different family: keep the roaster's ratio, bloom proportion, temperature and grind intent,
  // and use our brewer's cadence.
  return { ...base, rule: 'R2', waterG, totalS, steps: otherFamilySteps(source, brewer, doseG, waterG, totalS, cardTotal) };
}

/** Problems with a translated brew. An empty list means the pours are in order. */
export function checkBrew(brew) {
  const problems = [];
  const { steps, waterG, totalS } = brew;
  if (!steps.length || steps[0].startS !== 0) problems.push('The bloom does not start at 0:00.');
  for (let i = 1; i < steps.length; i++) {
    if (!(steps[i].targetG > steps[i - 1].targetG)) problems.push(`Pour ${i} does not add water.`);
    if (!(steps[i].startS > steps[i - 1].startS)) problems.push(`Pour ${i} does not start after the one before.`);
  }
  if (steps.length && steps[steps.length - 1].targetG !== waterG) problems.push('The last target is not the total water.');
  if (steps.length && !(steps[steps.length - 1].startS < totalS)) problems.push('The last pour starts at or after the finish time.');
  return problems;
}
