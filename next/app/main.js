// The app: loads what is saved on the phone, shows the brew screen or the timer, and carries out every
// action the screens ask for. Screens never touch storage, audio, or the wake lock themselves.

import {
  activeItem,
  addCustomGrinder as addCustomGrinderTo,
  addFromCatalog,
  findItem,
  gearOf,
  profileOf,
  removeGear as removeGearFrom,
  setActive,
  setNote,
  setOffset,
} from './data/household.js';
import {
  addBrew,
  brewRecord,
  loadAll,
  removeBrew,
  saveBrews,
  saveHouse,
  saveHousehold,
  saveRun,
  saveSettings,
  setBrewDrain,
} from './data/local.js';
import { DOSE_MAX_G, DOSE_MIN_G, HOUSE_RECIPE } from './engine/constants.js';
import { isDrain, offsetAfterDrain } from './engine/dialin.js';
import { formatSetting, nudgeOffset } from './engine/grind.js';
import { planBrew } from './engine/plan.js';
import {
  autoEndRun,
  createRun,
  cueSchedule,
  elapsedS,
  finishRun,
  isExpired,
  pauseRun,
  PHASE,
  phaseOf,
  reopenRun,
  resumeRun,
  shouldAutoEnd,
  snapshot,
} from './engine/timeline.js';
import { createCuePlayer, sessionTypeFor, setSessionType } from './platform/audio.js';
import { APP_VERSION, currentChannel, isHomeScreenApp } from './platform/channel.js';
import { createStore } from './platform/storage.js';
import { createWakeLock } from './platform/wakelock.js';
import { renderBrew } from './ui/brew.js';
import { addGearSheet, calibrateSheet, customGrinderSheet } from './ui/gear.js';
import { grindSheet } from './ui/grind.js';
import { scaleHelpSheet } from './ui/scale-help.js';
import { settingsSheet } from './ui/settings.js';
import { techniqueSheet } from './ui/technique.js';
import { createTimerView } from './ui/timer.js';

const channel = currentChannel();
const store = createStore(channel);
const audio = createCuePlayer();
const wake = createWakeLock();

const viewRoot = document.getElementById('view');
const sheetRoot = document.getElementById('sheet');

const state = { ...loadAll(store, Date.now()), sheets: [] };

const SHEETS = {
  settings: settingsSheet,
  'scale-help': scaleHelpSheet,
  technique: techniqueSheet,
  grind: grindSheet,
  calibrate: calibrateSheet,
  'custom-grinder': customGrinderSheet,
  'add-gear': addGearSheet,
};

let timerView = null;
let frame = null;
let unlocking = false;

// ---------- what the brew screen shows ----------

/** The recipe on screen. Milestone 1 has no beans, so it is always the house default. */
function currentCard() {
  return HOUSE_RECIPE;
}

/** The gear in use and the dose for it. */
function gearNow() {
  const brewers = gearOf(state.household, 'brewer').map((item) => ({ item, profile: profileOf(item) }));
  const brewerItem = activeItem(state.household, 'brewer');
  const brewer = profileOf(brewerItem);
  const grinderItem = activeItem(state.household, 'grinder');
  const grinder = profileOf(grinderItem);
  const doseG = state.settings.doseByBrewer[brewerItem.id] ?? brewer.defaultDoseG;
  return { brewers, brewerItem, brewer, grinderItem, grinder, doseG };
}

/** The brew for that gear, with the recipe's grind adjustment set to a given value. */
function planAt(gear, grindOffset) {
  return planBrew({
    card: currentCard(),
    brewer: gear.brewer,
    doseG: gear.doseG,
    grinder: gear.grinder,
    grinderOffset: gear.grinderItem ? gear.grinderItem.offset : 0,
    beanOffset: grindOffset,
    otherBrewers: gear.brewers.filter((b) => b.item.id !== gear.brewerItem.id).map((b) => b.profile),
  });
}

function brewContext() {
  const gear = gearNow();
  const plan = planAt(gear, state.house.grind_offset);
  // A grind that the last brew's answer changed: what it was, what it is now, and why.
  const change = state.house.grind_change;
  const grindChange =
    change && gear.grinder
      ? { drain: change.drain, was: planAt(gear, change.from_offset).grind.setting, now: plan.grind.setting }
      : null;
  return { ...gear, plan, grindChange, unit: state.settings.unit };
}

/** What a run remembers about its brew, so the timer never depends on later changes to settings or gear. */
function runPlan(c) {
  return {
    steps: c.plan.steps,
    totalS: c.plan.totalS,
    waterG: c.plan.waterG,
    doseG: c.plan.doseG,
    tempF: c.plan.tempF,
    brewerId: c.brewer.id,
    brewerName: c.brewer.name,
    sourceName: c.plan.sourceName,
    beanId: null,
    grinderName: c.grinder ? c.grinder.shortName : null,
    grindSetting: c.grinder ? c.plan.grind.setting : null,
    grindText: c.grinder ? formatSetting(c.grinder, c.plan.grind.setting) : null,
  };
}

// ---------- rendering ----------

function isActive(run, nowMs) {
  const phase = phaseOf(run, nowMs);
  return phase === PHASE.GET_READY || phase === PHASE.RUNNING;
}

function loop() {
  frame = null;
  const run = state.run;
  if (!run) return;
  const now = Date.now();
  if (shouldAutoEnd(run, now)) {
    endRun(autoEndRun(run, now));
    return;
  }
  if (timerView) timerView.update(snapshot(run, now));
  if (isActive(run, now)) frame = requestAnimationFrame(loop);
}

function startLoop() {
  if (frame == null) frame = requestAnimationFrame(loop);
}

function refreshTimer() {
  if (timerView && state.run) timerView.update(snapshot(state.run, Date.now()));
}

function renderView() {
  if (state.run) {
    if (!timerView) {
      timerView = createTimerView(app);
      viewRoot.replaceChildren(timerView.node);
      window.scrollTo(0, 0);
    }
    timerView.sync();
    startLoop();
  } else {
    timerView = null;
    viewRoot.replaceChildren(renderBrew(app));
  }
}

function renderSheet() {
  const top = state.sheets[state.sheets.length - 1];
  // While a sheet is open the screen underneath takes no taps and is skipped by screen readers.
  viewRoot.inert = Boolean(top);
  if (!top) {
    sheetRoot.hidden = true;
    sheetRoot.replaceChildren();
    document.body.classList.remove('sheet-open');
    return;
  }
  sheetRoot.hidden = false;
  document.body.classList.add('sheet-open');
  sheetRoot.replaceChildren(SHEETS[top.name](app, top.props));
}

function render() {
  renderView();
  renderSheet();
}

function openSheet(name, props = {}) {
  if (!SHEETS[name]) return;
  state.sheets.push({ name, props });
  renderSheet();
  sheetRoot.scrollTop = 0;
  const heading = sheetRoot.querySelector('h2');
  if (heading) heading.focus({ preventScroll: true });
}

function closeSheet() {
  state.sheets.pop();
  render();
}

// ---------- sound and screen ----------

audio.setProvider(() => {
  const run = state.run;
  if (!run || !state.settings.sound) return null;
  const now = Date.now();
  if (!isActive(run, now)) return null;
  return { cues: cueSchedule(run.plan, run), elapsedS: elapsedS(run, now) };
});
audio.onChange(refreshTimer);

/** Call inside a tap: picks the audio session, creates or wakes the AudioContext, and schedules the cues. */
function armSound() {
  if (!state.settings.sound || !audio.supported) return;
  setSessionType(sessionTypeFor(state.settings.playOnSilent));
  unlocking = true;
  audio.unlock().then(() => {
    unlocking = false;
    refreshTimer();
  });
}

/** True when a brew is running with sound switched on but the phone is not letting it play yet. */
function soundNeedsTap() {
  const run = state.run;
  if (!run || !state.settings.sound || !audio.supported || unlocking) return false;
  return isActive(run, Date.now()) && audio.state() !== 'running';
}

function testSound() {
  if (!audio.supported) return;
  setSessionType(sessionTypeFor(state.settings.playOnSilent));
  audio.unlock().then((running) => {
    if (!running) return;
    audio.playNow('headsup', 0);
    audio.playNow('tick', 1);
    audio.playNow('tick', 2);
    audio.playNow('tick', 3);
    audio.playNow('pour', 4);
    audio.playNow('finish', 6);
    // Hand the phone's audio back afterwards, unless a brew has started in the meantime.
    setTimeout(() => {
      if (!state.run) audio.release();
    }, 8500);
  });
}

// ---------- the run ----------

function setRun(run) {
  state.run = run;
  saveRun(store, run);
}

function start() {
  if (state.run) return;
  const run = createRun(runPlan(brewContext()), {
    nowMs: Date.now(),
    countInS: state.settings.countInS,
    headsUpS: state.settings.headsUpS,
  });
  setRun(run);
  // The message about a changed grind has done its job once the next brew starts.
  if (state.house.grind_change) setHouse({ ...state.house, grind_change: null });
  armSound();
  wake.acquire();
  renderView();
}

function togglePause() {
  const run = state.run;
  if (!run || run.doneAtMs != null) return;
  const now = Date.now();
  if (run.pausedAtMs == null) {
    setRun(pauseRun(run, now));
    audio.refresh();
  } else {
    setRun(resumeRun(run, now));
    armSound(); // re-applies the audio type too, in case the sound settings changed while paused
    wake.acquire();
  }
  renderView();
}

function endRun(finished) {
  setRun(finished);
  if (finished.actualS != null) {
    state.brews = addBrew(state.brews, brewRecord(finished, { grindSetting: finished.plan.grindSetting }));
    saveBrews(store, state.brews);
  }
  audio.release();
  wake.release();
  renderView();
}

function done() {
  const run = state.run;
  if (!run || run.doneAtMs != null) return;
  endRun(finishRun(run, Date.now()));
}

/** "Back to timer" on the Done screen, for a Done tapped by accident. */
function reopen() {
  const run = state.run;
  if (!run || run.doneAtMs == null) return;
  state.brews = removeBrew(state.brews, run.id);
  saveBrews(store, state.brews);
  // The brew is not over after all, so an answer to "How did it drain?" is taken back with its grind change.
  const { drain, ...unanswered } = run;
  if (drain) setHouse({ grind_offset: drain.fromOffset, grind_change: null });
  setRun(reopenRun(unanswered));
  armSound();
  wake.acquire();
  renderView();
}

/**
 * The answer to "How did it drain?" on the Done screen: fast, ok, or slow. Slow moves the grind one step
 * coarser for the next brew and fast one step finer, counted from the grind this brew was made with, so
 * a changed answer replaces the earlier one. Nothing moves until one of the three is tapped.
 */
function answerDrain(answer) {
  const run = state.run;
  if (!run || run.doneAtMs == null || !isDrain(answer)) return;
  const gear = gearNow();
  const fromOffset = run.drain ? run.drain.fromOffset : state.house.grind_offset;
  let offset = fromOffset;
  let atEnd = false;
  if (gear.grinder) {
    const wanted = offsetAfterDrain(fromOffset, gear.grinder, answer);
    // A step that cannot move the setting, at the end of the grinder's range, is not kept.
    if (planAt(gear, wanted).grind.setting !== planAt(gear, fromOffset).grind.setting) offset = wanted;
    else atEnd = wanted !== fromOffset;
  }
  setHouse({
    grind_offset: offset,
    grind_change:
      offset === fromOffset ? null : { brew_id: run.id, from_offset: fromOffset, drain: answer, changed_at: new Date().toISOString() },
  });
  setRun({ ...run, drain: { answer, fromOffset, atEnd } });
  state.brews = setBrewDrain(state.brews, run.id, answer);
  saveBrews(store, state.brews);
  renderView();
}

/** "Undo" beside the message about a changed grind: the grind goes back to what the last brew used. */
function undoGrindChange() {
  const change = state.house.grind_change;
  if (!change) return;
  setHouse({ grind_offset: change.from_offset, grind_change: null });
  render();
}

function clearRun() {
  setRun(null);
  audio.release();
  wake.release();
  renderView();
}

// ---------- brew screen actions ----------

function setBrewer(itemId) {
  state.household = setActive(state.household, itemId);
  saveHousehold(store, state.household);
  renderView();
}

function setDose(grams) {
  const c = brewContext();
  // An emptied box reads as 0: ignore it and put the last dose back.
  if (Number.isFinite(grams) && grams > 0) {
    const dose = Math.min(DOSE_MAX_G, Math.max(DOSE_MIN_G, Math.round(grams)));
    state.settings = { ...state.settings, doseByBrewer: { ...state.settings.doseByBrewer, [c.brewerItem.id]: dose } };
    saveSettings(store, state.settings);
  }
  renderView();
}

function stepDose(delta) {
  setDose(brewContext().doseG + delta);
}

function setHouse(house) {
  state.house = house;
  saveHouse(store, house);
}

/** A grind adjustment made by hand. It replaces whatever the last brew's answer changed, message included. */
function setHouseOffset(offset) {
  setHouse({ grind_offset: offset, grind_change: null });
}

/**
 * Finer (-1) or coarser (+1) for this recipe, from the grind page. A tap that cannot move the setting any
 * further is ignored.
 */
function nudgeGrind(coarserOrFiner) {
  const gear = gearNow();
  if (!gear.grinder) return;
  const previous = state.house.grind_offset;
  const wanted = nudgeOffset(previous, gear.grinder, coarserOrFiner);
  if (planAt(gear, wanted).grind.setting !== planAt(gear, previous).grind.setting) setHouseOffset(wanted);
  render();
}

function resetGrindNudge() {
  setHouseOffset(0);
  render();
}

function setUnit(unit) {
  state.settings = { ...state.settings, unit: unit === 'oz' ? 'oz' : 'g' };
  saveSettings(store, state.settings);
  render();
}

function setSetting(key, value) {
  state.settings = { ...state.settings, [key]: value };
  saveSettings(store, state.settings);
  // Sound settings changed in the middle of a brew take effect at once. The tap on the switch is what
  // lets the phone start audio, so this is the moment to do it.
  const brewing = Boolean(state.run) && isActive(state.run, Date.now());
  if (key === 'sound' && !value) audio.release();
  else if ((key === 'sound' || key === 'playOnSilent') && brewing) armSound();
  render();
}

// ---------- gear actions ----------

function saveCalibration(grinderItemId, offset) {
  state.household = setOffset(state.household, grinderItemId, offset);
  saveHousehold(store, state.household);
  skipCalibration();
}

/** Marks the one-time question as asked, whether it was answered or skipped. */
function skipCalibration() {
  if (!state.settings.calibrationAsked) {
    state.settings = { ...state.settings, calibrationAsked: true };
    saveSettings(store, state.settings);
  }
  closeSheet();
}

function setActiveGear(itemId) {
  const item = findItem(state.household, itemId);
  if (!item) return;
  state.household = setActive(state.household, itemId);
  saveHousehold(store, state.household);
  // The per-recipe adjustment is in the old grinder's numbers, so it does not carry to another grinder.
  if (item.kind === 'grinder') setHouseOffset(0);
  render();
}

function removeGear(itemId) {
  state.household = removeGearFrom(state.household, itemId);
  saveHousehold(store, state.household);
  render();
}

function addGear(kind, catalogId) {
  state.household = addFromCatalog(state.household, kind, catalogId);
  saveHousehold(store, state.household);
  closeSheet();
}

function addCustomGrinder(fields) {
  state.household = addCustomGrinderTo(state.household, fields);
  saveHousehold(store, state.household);
  closeSheet();
}

/** Saves a note without redrawing, so the note box keeps its place while it is being typed in. */
function setGearNote(itemId, note) {
  state.household = setNote(state.household, itemId, note);
  saveHousehold(store, state.household);
}

// ---------- coming back from the background ----------

function onVisible() {
  if (document.visibilityState !== 'visible') return;
  const run = state.run;
  if (!run) return;
  const now = Date.now();
  if (isExpired(run, now)) {
    clearRun();
    return;
  }
  if (run.doneAtMs != null) return;
  wake.acquire();
  // Whatever was scheduled before the switch is stale: rebuild it from where the clock is now.
  audio.resumeIfNeeded().then(() => {
    audio.refresh();
    refreshTimer();
  });
  refreshTimer();
  startLoop();
}

const app = {
  channel,
  version: APP_VERSION,
  homeScreen: isHomeScreenApp(),
  store,
  state,
  audio,
  wake,
  brewContext,
  soundNeedsTap,
  start,
  togglePause,
  done,
  reopen,
  reset: clearRun,
  newBrew: clearRun,
  setBrewer,
  setDose,
  stepDose,
  nudgeGrind,
  resetGrindNudge,
  answerDrain,
  undoGrindChange,
  setUnit,
  setSetting,
  openSheet,
  closeSheet,
  saveCalibration,
  skipCalibration,
  setActiveGear,
  removeGear,
  addGear,
  addCustomGrinder,
  setGearNote,
  testSound,
  enableSound: armSound,
};

function boot() {
  if (channel === 'next') {
    document.title = 'Kalita Wave (next)';
    const title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (title) title.setAttribute('content', 'Kalita Next');
  }
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) onVisible();
  });
  // A turned phone or a resized window: the timer's pour plan stops using a height noted at another size.
  window.addEventListener('resize', () => {
    if (timerView) timerView.fit();
  });
  render();
  if (state.run && state.run.doneAtMs == null) wake.acquire();
  if (!state.run && !state.settings.calibrationAsked) openSheet('calibrate', { first: true });
}

boot();
