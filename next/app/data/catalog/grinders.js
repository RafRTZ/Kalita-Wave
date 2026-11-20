// Grinder catalog. Data, not code.
// A profile describes the grinder's own numbers: its range, its step, which way is coarser, the setting
// that produces the anchor grind (refSetting), and how many microns one unit is worth (micronsPerUnit).
// verified: true means the fact is in a manufacturer-authored document, wherever that document is hosted.
// Each line in facts[] says where one field came from. Checked 2026-11-20.

const VIRTUOSO_MANUAL = 'https://www.seattlecoffeegear.com/cdn/shop/files/baratza-virtuoso-user-manual.pdf';
const BARATZA_CHART = 'https://support.clivecoffee.com/baratza-recommended-grinder-settings';

export const GRINDERS = Object.freeze([
  {
    id: 'baratza_virtuoso',
    brand: 'Baratza',
    model: 'Virtuoso (original)',
    shortName: 'Virtuoso',
    min: 1,
    max: 40,
    step: 1,
    coarser: 'higher',
    displayDecimals: 0,
    refSetting: 15,
    micronsPerUnit: 25,
    tips: [
      'Baratza\'s manual: "adjusting the grind may be easier when the grinder is running".',
      'The manual\'s own guide: 1 to 14 espresso, 16 to 32 filter or drip, 34 to 40 press. Pour-over sits at the fine end of the filter range.',
    ],
    source_url: VIRTUOSO_MANUAL,
    verified: true,
    facts: [
      {
        field: 'min, max, step, coarser',
        text: '40 settings; the manual\'s table runs from fine at low numbers to coarse at high numbers.',
        source_url: VIRTUOSO_MANUAL,
        verified: true,
        note: 'Baratza operations manual (copyright 2009, rev 051611), hosted by a retailer.',
      },
      {
        field: 'refSetting',
        text: 'Baratza\'s recommended Hario V60 setting for the Virtuoso is 15.',
        source_url: BARATZA_CHART,
        verified: true,
        note: 'Baratza\'s chart as republished by Clive Coffee. The chart does not separate the original Virtuoso from the Virtuoso+.',
      },
      {
        field: 'micronsPerUnit',
        text: 'About 25 microns per setting.',
        source_url: null,
        verified: false,
        note: 'An estimate from retailer-listed particle ranges. Baratza\'s manual prints no micron figures.',
      },
      {
        field: 'model',
        text: 'Model 586, bought in 2019.',
        source_url: null,
        verified: false,
        note: 'From the owner. The manual does not print a model number.',
      },
    ],
  },
]);

export function grinderById(id) {
  return GRINDERS.find((grinder) => grinder.id === id) || null;
}
