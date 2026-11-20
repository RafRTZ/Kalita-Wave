// Gear sheets: the one-time grinder calibration, the custom grinder form, and adding gear from the catalog.

import { activeItem, catalogChoices, checkCustomGrinder, findItem, gearOf, profileOf } from '../data/household.js';
import { DOSE_MAX_G, DOSE_MIN_G, HOUSE_RECIPE } from '../engine/constants.js';
import { clampToRange, defaultMicronsPerUnit, formatSetting, grindSetting, snapToStep, solveGrinderOffset, targetMicrons } from '../engine/grind.js';
import { sourceFromCard } from '../engine/translate.js';
import { h, segmented, sheetFrame } from './dom.js';
import { grinderName } from './text.js';

function stepper({ value, label, less, more, onLess, onMore }) {
  return h(
    'div',
    { class: 'stepper' },
    h('button', { class: 'step-btn', type: 'button', 'aria-label': less, onclick: onLess }, '−'),
    h('div', { class: 'stepper-mid' }, h('div', { class: 'num-input', role: 'status' }, value), h('div', { class: 'unit-cap' }, label)),
    h('button', { class: 'step-btn', type: 'button', 'aria-label': more, onclick: onMore }, '+'),
  );
}

/**
 * "What setting do you actually use?" for a brew the owner picks. Solves the grinder offset so the app
 * agrees with them. Asked once before the first brew (props.first), and reachable later from Settings.
 */
export function calibrateSheet(app, props = {}) {
  const household = app.state.household;
  const grinderItem = (props.grinderItemId && findItem(household, props.grinderItemId)) || activeItem(household, 'grinder');
  const grinder = profileOf(grinderItem);
  const brewers = gearOf(household, 'brewer').map((item) => ({ item, profile: profileOf(item) }));
  const now = app.brewContext();
  const local = { brewerItemId: now.brewerItem.id, doseG: now.doseG, setting: null, touched: false };
  const { source } = sourceFromCard(HOUSE_RECIPE);
  const root = h('div', {});

  function brew() {
    const brewer = (brewers.find((b) => b.item.id === local.brewerItemId) || brewers[0]).profile;
    const microns = targetMicrons(source, brewer.family, local.doseG);
    return {
      brewer,
      microns,
      published: grindSetting(microns, grinder).setting,
      current: grindSetting(microns, grinder, { grinderOffset: grinderItem.offset }).setting,
    };
  }

  function close() {
    if (props.first) app.skipCalibration();
    else app.closeSheet();
  }

  function draw() {
    const b = brew();
    if (!local.touched) local.setting = b.current;
    const nudge = (direction) => {
      local.touched = true;
      local.setting = clampToRange(grinder, snapToStep(grinder, local.setting + direction * grinder.step));
      draw();
    };
    const setDose = (dose) => {
      local.doseG = Math.min(DOSE_MAX_G, Math.max(DOSE_MIN_G, dose));
      draw();
    };
    root.replaceChildren(
      sheetFrame(
        { title: props.first ? 'One question first' : 'Grinder calibration', closeLabel: props.first ? 'Skip' : 'Cancel', onClose: close },
        h('p', { class: 'lead' }, `What setting do you actually use on your ${grinderName(grinder)}?`),
        h(
          'p',
          { class: 'note' },
          'Pick the brew you know best, then set the number you really use for it. Every grind suggestion shifts to match, so the app agrees with you. You can change this later in Settings.',
        ),
        h(
          'section',
          { class: 'card pad' },
          h('div', { class: 'lbl' }, 'The brew you know'),
          segmented({
            label: 'Brewer',
            extraClass: brewers.length > 2 ? 'wrap' : '',
            value: local.brewerItemId,
            options: brewers.map(({ item, profile }) => ({ value: item.id, label: profile.shortName })),
            onChange: (id) => {
              local.brewerItemId = id;
              draw();
            },
          }),
          h('div', { class: 'lbl gap' }, 'Coffee dose'),
          stepper({
            value: String(local.doseG),
            label: 'grams',
            less: 'One gram less',
            more: 'One gram more',
            onLess: () => setDose(local.doseG - 1),
            onMore: () => setDose(local.doseG + 1),
          }),
          h(
            'p',
            { class: 'note' },
            `For ${local.doseG} g on the ${b.brewer.name}, the published starting point is ${grinder.shortName} ${formatSetting(grinder, b.published)}.`,
          ),
        ),
        h(
          'section',
          { class: 'card pad' },
          h('div', { class: 'lbl' }, 'The setting you really use'),
          stepper({
            value: formatSetting(grinder, local.setting),
            label: grinder.shortName,
            less: 'One setting lower',
            more: 'One setting higher',
            onLess: () => nudge(-1),
            onMore: () => nudge(1),
          }),
        ),
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            {
              class: 'btn primary grow',
              type: 'button',
              onclick: () => app.saveCalibration(grinderItem.id, solveGrinderOffset(local.setting, b.microns, grinder)),
            },
            'Save',
          ),
          !props.first && grinderItem.offset !== 0
            ? h('button', { class: 'btn', type: 'button', onclick: () => app.saveCalibration(grinderItem.id, 0) }, 'Clear calibration')
            : null,
          h('button', { class: 'btn', type: 'button', onclick: close }, props.first ? 'Skip for now' : 'Cancel'),
        ),
      ),
    );
  }

  draw();
  return root;
}

function numberOrNull(text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
}

/** A grinder that is not in the catalog. The usual pour-over setting becomes its reference setting. */
export function customGrinderSheet(app) {
  const local = { coarser: 'higher', problems: [] };
  const root = h('div', {});
  const input = (id, attrs = {}) => h('input', { class: 'input', id, type: 'text', autocomplete: 'off', ...attrs });
  const inputs = {
    name: input('cg-name', { maxlength: 40 }),
    min: input('cg-min', { inputmode: 'decimal' }),
    max: input('cg-max', { inputmode: 'decimal' }),
    step: input('cg-step', { inputmode: 'decimal', value: '1' }),
    refSetting: input('cg-ref', { inputmode: 'decimal' }),
    micronsPerUnit: input('cg-microns', { inputmode: 'decimal' }),
  };
  const field = (key, label, help) =>
    h('div', { class: 'field' }, h('label', { for: inputs[key].id }, label), inputs[key], help ? h('p', { class: 'setting-help' }, help) : null);

  function save() {
    const fields = {
      name: inputs.name.value,
      min: numberOrNull(inputs.min.value),
      max: numberOrNull(inputs.max.value),
      step: numberOrNull(inputs.step.value),
      coarser: local.coarser,
      refSetting: numberOrNull(inputs.refSetting.value),
    };
    const microns = numberOrNull(inputs.micronsPerUnit.value);
    if (microns !== null) fields.micronsPerUnit = microns;
    const problems = checkCustomGrinder(fields);
    if (problems.length) {
      local.problems = problems;
      draw();
      root.scrollIntoView({ block: 'start' });
      return;
    }
    app.addCustomGrinder(fields);
  }

  function draw() {
    const min = numberOrNull(inputs.min.value);
    const max = numberOrNull(inputs.max.value);
    const step = numberOrNull(inputs.step.value);
    const fallback =
      Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(step) && max > min && step > 0
        ? `Leave empty to use ${Math.round(defaultMicronsPerUnit(min, max, step) * 10) / 10}, which assumes the whole range spans about 1000 microns.`
        : 'Leave empty to use the default, which assumes the whole range spans about 1000 microns.';
    root.replaceChildren(
      sheetFrame(
        { title: 'Custom grinder', closeLabel: 'Cancel', onClose: () => app.closeSheet() },
        local.problems.length ? h('div', { class: 'problems', role: 'alert' }, h('ul', {}, local.problems.map((p) => h('li', {}, p)))) : null,
        h(
          'section',
          { class: 'card pad' },
          field('name', 'Name'),
          field('min', 'Lowest setting'),
          field('max', 'Highest setting'),
          field('step', 'Step between settings', 'Use 1 for whole numbers, 0.5 for half steps.'),
          h(
            'div',
            { class: 'field' },
            h('div', { class: 'setting-title' }, 'Which numbers are coarser?'),
            segmented({
              label: 'Which way is coarser',
              value: local.coarser,
              options: [
                { value: 'higher', label: 'Higher' },
                { value: 'lower', label: 'Lower' },
              ],
              onChange: (value) => {
                local.coarser = value;
                draw();
              },
            }),
          ),
          field('refSetting', 'The setting you use for a typical single-cup pour-over', 'This becomes the starting point for every suggestion.'),
          field('micronsPerUnit', 'Microns per setting (optional)', fallback),
        ),
        h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn primary grow', type: 'button', onclick: save }, 'Save grinder'),
          h('button', { class: 'btn', type: 'button', onclick: () => app.closeSheet() }, 'Cancel'),
        ),
      ),
    );
  }

  draw();
  return root;
}

const KIND_WORDS = { brewer: 'brewer', scale: 'scale' };

/** Add a brewer or a scale from the catalog. */
export function addGearSheet(app, props = {}) {
  const kind = props.kind === 'scale' ? 'scale' : 'brewer';
  const choices = catalogChoices(app.state.household, kind);
  return sheetFrame(
    { title: `Add a ${KIND_WORDS[kind]}`, closeLabel: 'Cancel', onClose: () => app.closeSheet() },
    choices.length
      ? h(
          'section',
          { class: 'card pad' },
          choices.map((entry) =>
            h(
              'div',
              { class: 'gear-row' },
              h('div', { class: 'gear-name' }, entry.name, ' ', entry.provisional ? h('span', { class: 'tag quiet' }, 'Provisional') : null),
              kind === 'brewer'
                ? h(
                    'div',
                    { class: 'gear-meta' },
                    `Comfortable ${entry.comfortableG[0]} to ${entry.comfortableG[1]} g.`,
                    entry.provisional ? ' Nobody here has brew-tested this profile, and its tips are drafts.' : '',
                  )
                : null,
              h(
                'div',
                { class: 'btn-row' },
                h('button', { class: 'btn', type: 'button', onclick: () => app.addGear(kind, entry.id) }, `Add ${entry.shortName || entry.name}`),
              ),
            ),
          ),
        )
      : h('p', { class: 'note' }, `Every ${KIND_WORDS[kind]} in the catalog is already yours.`),
  );
}
