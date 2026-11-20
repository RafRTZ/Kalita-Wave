// Settings: timer and sound, units, the household's gear, and which copy of the app this is.

import { canRemove, catalogChoices, gearOf, profileOf } from '../data/household.js';
import { COUNT_IN_OPTIONS_S, HEADS_UP_OPTIONS_S } from '../engine/constants.js';
import { formatSetting, offsetInSteps } from '../engine/grind.js';
import { audioSessionSupported } from '../platform/audio.js';
import { h, segmented, sheetFrame } from './dom.js';
import { grinderName, plural } from './text.js';

const ON_OFF = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
];

function setting(title, control, help) {
  return h(
    'div',
    { class: 'setting' },
    h('div', { class: 'setting-title' }, title),
    control,
    help ? h('p', { class: 'setting-help' }, help) : null,
  );
}

function soundSection(app) {
  const s = app.state.settings;
  const seconds = (n) => ({ value: n, label: n === 0 ? 'None' : `${n} s` });
  return [
    h('div', { class: 'section-title' }, 'Timer and sound'),
    h(
      'section',
      { class: 'card pad' },
      setting(
        'Sound cues',
        segmented({ label: 'Sound cues', value: s.sound, options: ON_OFF, onChange: (v) => app.setSetting('sound', v) }),
        'A soft tone before each pour, then ticks, then a chime when it is time to pour. Every cue also shows on screen.',
      ),
      setting(
        'Play cues when the phone is on silent',
        segmented({ label: 'Play cues when the phone is on silent', value: s.playOnSilent, options: ON_OFF, onChange: (v) => app.setSetting('playOnSilent', v) }),
        audioSessionSupported()
          ? 'On: cues should play with the ringer switch on silent, but music or a podcast from another app may pause while the timer runs. Off: other audio keeps playing and the silent switch mutes the cues. Not yet confirmed on your phones.'
          : 'This browser gives a web app no say over the silent switch, so this setting does nothing here.',
      ),
      setting(
        'Heads-up before each pour',
        segmented({ label: 'Heads-up before each pour', value: s.headsUpS, options: HEADS_UP_OPTIONS_S.map(seconds), onChange: (v) => app.setSetting('headsUpS', v) }),
      ),
      setting(
        'Count-in before 0:00',
        segmented({ label: 'Count-in before 0:00', value: s.countInS, options: COUNT_IN_OPTIONS_S.map(seconds), onChange: (v) => app.setSetting('countInS', v) }),
        'Time to put the phone down and pick up the kettle.',
      ),
      setting(
        'Check the sound',
        h('button', { class: 'btn', type: 'button', onclick: () => app.testSound() }, 'Play the cue sounds'),
        "Plays the heads-up tone, three ticks, the pour chime, then the finish chime. Loudness follows the phone's volume buttons.",
      ),
    ),
    h(
      'p',
      { class: 'note' },
      'Limit of a web app: it cannot cue you when the phone is locked or another app is in front. Keep this app open and on screen while you brew.',
    ),
    h(
      'p',
      { class: 'note' },
      app.wake.supported
        ? 'The screen is kept awake from Start to Done.'
        : 'This phone will not keep the screen awake for a web app. If it sleeps mid-brew, raise Auto-Lock in the Settings app under Display & Brightness.',
    ),
  ];
}

function unitSection(app) {
  return [
    h('div', { class: 'section-title' }, 'Units'),
    h(
      'section',
      { class: 'card pad' },
      setting(
        'Show weights in',
        segmented({
          label: 'Weight unit',
          value: app.state.settings.unit,
          options: [
            { value: 'g', label: 'Grams' },
            { value: 'oz', label: 'Ounces' },
          ],
          onChange: (v) => app.setUnit(v),
        }),
        'Ounces is the safety net for a scale stuck in ounces: every target shows to one decimal.',
      ),
    ),
  ];
}

function useOrInUse(app, item) {
  return item.active
    ? h('span', { class: 'tag quiet' }, 'In use')
    : h('button', { class: 'btn', type: 'button', onclick: () => app.setActiveGear(item.id) }, 'Use this');
}

function removeButton(app, item, name) {
  if (!canRemove(app.state.household, item.id)) return null;
  return h(
    'button',
    {
      class: 'btn danger',
      type: 'button',
      onclick: () => {
        if (window.confirm(`Remove ${name} from your gear?`)) app.removeGear(item.id);
      },
    },
    'Remove',
  );
}

function brewerSection(app) {
  const household = app.state.household;
  const rows = gearOf(household, 'brewer').map((item) => {
    const b = profileOf(item);
    return h(
      'div',
      { class: 'gear-row' },
      h('div', { class: 'gear-name' }, b.name, ' ', b.provisional ? h('span', { class: 'tag quiet' }, 'Provisional') : null),
      h(
        'div',
        { class: 'gear-meta' },
        `Comfortable ${b.comfortableG[0]} to ${b.comfortableG[1]} g. Limits ${b.hardG[0]} to ${b.hardG[1]} g.`,
        b.provisional ? ' Nobody here has brew-tested this profile.' : '',
      ),
      h('div', { class: 'btn-row' }, useOrInUse(app, item), removeButton(app, item, b.name)),
    );
  });
  return [
    h('div', { class: 'section-title' }, 'Brewers'),
    h(
      'section',
      { class: 'card pad' },
      rows,
      catalogChoices(household, 'brewer').length
        ? h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn', type: 'button', onclick: () => app.openSheet('add-gear', { kind: 'brewer' }) }, 'Add a brewer'),
          )
        : null,
    ),
  ];
}

function calibrationLine(item, grinder) {
  const steps = offsetInSteps(item.offset, grinder);
  if (steps === 0) return 'Not calibrated: using the published starting point.';
  return `Calibrated to you: ${plural(Math.abs(steps), 'step')} ${steps > 0 ? 'coarser' : 'finer'} than the published starting point.`;
}

function grinderDetails(grinder) {
  const facts = grinder.facts || [];
  if (!grinder.tips.length && !facts.length) return null;
  return h(
    'details',
    { class: 'help-entry' },
    h('summary', {}, 'Tips and sources'),
    grinder.tips.length ? h('ul', {}, grinder.tips.map((tip) => h('li', {}, tip))) : null,
    facts.map((fact) =>
      h(
        'p',
        { class: 'source-line' },
        h('span', { class: 'tag quiet' }, fact.verified ? 'Verified' : 'Not verified'),
        ` ${fact.text} ${fact.note} `,
        fact.source_url ? h('a', { href: fact.source_url, target: '_blank', rel: 'noopener noreferrer' }, 'Source') : null,
      ),
    ),
  );
}

function grinderSection(app) {
  const household = app.state.household;
  const rows = gearOf(household, 'grinder').map((item) => {
    const g = profileOf(item);
    const name = grinderName(g);
    return h(
      'div',
      { class: 'gear-row' },
      h('div', { class: 'gear-name' }, name, ' ', g.custom ? h('span', { class: 'tag quiet' }, 'Custom') : null),
      h(
        'div',
        { class: 'gear-meta' },
        `Settings ${formatSetting(g, g.min)} to ${formatSetting(g, g.max)}, ${g.coarser === 'higher' ? 'higher' : 'lower'} is coarser. `,
        calibrationLine(item, g),
      ),
      h(
        'div',
        { class: 'btn-row' },
        useOrInUse(app, item),
        h('button', { class: 'btn', type: 'button', onclick: () => app.openSheet('calibrate', { grinderItemId: item.id }) }, 'Calibrate'),
        removeButton(app, item, name),
      ),
      grinderDetails(g),
    );
  });
  return [
    h('div', { class: 'section-title' }, 'Grinders'),
    h(
      'section',
      { class: 'card pad' },
      rows,
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => app.openSheet('custom-grinder') }, 'Add a custom grinder'),
      ),
    ),
  ];
}

function scaleSection(app) {
  const household = app.state.household;
  const rows = gearOf(household, 'scale').map((item) => {
    const s = profileOf(item);
    return h(
      'div',
      { class: 'gear-row' },
      h('div', { class: 'gear-name' }, s.name, ' ', s.verified ? null : h('span', { class: 'tag quiet' }, 'Not verified')),
      s.note ? h('div', { class: 'gear-meta' }, s.note) : null,
      item.note ? h('div', { class: 'gear-meta' }, `Our note: ${item.note}`) : null,
      h('div', { class: 'btn-row' }, removeButton(app, item, s.name)),
    );
  });
  return [
    h('div', { class: 'section-title' }, 'Scales'),
    h(
      'section',
      { class: 'card pad' },
      rows.length ? rows : h('p', { class: 'note' }, 'No scales yet.'),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => app.openSheet('scale-help') }, 'Scale help'),
        catalogChoices(household, 'scale').length
          ? h('button', { class: 'btn', type: 'button', onclick: () => app.openSheet('add-gear', { kind: 'scale' }) }, 'Add a scale')
          : null,
      ),
    ),
  ];
}

function aboutSection(app) {
  const next = app.channel === 'next';
  return [
    h('div', { class: 'section-title' }, 'About this copy'),
    h(
      'section',
      { class: 'card pad' },
      h(
        'ul',
        { class: 'about-list' },
        h('li', {}, `Version ${app.version}`),
        h('li', {}, next ? 'Test copy (next). Changes land here first.' : 'Live copy.'),
        h('li', {}, app.homeScreen ? 'Opened from the Home Screen.' : 'Opened in the browser, not from the Home Screen.'),
        h('li', {}, app.store.persistent ? 'Settings and gear are saved on this phone.' : 'This browser is not saving data, so settings reset when the app closes.'),
      ),
      h(
        'div',
        { class: 'btn-row' },
        next ? h('a', { class: 'btn', href: 'audio-test.html' }, 'Sound test page') : null,
        h('a', { class: 'btn', href: next ? '../classic.html' : 'classic.html' }, 'Original calculator'),
      ),
    ),
  ];
}

export function settingsSheet(app) {
  return sheetFrame(
    { title: 'Settings', closeLabel: 'Done', onClose: () => app.closeSheet() },
    soundSection(app),
    unitSection(app),
    brewerSection(app),
    grinderSection(app),
    scaleSection(app),
    aboutSection(app),
  );
}
