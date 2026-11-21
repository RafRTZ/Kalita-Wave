// The grind page, opened by tapping the grind beside the grams on the brew screen. The brew screen only
// shows the number, because the grind is not something to set before a brew: it moves one step after a
// brew, from the answer to "How did it drain?". The detail lives here: the normal range, the microns, and
// Finer and Coarser for the rare time the grind is changed by hand.

import { formatSetting, offsetInSteps } from '../engine/grind.js';
import { r5 } from '../engine/translate.js';
import { formatDose } from '../engine/units.js';
import { h, sheetFrame } from './dom.js';
import { grindBand, plural } from './text.js';

export function grindSheet(app) {
  const { grinder, brewer, plan, doseG } = app.brewContext();
  const close = () => app.closeSheet();
  if (!grinder) {
    return sheetFrame({ title: 'Grind', onClose: close }, h('p', { class: 'note' }, 'No grinder is set up. Add one in Settings.'));
  }
  const grind = plan.grind;
  const steps = offsetInSteps(app.state.house.grind_offset, grinder);
  return sheetFrame(
    { title: `${grinder.shortName} grind`, onClose: close },
    h(
      'section',
      { class: 'card pad' },
      h(
        'div',
        { class: 'stepper', role: 'group', 'aria-label': 'Grind setting' },
        h('button', { class: 'btn nudge', type: 'button', onclick: () => app.nudgeGrind(-1) }, 'Finer'),
        h(
          'div',
          { class: 'stepper-mid' },
          h('div', { class: 'num-input', role: 'status' }, formatSetting(grinder, grind.setting)),
          h('div', { class: 'unit-cap' }, `${formatDose(doseG, 'g')} on the ${brewer.shortName}`),
        ),
        h('button', { class: 'btn nudge', type: 'button', onclick: () => app.nudgeGrind(1) }, 'Coarser'),
      ),
      h('p', { class: 'note' }, `Start here. ${grindBand(grinder, grind)} is normal. About ${r5(grind.microns)} microns.`),
      steps !== 0
        ? h(
            'p',
            { class: 'note' },
            `Adjusted ${plural(Math.abs(steps), 'step')} ${steps > 0 ? 'coarser' : 'finer'} for this recipe. `,
            h('button', { class: 'link', type: 'button', onclick: () => app.resetGrindNudge() }, 'Undo'),
          )
        : null,
      grind.clamped ? h('p', { class: 'note' }, "That is the end of this grinder's range.") : null,
    ),
    h(
      'p',
      { class: 'note' },
      'After a brew, the Done screen asks how it drained and moves the grind one step for next time. Finer and Coarser here are for the rare time you want to change it yourself.',
    ),
  );
}
