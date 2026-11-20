// Scale help: one section per scale the household owns, each starting with "Scale is showing ounces".
// Opened from the "?" on the brew and timer screens.

import { gearOf, profileOf } from '../data/household.js';
import { h, segmented, sheetFrame } from './dom.js';
import { UNIT_OPTIONS } from './text.js';

function specLine(scale) {
  const parts = [`Weighs up to ${scale.capacityG} g`, `reads to ${scale.resolutionG} g`];
  if (scale.autoOffMin) parts.push(`switches itself off after about ${scale.autoOffMin} minutes`);
  return `${parts.join(', ')}.`;
}

function helpEntry(entry, open) {
  const generic = entry.generic_steps || [];
  return h(
    'details',
    { class: 'help-entry', open },
    h('summary', {}, entry.symptom),
    entry.steps.length ? h('ol', {}, entry.steps.map((step) => h('li', {}, step))) : null,
    entry.verified && entry.source_url
      ? h(
          'p',
          { class: 'source-line' },
          'Source: ',
          h('a', { href: entry.source_url, target: '_blank', rel: 'noopener noreferrer' }, "the maker's manual"),
          '.',
        )
      : null,
    generic.length
      ? [
          h(
            'p',
            { class: 'generic-label' },
            entry.steps.length ? "Also worth trying (generic, not from this scale's manual):" : "Generic steps, not from this scale's manual:",
          ),
          h('ol', {}, generic.map((step) => h('li', {}, step))),
        ]
      : null,
  );
}

function scaleSection(app, item, scale) {
  const saved = h('span', { class: 'saved-flag', role: 'status' });
  const save = () => {
    app.setGearNote(item.id, noteBox.value);
    saved.textContent = 'Saved on this phone.';
  };
  // Saved when the box loses focus as well as by the button, so a note is never lost to a stray tap.
  const noteBox = h('textarea', { class: 'input', id: `note-${item.id}`, rows: 3, maxlength: 2000, onchange: save }, item.note || '');
  return h(
    'section',
    { class: 'card pad' },
    h('h3', {}, scale.name),
    h('p', { class: 'note' }, specLine(scale)),
    scale.verified ? null : h('p', { class: 'note' }, h('span', { class: 'tag quiet' }, 'Not verified'), " Its maker's manual has not been checked. The steps below are generic."),
    h('div', { class: 'lbl gap' }, 'What is wrong?'),
    h('div', { class: 'help-list' }, scale.help.map((entry, i) => helpEntry(entry, i === 0))),
    h(
      'div',
      { class: 'field' },
      h('label', { for: `note-${item.id}`, class: 'lbl gap' }, 'Our note: the fix that works'),
      noteBox,
    ),
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: save }, 'Save note'),
      saved,
    ),
  );
}

export function scaleHelpSheet(app) {
  const scales = gearOf(app.state.household, 'scale')
    .map((item) => ({ item, scale: profileOf(item) }))
    .filter((entry) => entry.scale);
  return sheetFrame(
    { title: 'Scale help', onClose: () => app.closeSheet() },
    h(
      'section',
      { class: 'card pad' },
      h('p', { class: 'lead' }, 'Scale stuck in ounces in the middle of a brew? Switch this app to ounces and keep pouring. Fix the scale afterwards.'),
      segmented({ label: 'Weight unit', value: app.state.settings.unit, options: UNIT_OPTIONS, onChange: (unit) => app.setUnit(unit) }),
    ),
    scales.length
      ? scales.map(({ item, scale }) => scaleSection(app, item, scale))
      : h('p', { class: 'note' }, 'No scales are set up. Add one in Settings.'),
  );
}
