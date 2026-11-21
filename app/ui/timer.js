// The timer: Get ready, Running, Paused, and Done. See docs/BUILD_BRIEF.md section 5.3.
// sync() rebuilds the screen when the run changes state. update() runs many times a second and only
// touches what changed. Every sound cue has a visual twin here: the countdown number and the colour fill
// on the "next" strip, then a flash when the step starts. Each row of the step list is shaded from left to
// right as its time runs, so the list shows at a glance how far the brew has come.
// The screen fits one phone screen with no scrolling: the step list gives up height first.
// The lower part (the step list with the link to the brewer's tips, and the buttons) is built and placed
// exactly as on the brew screen, and the list is given the height it had there, so a tap on Start
// replaces only the upper part (owner, 2026-11-21).

import { DRAIN, drainByClock } from '../engine/dialin.js';
import { formatSetting } from '../engine/grind.js';
import { PHASE, snapshot } from '../engine/timeline.js';
import { formatClock, formatDose, formatWeight } from '../engine/units.js';
import { h, segmented, setAttr, setText, toggleClass } from './dom.js';
import { lowerPart, topActions, usePlanHeight } from './parts.js';
import { stepLabel } from './text.js';

const DRAIN_OPTIONS = Object.freeze([
  { value: DRAIN.FAST, label: 'Too fast' },
  { value: DRAIN.OK, label: 'About right' },
  { value: DRAIN.SLOW, label: 'Too slow' },
]);

const CLOCK_SAYS = Object.freeze({ [DRAIN.FAST]: 'fast', [DRAIN.OK]: 'about right', [DRAIN.SLOW]: 'slow' });

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

function topBar(app, phaseNode) {
  return h('header', { class: 'timer-top' }, phaseNode, topActions(app));
}

/**
 * "How did it drain?" on the Done screen. One tap moves the grind one step for the next brew, or leaves
 * it where it is. The clock's own reading is marked as a suggestion and is never applied by itself, and
 * leaving the question unanswered changes nothing.
 */
function drainCard(app, run) {
  const { grinder, plan } = app.brewContext();
  if (!grinder || run.plan.grindSetting == null) return null;
  const answer = run.drain ? run.drain.answer : null;
  const clock = run.autoEnded ? null : drainByClock(run.plan.totalS, run.actualS);

  const choices = segmented({
    label: 'How did it drain?',
    extraClass: 'drain-seg',
    value: answer,
    options: DRAIN_OPTIONS,
    onChange: (value) => app.answerDrain(value),
  });
  if (!answer && clock) choices.children[DRAIN_OPTIONS.findIndex((option) => option.value === clock)].classList.add('suggested');

  let hint = 'Pick one, or skip it.';
  if (answer) hint = 'Tap another to change your answer.';
  else if (clock) hint = `The clock says ${CLOCK_SAYS[clock]}. Tap to confirm, or pick another.`;

  const next = `${grinder.shortName} ${formatSetting(grinder, plan.grind.setting)}`;
  let result = null;
  if (answer === DRAIN.OK) result = `No change. Next time: ${next}.`;
  else if (answer && run.drain.atEnd) result = `${next} is the end of this grinder's range, so the grind stays there.`;
  else if (answer) result = `Next time: ${next}, one step ${answer === DRAIN.SLOW ? 'coarser' : 'finer'} than today.`;

  return h(
    'section',
    { class: 'card drain', 'aria-label': 'How did it drain?' },
    h('h2', { class: 'drain-q' }, 'How did it drain?'),
    h('p', { class: 'note' }, hint),
    choices,
    result ? h('p', { class: 'drain-result', role: 'status' }, result) : null,
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
    h(
      'div',
      { class: 'done-body' },
      result,
      drainCard(app, run),
      h('p', { class: 'done-line quiet' }, `${summary.join(', ')}.`),
      h('p', { class: 'done-line quiet' }, `Recipe: ${plan.sourceName}. The target is a starting point.`),
    ),
    h(
      'div',
      { class: 'bottom-bar' },
      run.autoEnded ? null : h('button', { class: 'btn', type: 'button', onclick: () => app.reopen() }, 'Back to timer'),
      h('button', { class: 'btn primary grow', type: 'button', onclick: () => app.newBrew() }, 'New brew'),
    ),
  ];
}

// Styles are written only when they change, so sixty updates a second touch the page as little as possible.
const lastWritten = new WeakMap();

function changed(node, value) {
  if (lastWritten.get(node) === value) return false;
  lastWritten.set(node, value);
  return true;
}

/** A cue fill: 0 is empty, 1 is full width. */
function setFill(node, fraction) {
  const value = `scaleX(${fraction})`;
  if (changed(node, value)) node.style.transform = value;
}

/** The shading on a step row: a width such as "37.50%", or nothing for an empty or a finished row. */
function setShade(row, width) {
  if (!changed(row, width)) return;
  if (width) row.style.setProperty('--p', width);
  else row.style.removeProperty('--p');
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

    // What to pour now, with the count-in fill behind it.
    r.nowFill = h('div', { class: 'cue-fill' });
    r.nowLabel = h('div', { class: 'now-label' });
    r.nowPour = h('div', { class: 'now-pour' });
    r.nowTarget = h('div', { class: 'now-target' });
    r.nowMain = h(
      'div',
      { class: 'now-main', 'aria-live': 'polite' },
      r.nowFill,
      h('div', { class: 'now-body' }, r.nowLabel, r.nowPour, r.nowTarget),
    );

    // What comes next and how long until it. In the last seconds it fills and shows the countdown number.
    r.nextFill = h('div', { class: 'cue-fill' });
    r.nextLabel = h('span', { class: 'next-label' });
    r.nextIn = h('span', { class: 'next-in' });
    r.nextCount = h('span', { class: 'next-count', 'aria-hidden': 'true' });
    r.nowCard = h(
      'section',
      { class: 'now-card', 'data-flash': 'false' },
      r.nowMain,
      h('div', { class: 'next-strip' }, r.nextFill, r.nextLabel, r.nextIn, r.nextCount),
    );

    r.pause = h('button', { class: 'btn grow', type: 'button', onclick: () => app.togglePause() });
    r.done = h('button', { class: 'btn primary grow', type: 'button', hidden: true, onclick: () => app.done() }, 'Done');

    // The lower part is the same as on the brew screen. Only its buttons are this screen's own.
    const lower = lowerPart(app, { plan, unit, buttons: [holdToReset(app), r.pause, r.done] });
    r.rows = lower.rows;
    r.finishRow = lower.finish;
    r.plan = lower.plan;

    node.replaceChildren(
      // The upper part is this screen's own, and is what replaced the brew screen's at Start.
      h('div', { class: 'upper' }, topBar(app, r.phase), r.soundBar, r.wakeNote, h('div', { class: 'clock-block' }, r.clock, r.clockSub), r.nowCard),
      lower.node,
    );
    refs = r;
    builtFor = 'active';
    fit();
  }

  /**
   * Give the pour plan the height it had on the brew screen, if there is one for this screen size. While
   * it holds that height the screen is marked "held", and the stylesheet lets the upper part pack tighter
   * to make room for it. Called again when the screen changes size.
   */
  function fit() {
    const held = builtFor === 'active' && refs ? usePlanHeight(refs.plan) : false;
    node.classList.toggle('held', held);
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
      fit();
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
    setText(r.nowLabel, drained ? 'Tap Done when the bed is dry' : counting ? `First: ${stepLabel(current)}` : stepLabel(current));
    setText(r.nowPour, drained ? '' : 'Pour to');
    setText(r.nowTarget, drained ? 'Let it drain' : formatWeight(current.targetG, unit));
    toggleClass(r.nowTarget, 'words', drained);
    setAttr(r.nowCard, 'data-flash', String(!paused && (snap.flash || snap.targetFlash)));
    setFill(r.nowFill, counting ? snap.fill : 0);

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
    if (r.nextIn.hidden !== cueing) r.nextIn.hidden = cueing;
    setFill(r.nextFill, cueing ? snap.fill : 0);

    // The step list: a finished row is fully shaded and dimmed, and the shading moves across the current
    // row as its time runs.
    r.rows.forEach((row, i) => {
      const p = snap.progress[i];
      toggleClass(row, 'is-done', p >= 1);
      toggleClass(row, 'is-now', i === snap.stepIndex && p < 1);
      setShade(row, p > 0 && p < 1 ? `${(p * 100).toFixed(2)}%` : '');
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

  return { node, sync, update, fit };
}
