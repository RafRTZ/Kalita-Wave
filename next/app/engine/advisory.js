// Dose advisory: tells the user when a dose is outside what a brewer handles well. It never blocks a brew.
// Pure functions only. Limits are inclusive: a dose equal to a hard limit is a caution, not a warning.

export const DOSE_STATUS = Object.freeze({ OK: 'ok', CAUTION: 'caution', OUT_OF_RANGE: 'out_of_range' });

function within(range, value) {
  return value >= range[0] && value <= range[1];
}

export function doseStatus(brewer, doseG) {
  if (within(brewer.comfortableG, doseG)) return DOSE_STATUS.OK;
  if (within(brewer.hardG, doseG)) return DOSE_STATUS.CAUTION;
  return DOSE_STATUS.OUT_OF_RANGE;
}

/** Another brewer the household owns that fits this dose: comfortable first, then inside hard limits. */
export function fittingBrewer(otherBrewers, doseG) {
  return (
    otherBrewers.find((b) => within(b.comfortableG, doseG)) ||
    otherBrewers.find((b) => within(b.hardG, doseG)) ||
    null
  );
}

/**
 * Returns { status, side, alternative, message }.
 * side is 'low' or 'high' when the dose is outside the comfortable range, otherwise null.
 * alternative is another owned brewer that fits, named only when the dose is outside the hard limits.
 */
export function doseAdvisory(brewer, doseG, otherBrewers = []) {
  const status = doseStatus(brewer, doseG);
  if (status === DOSE_STATUS.OK) return { status, side: null, alternative: null, message: null };

  const side = doseG < brewer.comfortableG[0] ? 'low' : 'high';
  const [comfyLow, comfyHigh] = brewer.comfortableG;

  if (status === DOSE_STATUS.CAUTION) {
    const where = side === 'low' ? 'below' : 'above';
    return {
      status,
      side,
      alternative: null,
      message: `${doseG} g is ${where} the comfortable range for the ${brewer.name} (${comfyLow} to ${comfyHigh} g), but inside its limits.`,
    };
  }

  const alternative = fittingBrewer(otherBrewers, doseG);
  const limit =
    side === 'low'
      ? `${doseG} g is less than the ${brewer.name} is made for (${brewer.hardG[0]} g at least).`
      : `${doseG} g is more than the ${brewer.name} is made for (${brewer.hardG[1]} g at most).`;
  const fits = alternative ? ` The ${alternative.name} fits ${doseG} g.` : '';
  return { status, side, alternative, message: `${limit}${fits} You can still brew.` };
}
