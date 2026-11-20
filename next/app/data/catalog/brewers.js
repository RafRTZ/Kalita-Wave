// Brewer catalog. Data, not code. Numbers come from docs/BUILD_BRIEF.md section 5.1.
// comfortableG and hardG are [low, high] dose ranges in grams, both inclusive.
// provisional: true means nobody in this household has brew-tested the profile.
// tipsStatus: 'owner' means the tips came from the owner; 'draft' means they wait for the owner's review.

export const BREWERS = Object.freeze([
  {
    id: 'wave185',
    name: 'Kalita Wave 185',
    shortName: 'Wave 185',
    family: 'flat',
    comfortableG: [20, 40],
    hardG: [16, 45],
    pulseG: 120,
    minPulses: 3,
    lastPourFraction: 0.6,
    defaultDoseG: 36, // the owner's usual brew for two
    provisional: false,
    tipsStatus: 'owner',
    tips: [
      'Rinse the filter without flattening its ridges.',
      'Pour in small circles over the middle of the bed, not onto the filter wall.',
      'Start each pour on the cue rather than waiting for the bed to run dry.',
      'Finish with a flat bed.',
    ],
  },
  {
    id: 'wave155',
    name: 'Kalita Wave 155',
    shortName: 'Wave 155',
    family: 'flat',
    comfortableG: [12, 22],
    hardG: [10, 25],
    pulseG: 70,
    minPulses: 3,
    lastPourFraction: 0.6,
    defaultDoseG: 18, // the owner's usual single cup (2026-11-20)
    provisional: false,
    tipsStatus: 'owner',
    tips: [
      'Rinse the filter without flattening its ridges.',
      'Pour in small circles over the middle of the bed, not onto the filter wall.',
      'Start each pour on the cue rather than waiting for the bed to run dry.',
      'Finish with a flat bed.',
    ],
  },
  {
    id: 'v60_02',
    name: 'Hario V60 02',
    shortName: 'V60 02',
    family: 'cone',
    comfortableG: [12, 30],
    hardG: [10, 36],
    pulseG: 150,
    minPulses: 2,
    lastPourFraction: 0.45,
    defaultDoseG: 20,
    provisional: true,
    tipsStatus: 'draft',
    tips: [
      'Rinse the paper filter with hot water and empty the server before you brew.',
      'Wet all the grounds during the bloom.',
      'Pour in slow spirals from the center outward and back, keeping the stream off the paper.',
      'Finish with a flat bed.',
    ],
  },
  {
    id: 'chemex6',
    name: 'Chemex 6-cup',
    shortName: 'Chemex 6',
    family: 'chemex',
    comfortableG: [25, 45],
    hardG: [20, 50],
    pulseG: 200,
    minPulses: 2,
    lastPourFraction: 0.5,
    defaultDoseG: 40,
    provisional: true,
    tipsStatus: 'draft',
    tips: [
      'Put the thick, three-layer side of the filter against the pouring spout.',
      'Rinse the filter well with hot water, then pour the rinse water out.',
      'Pour in slow circles and keep the water level below the top of the paper.',
      'Finish with a flat bed.',
    ],
  },
]);

export function brewerById(id) {
  return BREWERS.find((brewer) => brewer.id === id) || null;
}
