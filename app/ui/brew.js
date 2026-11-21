// The brew screen in its Ready state: recipe summary, the pour plan, and one large Start button.

import { DOSE_MAX_G, DOSE_MIN_G } from '../engine/constants.js';
import { formatSetting, offsetInSteps } from '../engine/grind.js';
import { r5 } from '../engine/translate.js';
import { formatClock, formatDose, formatWeight } from '../engine/units.js';
import { h, icon, segmented } from './dom.js';
import { grindBand, plural, stepLabel, temperature, UNIT_OPTIONS } from './text.js';

export function appHeader(app) {
  return h(
    'header',
    { class: 'top' },
    h('h1', {}, 'Kalita Wave', app.channel === 'next' ? h('span', { class: 'tag' }, 'NEXT') : null),
    h(
      'div',
      { class: 'top-actions' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Scale help', onclick: () => app.openSheet('scale-help') }, '?'),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings', onclick: () => app.openSheet('settings') }, icon('settings')),
    ),
  );
}

function brewerCard(app, c) {
  const { plan, unit } = c;
  const advisory = plan.advisory;
  return h(
    'section',
    { class: 'card pad' },
    h('div', { class: 'lbl' }, 'Brewer'),
    segmented({
      label: 'Brewer',
      extraClass: c.brewers.length > 2 ? 'wrap' : '',
      value: c.brewerItem.id,
      options: c.brewers.map(({ item, profile }) => ({ value: item.id, label: profile.shortName })),
      onChange: (id) => app.setBrewer(id),
    }),
    c.brewer.provisional ? h('p', { class: 'note' }, 'Provisional profile. Nobody here has brew-tested it yet.') : null,
    h('div', { class: 'lbl gap' }, 'Coffee dose'),
    h(
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
        h('div', { class: 'unit-cap' }, unit === 'oz' ? `grams, or ${formatDose(c.doseG, 'oz')}` : 'grams'),
      ),
      h('button', { class: 'step-btn', type: 'button', 'aria-label': 'One gram more', onclick: () => app.stepDose(1) }, '+'),
    ),
    advisory.message
      ? h(
          'p',
          { class: `advisory ${advisory.status === 'caution' ? 'caution' : 'warning'}`, role: 'status' },
          advisory.status === 'caution' ? null : h('strong', {}, 'Outside the limits. '),
          advisory.message,
        )
      : null,
  );
}

function stats(c) {
  const { plan, unit } = c;
  const stat = (value, key, hint) =>
    h('div', { class: 'stat' }, h('div', { class: 'v' }, value), h('div', { class: 'k' }, key), hint ? h('div', { class: 'hint' }, hint) : null);
  return h(
    'section',
    { class: 'stats', 'aria-label': 'Recipe summary' },
    stat(formatWeight(plan.waterG, unit), 'Water'),
    stat(temperature(plan.tempF), 'Temp'),
    stat(formatClock(plan.totalS), 'Finish', 'start here'),
  );
}

function grindCard(app, c) {
  const { plan, grinder } = c;
  if (!grinder) return null;
  const grind = plan.grind;
  const steps = offsetInSteps(app.state.house.grind_offset, grinder);
  return h(
    'section',
    { class: 'grind', 'aria-label': 'Grind' },
    h('div', { class: 'lbl' }, 'Grind'),
    h(
      'div',
      { class: 'grind-row' },
      h('div', {}, h('div', { class: 'grind-name' }, grinder.shortName), h('div', { class: 'grind-value' }, formatSetting(grinder, grind.setting))),
      h(
        'div',
        { class: 'grind-side' },
        h('div', { class: 'grind-note' }, 'Start here.'),
        h('div', { class: 'grind-note' }, `${grindBand(grinder, grind)} is normal.`),
        h('div', { class: 'grind-sub' }, `About ${r5(grind.microns)} microns`),
      ),
    ),
    h(
      'div',
      { class: 'grind-nudge' },
      h('button', { class: 'btn', type: 'button', onclick: () => app.nudgeGrind(-1) }, 'Finer'),
      h('button', { class: 'btn', type: 'button', onclick: () => app.nudgeGrind(1) }, 'Coarser'),
    ),
    steps !== 0
      ? h(
          'p',
          { class: 'grind-adjust' },
          `Adjusted ${plural(Math.abs(steps), 'step')} ${steps > 0 ? 'coarser' : 'finer'} for this recipe. `,
          h('button', { class: 'link', type: 'button', onclick: () => app.resetGrindNudge() }, 'Undo'),
        )
      : null,
    grind.clamped ? h('p', { class: 'grind-adjust' }, "That is the end of this grinder's range.") : null,
  );
}

export function stepRows(plan, unit) {
  const rows = plan.steps.map((step) =>
    h(
      'li',
      { class: 'step-row' },
      h('span', { class: 't' }, formatClock(step.startS)),
      h('span', { class: 'name' }, stepLabel(step)),
      h('span', { class: 'g' }, `to ${formatWeight(step.targetG, unit)}`),
    ),
  );
  rows.push(
    h(
      'li',
      { class: 'step-row finish' },
      h('span', { class: 't' }, formatClock(plan.totalS)),
      h('span', { class: 'name' }, 'Finish'),
      h('span', { class: 'g' }, 'start here'),
    ),
  );
  return rows;
}

function planCard(app, c) {
  const { plan, unit } = c;
  return h(
    'section',
    { class: 'card', 'aria-label': 'Pour plan' },
    h(
      'div',
      { class: 'plan-head' },
      h('div', { class: 'lbl' }, 'Pour plan'),
      segmented({ label: 'Weight unit', extraClass: 'tight', value: unit, options: UNIT_OPTIONS, onChange: (u) => app.setUnit(u) }),
    ),
    h('ol', { class: 'steps' }, stepRows(plan, unit)),
  );
}

function tipsCard(app, c) {
  const { brewer } = c;
  return h(
    'details',
    {
      class: 'card',
      open: app.state.ui.tipsOpen,
      ontoggle: (event) => {
        app.state.ui.tipsOpen = event.target.open;
      },
    },
    h('summary', {}, `${brewer.shortName} technique`),
    h(
      'div',
      { class: 'details-body' },
      brewer.tipsStatus === 'draft' ? h('p', { class: 'note' }, 'Draft tips, waiting for review.') : null,
      h('ul', {}, brewer.tips.map((tip) => h('li', {}, tip))),
    ),
  );
}

export function renderBrew(app) {
  const c = app.brewContext();
  return h(
    'div',
    { class: 'screen brew' },
    appHeader(app),
    brewerCard(app, c),
    stats(c),
    grindCard(app, c),
    planCard(app, c),
    tipsCard(app, c),
    c.plan.sourceNote ? h('p', { class: 'note' }, c.plan.sourceNote) : null,
    h('p', { class: 'foot' }, `Recipe: ${c.plan.sourceName}. Grind and finish time are starting points from rules of thumb.`),
    h(
      'div',
      { class: 'bottom-bar' },
      h('div', { class: 'bar-inner' }, h('button', { class: 'btn primary big grow', type: 'button', onclick: () => app.start() }, 'Start')),
    ),
  );
}
