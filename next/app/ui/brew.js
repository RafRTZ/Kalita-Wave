// The brew screen in its Ready state: the brewer switch, then two labelled parts and one large Start button.
// "Grind" is what happens at the grinder, on one row: the dose with its minus and plus, and beside it the
// grind as a recommendation to read. The grind is not set here. It moves after a brew, from the answer to
// "How did it drain?" on the Done screen, and a line under the row says so until the next brew starts.
// "Brew" is what happens at the kettle: water, temperature, and finish time, then the pour plan.
// The screen fits one phone screen with no scrolling: the pour plan gives up height first.
// The pour plan and the buttons under it are built and placed exactly as on the timer, so a tap on Start
// changes the upper part of the screen and nothing else is seen to move (owner, 2026-11-21).

import { DOSE_MAX_G, DOSE_MIN_G } from '../engine/constants.js';
import { DRAIN } from '../engine/dialin.js';
import { formatSetting } from '../engine/grind.js';
import { formatClock, formatDose, formatWeight } from '../engine/units.js';
import { h, icon, segmented } from './dom.js';
import { notePlanHeight, planCard, topActions } from './parts.js';
import { temperature } from './text.js';

function header(app, c) {
  return h(
    'header',
    { class: 'top' },
    h(
      'div',
      { class: 'title' },
      h('h1', {}, 'Kalita Wave'),
      h(
        'p',
        { class: 'title-sub' },
        app.channel === 'next' ? h('span', { class: 'tag' }, 'NEXT') : null,
        h('span', { class: 'recipe-name' }, c.plan.sourceName),
      ),
    ),
    topActions(app),
  );
}

function brewerSwitch(app, c) {
  return segmented({
    label: 'Brewer',
    extraClass: c.brewers.length > 2 ? 'brewers many' : 'brewers',
    value: c.brewerItem.id,
    options: c.brewers.map(({ item, profile }) => ({ value: item.id, label: profile.shortName })),
    onChange: (id) => app.setBrewer(id),
  });
}

/** Things worth a line only some of the time: a dose outside the brewer's range, an untested profile. */
function notices(c) {
  const { advisory, sourceNote } = c.plan;
  return [
    advisory.message
      ? h(
          'p',
          { class: `advisory ${advisory.status === 'caution' ? 'caution' : 'warning'}`, role: 'status' },
          advisory.status === 'caution' ? null : h('strong', {}, 'Outside the limits. '),
          advisory.message,
        )
      : null,
    c.brewer.provisional ? h('p', { class: 'note' }, 'Provisional profile. Nobody here has brew-tested it yet.') : null,
    sourceNote ? h('p', { class: 'note' }, sourceNote) : null,
  ];
}

/** Minus, the grams of coffee, plus. In ounces the line under the number gives the same dose in ounces. */
function doseStepper(app, c) {
  return h(
    'div',
    { class: 'stepper' },
    h('button', { class: 'step-btn', type: 'button', 'aria-label': 'One gram less', onclick: () => app.stepDose(-1) }, '−'),
    h(
      'div',
      { class: 'stepper-mid' },
      h(
        'div',
        { class: 'dose-line' },
        h('input', {
          class: 'dose-input',
          id: 'dose',
          type: 'number',
          inputmode: 'numeric',
          min: DOSE_MIN_G,
          max: DOSE_MAX_G,
          step: 1,
          value: String(c.doseG),
          'aria-label': 'Coffee dose in grams',
          onchange: (event) => app.setDose(Number(event.target.value)),
        }),
        h('span', { class: 'dose-unit', 'aria-hidden': 'true' }, 'g'),
      ),
      h('div', { class: 'unit-cap' }, c.unit === 'oz' ? formatDose(c.doseG, 'oz') : 'coffee'),
    ),
    h('button', { class: 'step-btn', type: 'button', 'aria-label': 'One gram more', onclick: () => app.stepDose(1) }, '+'),
  );
}

/** The grind beside the dose: a number to read. A tap opens the grind page with the detail behind it. */
function grindChip(app, c) {
  const { plan, grinder, grindChange } = c;
  if (!grinder) return null;
  const setting = formatSetting(grinder, plan.grind.setting);
  return h(
    'button',
    {
      class: grindChange ? 'grind-chip changed' : 'grind-chip',
      type: 'button',
      'aria-label': `${grinder.shortName} grind ${setting}. Open the grind page.`,
      onclick: () => app.openSheet('grind'),
    },
    h('span', { class: 'grind-value' }, setting),
    h('span', { class: 'unit-cap' }, `${grinder.shortName} grind`),
  );
}

/** Shown from the answer to "How did it drain?" until the next brew starts: what changed, why, and Undo. */
function grindChangeLine(app, c) {
  const { grinder, grindChange } = c;
  if (!grinder || !grindChange) return null;
  const now = formatSetting(grinder, grindChange.now);
  const was = formatSetting(grinder, grindChange.was);
  const why = `Last brew drained ${grindChange.drain === DRAIN.SLOW ? 'slow' : 'fast'}.`;
  // With another dose or brewer the step can land on the end of the grinder's range and show no change.
  const text = grindChange.now === grindChange.was ? `${why} The grind stays at ${now} for this dose.` : `Grind is now ${now}, was ${was}. ${why}`;
  return h(
    'p',
    { class: 'grind-change', role: 'status' },
    h('span', {}, text),
    h('button', { class: 'link', type: 'button', onclick: () => app.undoGrindChange() }, 'Undo'),
  );
}

/** Water, temperature, and finish time: a strip of three numbers in a card of its own. */
function stats(c) {
  const { plan, unit } = c;
  const stat = (value, key) => h('div', { class: 'stat' }, h('div', { class: 'v' }, value), h('div', { class: 'k' }, key));
  return h(
    'div',
    { class: 'card stats', role: 'group', 'aria-label': 'Recipe summary' },
    stat(formatWeight(plan.waterG, unit), 'water'),
    stat(temperature(plan.tempF), 'water temp'),
    stat(formatClock(plan.totalS), 'finish, start here'),
  );
}

/** A labelled part of the screen: its name, an optional action at the right of the name, and one card. */
function group(name, extraClass, action, card) {
  return h(
    'section',
    { class: `group ${extraClass}`, 'aria-label': name },
    h('div', { class: 'group-head' }, h('h2', { class: 'lbl' }, name), action),
    card,
  );
}

/** At the grinder: how much coffee, and the grind to use for it. */
function grindGroup(app, c) {
  return group(
    'Grind',
    'grind-group',
    null,
    h('div', { class: 'card setup' }, h('div', { class: 'dose-row' }, doseStepper(app, c), grindChip(app, c)), grindChangeLine(app, c)),
  );
}

/** At the kettle: water, temperature, and finish time. The pour plan follows it as a card of its own. */
function brewGroup(app, c) {
  const tips = h('button', { class: 'link', type: 'button', onclick: () => app.openSheet('technique') }, `${c.brewer.shortName} tips`);
  return group('Brew', 'brew-group', tips, stats(c));
}

export function renderBrew(app) {
  const c = app.brewContext();
  const plan = planCard(c.plan, c.unit);
  const start = () => {
    // The timer puts its copy of the pour plan exactly where this one is, so note its height first.
    notePlanHeight(plan.node);
    app.start();
  };
  return h(
    'div',
    { class: 'screen brew' },
    // The upper part is this screen's own. The pour plan and the buttons are the same as on the timer.
    h('div', { class: 'upper' }, header(app, c), brewerSwitch(app, c), notices(c), grindGroup(app, c), brewGroup(app, c)),
    plan.node,
    h(
      'div',
      { class: 'bottom-bar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings', onclick: () => app.openSheet('settings') }, icon('settings')),
      h('button', { class: 'btn primary big grow', type: 'button', onclick: start }, 'Start'),
    ),
  );
}
