// Scale catalog. Data, not code.
// Each help entry is { id, symptom, steps[], source_url, verified } plus optional generic_steps[].
// verified: true means the steps are in a manufacturer-authored document (source_url), wherever it is hosted.
// generic_steps are NOT from the scale's manual; the app labels them so.
// Every scale has at least these entries, in this order: ounces, timer, turns off, drift, tare.
// Both manuals were read in full on 2026-11-20.

const ACAIA_MANUAL = 'https://cdn.acaia.co/web/2024_doc/manual/lunar2021/Lunar2021_MAN_AEAF16001_EN.pdf';
// Eureka's own handbook (Conti Valerio S.r.l., ME051-1-EN-PG-R00, 11-2021), on a third-party host.
const EUREKA_HANDBOOK = 'https://manuals.plus/m/fcdfcfbef49fe008177be71c0a4732439e4757a0355b65359c3bef316a918dae_optim.pdf';

const GENERIC = Object.freeze({
  lostWeight: 'If it switches off mid-brew, the weight so far is lost. Follow the clock and pour by eye for the rest.',
  handsOff: 'Keep your hands and the kettle off the scale and the server while the reading settles.',
  restart: 'Take everything off, switch the scale off and on, put the brewer back, and tare once.',
});

export const SCALES = Object.freeze([
  {
    id: 'acaia_lunar_2021',
    brand: 'Acaia',
    model: 'Lunar (2021)',
    name: 'Acaia Lunar 2021',
    units: ['g', 'oz'],
    capacityG: 2000,
    resolutionG: 0.1,
    autoOffMin: 5,
    hasTimer: true,
    source_url: ACAIA_MANUAL,
    verified: true,
    note: 'From the Acaia Lunar user manual for firmware 1.0.016 (2024), read in full on 2026-11-20. Capacity 2000 g, readability 0.1 g. The sleep timer is 5 minutes unless changed.',
    help: [
      {
        id: 'ounces',
        symptom: 'Scale is showing ounces',
        steps: [
          'How to tell: in ounces the Lunar shows three decimals (0.000) and a small indicator lights at the bottom left.',
          'The unit is changed in the Settings menu, not with a button during a brew. Until it is fixed, switch this app to oz with the g / oz button.',
          'Turn the scale off.',
          'Press and hold Power until the display shows ACAIA and then SEt, then let go. (Holding longer shows the battery level instead.)',
          'Tap Tare to enter Settings. The first item shown is SLEEP.',
          'Tap Tare until the display shows Unit. It is the fourth item.',
          'Press and hold Tare to open it.',
          'Tap Tare to choose grams. Grams show as 9 and ounces show as o2.',
          'Press and hold Tare for two seconds to save, then tap Power to exit. (Tapping Power before saving backs out without changing anything.)',
        ],
        source_url: ACAIA_MANUAL,
        verified: true,
      },
      {
        id: 'timer',
        symptom: 'Timer starts or stops on its own',
        steps: [
          'The Lunar changes mode when Power is held for about one second. That is easy to do by accident when tapping Power to start the timer.',
          'For pour-over use mode 2, Dual Display: weight plus a manual timer. Tap Power to start, stop, and reset it. It stops at 9:59.',
          'Mode 7 is the pour-over auto-start: you tare by hand, the timer starts when water first flows from the kettle, and it stops when the brewer is lifted off.',
          'Modes 3 to 6 are espresso modes. They start the timer on flow, tare by themselves, or both, and they misbehave under a pour-over.',
          'To get back, hold Power for about one second, and repeat until the weight-and-timer display of mode 2 returns.',
          'Modes you never use can be switched off in the Settings menu (the items NOdE_1 to NOdE_7), so an accidental hold cannot land on them.',
        ],
        source_url: ACAIA_MANUAL,
        verified: true,
      },
      {
        id: 'turns_off',
        symptom: 'Turns off mid-brew',
        steps: [
          'Tapping Power twice quickly switches the Lunar off (that is its default). When you start or stop its timer, tap once and wait.',
          'It also switches itself off after 5 minutes with no activity unless that has been changed.',
          'That timer is SLEEP, the first item in the Settings menu (opened as described under "Scale is showing ounces"). The choices are 5, 10, 20, 30, or 60 minutes, or Off.',
        ],
        generic_steps: [GENERIC.lostWeight],
        source_url: ACAIA_MANUAL,
        verified: true,
      },
      {
        id: 'drift',
        symptom: 'Reading drifts',
        steps: [
          'Use a level, steady surface with no vibration, and put the load in the middle of the pan.',
          'Zero tracking keeps the zero point steady. It is the trAcE item in Settings. If it has been set to Off, the zero can drift as the room warms or cools.',
          'The FiLtEr item in Settings trades speed for steadiness: High is steadier but slower. The default is Fast.',
          'To calibrate: in the plain weighing mode, with the unit in grams, tap Tare rapidly until CAL shows, place the 100 g weight that came with the scale (500, 1000, or 2000 g also work), and wait for End.',
          'Error 304 during calibration means wind or vibration got in the way.',
        ],
        generic_steps: [GENERIC.handsOff],
        source_url: ACAIA_MANUAL,
        verified: true,
      },
      {
        id: 'tare',
        symptom: 'Will not tare',
        steps: [
          'Tap Tare briefly. Holding it does other things: about half a second subtracts a stored container weight, and two seconds stores one (the display shows SAu). Neither changes the unit.',
          'Modes 4, 5, and 6 tare by themselves whenever the load is steady. If the zero keeps changing on its own, the scale is in one of them: hold Power for about one second, and repeat until mode 2 returns.',
          'Bracket symbols instead of a number mean the load is outside what the scale can weigh: a bar on top is too heavy, a bar on the bottom is too light.',
        ],
        generic_steps: [GENERIC.restart],
        source_url: ACAIA_MANUAL,
        verified: true,
      },
    ],
  },
  {
    id: 'eureka_precisa',
    brand: 'Eureka',
    model: 'Precisa',
    name: 'Eureka Precisa',
    units: ['g', 'oz'],
    capacityG: 2000,
    resolutionG: 0.1,
    autoOffMin: 3,
    hasTimer: true,
    source_url: EUREKA_HANDBOOK,
    verified: true,
    note: 'From Eureka\'s "Digital scale Precisa" user handbook (11-2021), read in full on 2026-11-20 from a copy on a third-party host. Sold by Clive Coffee as the Eureka Precision Scale. Capacity 1 g to 2000 g, graduation 0.1 g, timer to 9:59, micro USB charging.',
    help: [
      {
        id: 'ounces',
        symptom: 'Scale is showing ounces',
        steps: [
          'With the scale on, double tap the right-hand button (the power symbol, marked TARE). That switches between grams and ounces.',
          'The unit is shown at the right-hand end of the display.',
          'Tap twice quickly: a single press of that button tares instead.',
        ],
        generic_steps: [
          'If the double tap does nothing and yours is the Bluetooth version, the unit may be set in Eureka\'s phone app instead. We have not confirmed that.',
          'Until it is fixed, switch this app to oz with the g / oz button.',
        ],
        source_url: EUREKA_HANDBOOK,
        verified: true,
      },
      {
        id: 'timer',
        symptom: 'Timer starts or stops on its own',
        steps: [
          'The left-hand button (the clock symbol, marked ZERO) is the timer. One press starts it, the next press pauses it, and press and hold resets it to zero.',
          'The handbook describes no automatic start. The timer only moves when that button is pressed.',
          'The timer stops at 9 minutes 59 seconds, and the scale switches itself off 10 seconds later.',
        ],
        generic_steps: ['If it starts or stops by itself, something is pressing the left button: a hand, a cloth, or the server.'],
        source_url: EUREKA_HANDBOOK,
        verified: true,
      },
      {
        id: 'turns_off',
        symptom: 'Turns off mid-brew',
        steps: [
          'The handbook says the scale turns itself off after about 3 minutes.',
          'It also says that when the timer is used, the scale turns off 10 seconds after the timer reaches 9:59.',
          'A short press of the right-hand button turns it on. Press and hold the same button to turn it off by hand.',
          'If the display shows Lo, or goes dim, it needs charging: micro USB, about an hour.',
        ],
        generic_steps: [
          "Our reading of the handbook, not a tested fact: starting the scale's timer when you start the brew should keep it on to the end. Try it once.",
          GENERIC.lostWeight,
        ],
        source_url: EUREKA_HANDBOOK,
        verified: true,
      },
      {
        id: 'drift',
        symptom: 'Reading drifts',
        steps: [
          'Put the scale on a hard, level surface.',
          'Do not weigh while it is charging. The handbook says the cable can affect the reading.',
          'If you use the rubber mat, fit it with the scale switched off, then switch on.',
          'Do not keep anything stored on the scale.',
        ],
        generic_steps: [GENERIC.handsOff],
        source_url: EUREKA_HANDBOOK,
        verified: true,
      },
      {
        id: 'tare',
        symptom: 'Will not tare',
        steps: [
          'With the scale on, press the right-hand button once (the power symbol, marked TARE). The display goes back to 0.',
          'Or put the empty brewer and server on the scale while it is off, then switch it on. It starts at zero.',
          'A negative number after you lift something off is normal. Press the same button to zero it.',
          'Err on the display means the load is over the 2000 g limit.',
        ],
        generic_steps: [GENERIC.restart],
        source_url: EUREKA_HANDBOOK,
        verified: true,
      },
    ],
  },
]);

export const REQUIRED_HELP_IDS = Object.freeze(['ounces', 'timer', 'turns_off', 'drift', 'tare']);

export function scaleById(id) {
  return SCALES.find((scale) => scale.id === id) || null;
}
