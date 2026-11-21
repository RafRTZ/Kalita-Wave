// Every coffee and timer constant in the app lives in this file.
// Source: docs/BUILD_BRIEF.md section 5.1 unless a line says otherwise.
// These are starting points from rules of thumb, not physics.
// Brewer, grinder, and scale profiles are catalog data: see app/data/catalog/.

// Grind
export const ANCHOR_MICRONS = 720; // the anchor grind, at ANCHOR_DOSE_G on a cone
export const ANCHOR_DOSE_G = 20;
export const FAMILY_GRIND_OFFSET = Object.freeze({ cone: 0, flat: 25, chemex: 75, other: 0 }); // microns
export const DOSE_GRIND_SLOPE = 3; // microns per gram of dose
export const CUSTOM_GRINDER_SPAN_MICRONS = 1000; // default span of a custom grinder's whole range (5.2)

// Time
export const TIME_EXPONENT = 0.4;
export const BASELINE_TOTAL_S = 195; // at ANCHOR_DOSE_G, used when a card prints no drain time
export const ROUND_TO = 5; // r5 rounds grams and seconds to the nearest 5, halves up

// Pours when the card's brewer family differs from ours (rule R2)
export const BLOOM_RATIO_MIN = 2; // bloom water as a multiple of dose
export const BLOOM_RATIO_MAX = 3;
export const FIRST_POUR_MIN_S = 30;
export const FIRST_POUR_MAX_S = 50;
export const MAX_PULSES = 6;
export const MIN_POUR_GAP_S = 20;

// Temperature
export const DEFAULT_TEMP_F = 203;

// Cards printed for a device whose timing does not carry over to pour-over ("other")
export const OTHER_RATIO_MIN = 14;
export const OTHER_RATIO_MAX = 18;

// Units
export const GRAMS_PER_OUNCE = 28.3495;

// Dose entry (DECISIONS.md, kickoff item 5)
export const DOSE_MIN_G = 5;
export const DOSE_MAX_G = 60;
export const DOSE_STEP_G = 1;

// Timer (brief 5.3, and DECISIONS.md kickoff item 6)
export const COUNT_IN_OPTIONS_S = Object.freeze([0, 3, 5]);
export const DEFAULT_COUNT_IN_S = 5;
export const HEADS_UP_OPTIONS_S = Object.freeze([3, 5]);
export const DEFAULT_HEADS_UP_S = 5;
export const TICK_OFFSETS_S = Object.freeze([3, 2, 1]); // seconds before each pour
export const STEP_FLASH_S = 2; // how long a step that just started stays highlighted
export const AUTO_END_AFTER_S = 600; // a run nobody marks Done ends itself this long after the target
export const PAUSE_EXPIRES_S = 1800; // a paused run older than this is dropped

// Dial-in after a brew (brief 6.3). The brief's rule also listens to taste, bitter or sour; that part
// arrives with the bean log in Milestone 2.
export const DIAL_IN_TOLERANCE_S = 25; // more than this over the target is a slow drain, more than this under a fast one
export const DIAL_IN_STEPS = 1; // the grind moves this many steps of the grinder after a brew, never more

// The house default recipe, used when no bean is selected. It is the brew guide from a real roaster card
// (device printed as "HARIO CONE").
export const HOUSE_RECIPE = Object.freeze({
  id: 'house',
  name: 'House default',
  device: 'Hario cone',
  family: 'cone',
  doseG: 20,
  waterG: 320,
  tempF: 203,
  grindMicrons: 720,
  totalS: 210,
  steps: Object.freeze([
    Object.freeze({ startS: 0, targetG: 50, style: 'bloom' }),
    Object.freeze({ startS: 30, targetG: 140, style: 'center' }),
    Object.freeze({ startS: 55, targetG: 230, style: 'spiral' }),
    Object.freeze({ startS: 90, targetG: 320, style: 'spiral' }),
  ]),
});

// Printed device to brewer family. Checked in this order; the first family with a matching word wins.
// "Origami" alone is ambiguous (it takes cone or Wave filters) and maps to nothing: the form must ask.
export const DEVICE_FAMILY_WORDS = Object.freeze([
  ['other', ['aeropress', 'aero press', 'clever', 'switch', 'french press', 'press pot', 'espresso', 'moka']],
  ['chemex', ['chemex']],
  ['flat', ['kalita', 'wave', 'orea', 'april', 'stagg', 'flat']],
  ['cone', ['v60', 'cone', 'kono']],
]);

// Limits used to check a recipe typed in or scanned from a card (brief 6.3)
export const CARD_RATIO_MIN = 12;
export const CARD_RATIO_MAX = 20;
export const CARD_TEMP_MIN_F = 175;
export const CARD_TEMP_MAX_F = 212;
