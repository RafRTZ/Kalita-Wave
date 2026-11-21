// Pieces the brew screen and the timer both use.

import { formatClock, formatWeight } from '../engine/units.js';
import { h, segmented } from './dom.js';
import { stepLabel, UNIT_OPTIONS } from './text.js';

/** Top right on both screens: the g / oz switch and the scale help button. */
export function topActions(app) {
  return h(
    'div',
    { class: 'top-actions' },
    segmented({
      label: 'Weight unit',
      extraClass: 'tight',
      value: app.state.settings.unit,
      options: UNIT_OPTIONS,
      onChange: (unit) => app.setUnit(unit),
    }),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Scale help', onclick: () => app.openSheet('scale-help') }, '?'),
  );
}

/** One row of the pour plan: when it starts, what to do, and the weight to pour to. */
export function stepRow(step, unit) {
  return h(
    'li',
    { class: 'step-row' },
    h('span', { class: 't' }, formatClock(step.startS)),
    h('span', { class: 'name' }, stepLabel(step)),
    h('span', { class: 'g' }, h('span', { class: 'to' }, 'to '), formatWeight(step.targetG, unit)),
  );
}

/** The last row: the target finish time, which is a starting point. */
export function finishRow(plan) {
  return h(
    'li',
    { class: 'step-row finish' },
    h('span', { class: 't' }, formatClock(plan.totalS)),
    h('span', { class: 'name' }, 'Finish'),
    h('span', { class: 'g' }, 'start here'),
  );
}
