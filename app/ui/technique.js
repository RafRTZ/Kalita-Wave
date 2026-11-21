// Technique tips for the brewer in use. Opened from the pour plan on the brew screen, so the tips cost the
// brew screen no height.

import { h, sheetFrame } from './dom.js';

export function techniqueSheet(app) {
  const { brewer, plan } = app.brewContext();
  return sheetFrame(
    { title: `${brewer.shortName} technique`, onClose: () => app.closeSheet() },
    h(
      'section',
      { class: 'card pad' },
      brewer.tipsStatus === 'draft' ? h('p', { class: 'note first' }, 'Draft tips, waiting for review.') : null,
      h('ul', { class: 'tips' }, brewer.tips.map((tip) => h('li', {}, tip))),
    ),
    h('p', { class: 'note' }, `Recipe: ${plan.sourceName}. Grind and finish time are starting points from rules of thumb.`),
  );
}
