// The brew screen in its Ready state: brewer switch, dose and grind, the recipe summary, the pour plan, and
// one large Start button. It fits one phone screen with no scrolling: the pour plan gives up height first.

import { DOSE_MAX_G, DOSE_MIN_G } from '../engine/constants.js';
import { formatSetting, offsetInSteps } from '../engine/grind.js';
import { r5 } from '../engine/translate.js';
import { formatClock, formatDose, formatWeight } from '../engine/units.js';
import { h, icon, segmented } from './dom.js';
import { finishRow, stepRow, topActions } from './parts.js';
import { grindBand, plural, temperature } from './text.js';

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

function doseRow(app, c) {
  return h(
    'div',
    { class: 'stepper' },
    h('button', { class: 'step-btn', type: 'button', 'aria-label': 'One gram less', onclick: () => app.stepDose(-1) }, '−'),
    h(
      'div',
      { class: 'stepper-mid' },
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
      h('div', { class: 'unit-cap' }, c.unit === 'oz' ? `grams of coffee, ${formatDose(c.doseG, 'oz')}` : 'grams of coffee'),
    ),
    h('button', { class: 'step-btn', type: 'button', 'aria-label': 'One gram more', onclick: () => app.stepDose(1) }, '+'),
  );
}

function grindRows(app, c) {
  const { plan, grinder } = c;
  if (!grinder) return null;
  const grind = plan.grind;
  const steps = offsetInSteps(app.state.house.grind_offset, grinder);
  return [
    h(
      'div',
      { class: 'stepper grind', role: 'group', 'aria-label': 'Grind' },
      h('button', { class: 'btn nudge', type: 'button', onclick: () => app.nudgeGrind(-1) }, 'Finer'),
      h(
        'div',
        { class: 'stepper-mid' },
        h('div', { class: 'grind-value' }, formatSetting(grinder, grind.setting)),
        h('div', { class: 'unit-cap' }, `${grinder.shortName} grind`),
      ),
      h('button', { class: 'btn nudge', type: 'button', onclick: () => app.nudgeGrind(1) }, 'Coarser'),
    ),
    h('p', { class: 'grind-note' }, `Start here. ${grindBand(grinder, grind)} is normal. About ${r5(grind.microns)} microns.`),
    steps !== 0
      ? h(
          'p',
          { class: 'grind-note' },
          `Adjusted ${plural(Math.abs(steps), 'step')} ${steps > 0 ? 'coarser' : 'finer'} for this recipe. `,
          h('button', { class: 'link', type: 'button', onclick: () => app.resetGrindNudge() }, 'Undo'),
        )
      : null,
    grind.clamped ? h('p', { class: 'grind-note' }, "That is the end of this grinder's range.") : null,
  ];
}

function stats(c) {
  const { plan, unit } = c;
  const stat = (value, key) => h('div', { class: 'stat' }, h('div', { class: 'v' }, value), h('div', { class: 'k' }, key));
  return h(
    'section',
    { class: 'stats', 'aria-label': 'Recipe summary' },
    stat(formatWeight(plan.waterG, unit), 'water'),
    stat(temperature(plan.tempF), 'water temp'),
    stat(formatClock(plan.totalS), 'finish, start here'),
  );
}

function planCard(app, c) {
  const { plan, unit, brewer } = c;
  const card = h(
    'section',
    { class: 'card plan', 'aria-label': 'Pour plan' },
    h(
      'div',
      { class: 'plan-head' },
      h('h2', { class: 'lbl' }, 'Pour plan'),
      h('button', { class: 'link', type: 'button', onclick: () => app.openSheet('technique') }, `${brewer.shortName} tips`),
    ),
    h('ol', { class: 'steps' }, plan.steps.map((step) => stepRow(step, unit)), finishRow(plan)),
  );
  // The stylesheet uses the row count to know how small this card may get before the screen scrolls.
  card.style.setProperty('--rows', String(plan.steps.length + 1));
  return card;
}

export function renderBrew(app) {
  const c = app.brewContext();
  return h(
    'div',
    { class: 'screen brew' },
    header(app, c),
    brewerSwitch(app, c),
    notices(c),
    h('section', { class: 'card setup', 'aria-label': 'Dose and grind' }, doseRow(app, c), grindRows(app, c)),
    stats(c),
    planCard(app, c),
    h(
      'div',
      { class: 'bottom-bar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings', onclick: () => app.openSheet('settings') }, icon('settings')),
      h('button', { class: 'btn primary big grow', type: 'button', onclick: () => app.start() }, 'Start'),
    ),
  );
}
