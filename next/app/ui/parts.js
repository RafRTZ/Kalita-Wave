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
function stepRow(step, unit) {
  return h(
    'li',
    { class: 'step-row' },
    h('span', { class: 't' }, formatClock(step.startS)),
    h('span', { class: 'name' }, stepLabel(step)),
    h('span', { class: 'g' }, h('span', { class: 'to' }, 'to '), formatWeight(step.targetG, unit)),
  );
}

/** The last row: the target finish time, which is a starting point. */
function finishRow(plan) {
  return h(
    'li',
    { class: 'step-row finish' },
    h('span', { class: 't' }, formatClock(plan.totalS)),
    h('span', { class: 'name' }, 'Finish'),
    h('span', { class: 'g' }, 'start here'),
  );
}

/**
 * The pour plan: one card with a row for each pour and a last row for the finish time. Both screens build
 * it here and the stylesheet has one set of rules for it, so it is the same list in both places. The
 * timer also gets the rows back, to shade them as the brew runs.
 */
export function planCard(plan, unit) {
  const rows = plan.steps.map((step) => stepRow(step, unit));
  const finish = finishRow(plan);
  const node = h('section', { class: 'card plan', 'aria-label': 'Pour plan' }, h('ol', { class: 'steps' }, rows, finish));
  // The stylesheet uses the row count to know how small the card may get before the screen scrolls.
  node.style.setProperty('--rows', String(rows.length + 1));
  return { node, rows, finish };
}

// ---------- the pour plan keeps its place when Start is tapped (owner, 2026-11-21) ----------
// Both screens end the same way: the pour plan, a gap, the row of buttons. The gap and the buttons are one
// size on both, so the bottom edge of the plan is already in one place. Its height is the part that could
// differ. The card is as tall as its rows like to be, but on a short screen, or under a message, it gives
// up height to what sits above it, and that is not the same on the two screens. So the height the card
// has on the brew screen is noted at the tap on Start, and the timer's card is given that height.

let noted = null;

/** Note how tall a pour plan is now, and the size of the screen that height belongs to. */
export function notePlanHeight(card) {
  noted = { height: card.getBoundingClientRect().height, viewW: window.innerWidth, viewH: window.innerHeight };
}

/**
 * Give a pour plan the noted height, and say whether there was one to give. On a screen of any other size
 * the note does not apply, and neither does it after the page has been loaded again.
 */
export function usePlanHeight(card) {
  const applies = Boolean(noted) && noted.viewW === window.innerWidth && noted.viewH === window.innerHeight;
  if (applies) card.style.setProperty('--plan-h', `${noted.height}px`);
  else card.style.removeProperty('--plan-h');
  return applies;
}
