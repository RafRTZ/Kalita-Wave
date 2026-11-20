// The timer: Get ready, Running, Paused, and Done. See docs/BUILD_BRIEF.md section 5.3.
// sync() rebuilds the screen when the run changes state. update() runs many times a second and only
// touches the numbers that changed. Every sound cue has a visual twin here: the countdown number and the
// colour fill on the card of the step that is about to start, then a flash when it starts.

import { PHASE, snapshot } from '../engine/timeline.js';
import { formatClock, formatDose, formatWeight } from '../engine/units.js';
import { h, segmented, setAttr, setText, toggleClass } from './dom.js';
import { stepLabel, UNIT_OPTIONS } from './text.js';

const HOLD_MS = 1000; // matches the transition in styles.css (.hold.holding .hold-fill)

function holdToReset(app) {
  let timer = null;
  const button = h(
    'button',
    { class: 'btn hold danger', type: 'button', 'aria-label': 'Reset. Press and hold for one second.' },
    h('span', { class: 'hold-fill' }),
    h('span', { class: 'hold-text' }, h('span', {}, 'Reset'), h('span', { class: 'hold-sub' }, 'hold 1 s')),
  );
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    button.classList.remove('holding');
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.button > 0) return;
    cancel();
    button.classList.add('holding');
    timer = setTimeout(() => {
      cancel();
      app.reset();
    }, HOLD_MS);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, cancel);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  // Keyboard has no "hold", so it gets a confirm instead.
  button.addEventListener('click', (event) => {
    if (event.detail === 0 && window.confirm('Reset this brew?')) app.reset();
  });
  return button;
}

function unitToggle(app) {
  return segmented({
    label: 'Weight unit',
    extraClass: 'tight',
    value: app.state.settings.unit,
    options: UNIT_OPTIONS,
    onChange: (unit) => app.setUnit(unit),
  });
}

function topBar(app, phaseNode) {
  return h(
    'header',
    { class: 'timer-top' },
    phaseNode,
    h(
      'div',
      { class: 'top-actions' },
      unitToggle(app),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Scale help', onclick: () => app.openSheet('scale-help') }, '?'),
    ),
  );
}

function doneScreen(app, run) {
  const { plan } = run;
  const unit = app.state.settings.unit;
  const summary = [`${formatDose(plan.doseG, unit)} on the ${plan.brewerName}`, `${formatWeight(plan.waterG, unit)} water`];
  if (plan.grindText) summary.push(`${plan.grinderName} ${plan.grindText}`);

  let result;
  if (run.autoEnded || run.actualS == null) {
    result = [h('p', { class: 'done-line' }, 'The timer stopped itself 10 minutes after the target. No time was recorded.')];
  } else {
    const delta = run.actualS - plan.totalS;
    const line =
      delta === 0
        ? 'Right on the target.'
        : `${formatClock(Math.abs(delta))} ${delta > 0 ? 'over' : 'under'} the target.`;
    result = [
      h(
        'div',
        { class: 'done-times' },
        h('div', { class: 'done-time' }, h('div', { class: 'k' }, 'Target'), h('div', { class: 'v' }, formatClock(plan.totalS))),
        h('div', { class: 'done-time' }, h('div', { class: 'k' }, 'Actual'), h('div', { class: 'v' }, formatClock(run.actualS))),
      ),
      h('p', { class: 'done-line' }, line),
    ];
  }

  return [
    topBar(app, h('div', { class: 'phase' }, 'Done')),
    result,
    h('p', { class: 'done-line quiet' }, `${summary.join(', ')}.`),
    h('p', { class: 'done-line quiet' }, `Recipe: ${plan.sourceName}. The target is a starting point.`),
    h(
      'div',
      { class: 'bottom-bar' },
      h(
        'div',
        { class: 'bar-inner' },
        run.autoEnded ? null : h('button', { class: 'btn', type: 'button', onclick: () => app.reopen() }, 'Back to timer'),
        h('button', { class: 'btn primary grow', type: 'button', onclick: () => app.newBrew() }, 'New brew'),
      ),
    ),
  ];
}

export function createTimerView(app) {
  const node = h('div', { class: 'screen timer' });
  let refs = null;
  let builtFor = null; // 'active' or 'done'

  function buildActive(run) {
    const { plan } = run;
    const unit = app.state.settings.unit;
    const r = {};
    r.phase = h('div', { class: 'phase', 'aria-live': 'polite' });
    r.soundBar = h(
      'button',
      { class: 'sound-bar', type: 'button', hidden: true, onclick: () => app.enableSound() },
      'Sound is off. Tap here to turn it back on.',
    );
    r.wakeNote = h(
      'p',
      { class: 'wake-note', hidden: true },
      'This phone will not keep the screen awake for a web app. If it sleeps mid-brew, raise Auto-Lock in the Settings app under Display & Brightness.',
    );
    r.clock = h('div', { class: 'clock', role: 'timer' });
    r.clockSub = h('div', { class: 'clock-sub' });

    r.nowFill = h('div', { class: 'cue-fill' });
    r.nowLabel = h('div', { class: 'now-label' });
    r.nowPour = h('div', { class: 'now-pour' });
    r.nowTarget = h('div', { class: 'now-target' });
    r.nowCard = h(
      'section',
      { class: 'now-card', 'aria-live': 'polite', 'data-flash': 'false' },
      r.nowFill,
      h('div', { class: 'now-body' }, r.nowLabel, r.nowPour, r.nowTarget),
    );

    r.nextFill = h('div', { class: 'cue-fill' });
    r.nextLabel = h('span', { class: 'next-label' });
    r.nextIn = h('span', { class: 'next-in' });
    r.nextCount = h('div', { class: 'next-count', 'aria-hidden': 'true' });
    r.nextCard = h('section', { class: 'next-card' }, r.nextFill, h('div', { class: 'next-text' }, r.nextLabel, r.nextIn), r.nextCount);

    r.rows = plan.steps.map((step) =>
      h(
        'li',
        { class: 'step-row' },
        h('span', { class: 't' }, formatClock(step.startS)),
        h('span', { class: 'name' }, stepLabel(step)),
        h('span', { class: 'g' }, `to ${formatWeight(step.targetG, unit)}`),
      ),
    );
    r.finishRow = h(
      'li',
      { class: 'step-row finish' },
      h('span', { class: 't' }, formatClock(plan.totalS)),
      h('span', { class: 'name' }, 'Finish'),
      h('span', { class: 'g' }, 'start here'),
    );

    r.pause = h('button', { class: 'btn grow', type: 'button', onclick: () => app.togglePause() });
    r.done = h('button', { class: 'btn primary grow', type: 'button', hidden: true, onclick: () => app.done() }, 'Done');

    node.replaceChildren(
      topBar(app, r.phase),
      r.soundBar,
      r.wakeNote,
      r.clock,
      r.clockSub,
      r.nowCard,
      r.nextCard,
      h('section', { class: 'card timer-steps', 'aria-label': 'Pour plan' }, h('ol', { class: 'steps' }, r.rows, r.finishRow)),
      h('div', { class: 'bottom-bar' }, h('div', { class: 'bar-inner' }, holdToReset(app), r.pause, r.done)),
    );
    refs = r;
    builtFor = 'active';
  }

  /** Rebuild for the current run and settings. Call after any change of state, unit, or sound. */
  function sync() {
    const run = app.state.run;
    if (!run) return;
    if (run.doneAtMs != null) {
      node.replaceChildren(...doneScreen(app, run).flat(Infinity).filter(Boolean));
      node.dataset.phase = PHASE.DONE;
      refs = null;
      builtFor = 'done';
      return;
    }
    buildActive(run);
    update(snapshot(run, Date.now()));
  }

  function update(snap) {
    const run = app.state.run;
    if (!run || builtFor !== 'active' || !refs) return;
    const r = refs;
    const { plan } = run;
    const unit = app.state.settings.unit;
    const counting = snap.elapsedS < 0;
    const paused = snap.phase === PHASE.PAUSED;

    node.dataset.phase = snap.phase;
    setText(r.phase, paused ? 'Paused' : counting ? 'Get ready' : snap.atTarget ? 'At target' : 'Brewing');

    // The clock: the count-in number, then elapsed time.
    setText(r.clock, counting ? String(snap.countdown) : formatClock(snap.elapsedS));
    setText(
      r.clockSub,
      counting ? 'Phone down, kettle up' : snap.atTarget ? `Target was ${formatClock(plan.totalS)}` : `Finish about ${formatClock(plan.totalS)}`,
    );

    // The step to pour now (during the count-in, the bloom that is about to start).
    const current = counting ? plan.steps[0] : snap.step;
    const drained = snap.atTarget;
    setText(r.nowLabel, drained ? 'Let it drain' : counting ? `First: ${stepLabel(current)}` : stepLabel(current));
    setText(r.nowPour, drained ? '' : 'Pour to');
    setText(r.nowTarget, drained ? 'Tap Done when the bed is dry' : formatWeight(current.targetG, unit));
    toggleClass(r.nowTarget, 'words', drained);
    setAttr(r.nowCard, 'data-flash', String(!paused && (snap.flash || snap.targetFlash)));
    r.nowFill.style.transform = `scaleX(${counting ? snap.fill : 0})`;

    // What comes next, and how long until it.
    const upcoming = counting ? plan.steps[1] ?? null : snap.nextStep;
    if (upcoming) {
      setText(r.nextLabel, `Next: ${stepLabel(upcoming)} to ${formatWeight(upcoming.targetG, unit)}`);
      setText(r.nextIn, counting ? `at ${formatClock(upcoming.startS)}` : `in ${formatClock(Math.ceil(snap.nextInS))}`);
    } else if (snap.atTarget) {
      setText(r.nextLabel, 'Past the target');
      setText(r.nextIn, `by ${formatClock(snap.overS)}`);
    } else {
      setText(r.nextLabel, `Next: finish at about ${formatClock(plan.totalS)}`);
      setText(r.nextIn, `in ${formatClock(Math.ceil(snap.nextInS))}`);
    }
    const cueing = !counting && snap.countdown != null;
    setText(r.nextCount, cueing ? String(snap.countdown) : '');
    r.nextFill.style.transform = `scaleX(${cueing ? snap.fill : 0})`;

    // The step list: finished rows dimmed, the current row highlighted.
    r.rows.forEach((row, i) => {
      toggleClass(row, 'is-done', i < snap.stepIndex || snap.atTarget);
      toggleClass(row, 'is-now', i === snap.stepIndex && !snap.atTarget);
    });
    toggleClass(r.finishRow, 'is-now', snap.atTarget);

    // Controls.
    setText(r.pause, paused ? 'Resume' : 'Pause');
    toggleClass(r.pause, 'primary', paused);
    if (r.done.hidden === snap.canFinish) r.done.hidden = !snap.canFinish;
    toggleClass(r.done, 'primary', !paused);

    const soundOff = app.soundNeedsTap();
    if (r.soundBar.hidden === soundOff) r.soundBar.hidden = !soundOff;
    const wakeMissing = !app.wake.supported;
    if (r.wakeNote.hidden === wakeMissing) r.wakeNote.hidden = !wakeMissing;
  }

  return { node, sync, update };
}
