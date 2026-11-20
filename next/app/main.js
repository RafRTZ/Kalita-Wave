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
import { addBrew, brewRecord, loadAll, removeBrew, saveBrews, saveHouse, saveHousehold, saveRun, saveSettings } from './data/local.js';
import { DOSE_MAX_G, DOSE_MIN_G, HOUSE_RECIPE } from './engine/constants.js';
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
import { scaleHelpSheet } from './ui/scale-help.js';
import { settingsSheet } from './ui/settings.js';
import { createTimerView } from './ui/timer.js';

const channel = currentChannel();
const store = createStore(channel);
const audio = createCuePlayer();
const wake = createWakeLock();

const viewRoot = document.getElementById('view');
const sheetRoot = document.getElementById('sheet');

const state = { ...loadAll(store, Date.now()), sheets: [], ui: { tipsOpen: false } };

const SHEETS = {
  settings: settingsSheet,
  'scale-help': scaleHelpSheet,
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

function brewContext() {
  const brewers = gearOf(state.household, 'brewer').map((item) => ({ item, profile: profileOf(item) }));
  const brewerItem = activeItem(state.household, 'brewer');
  const brewer = profileOf(brewerItem);
  const grinderItem = activeItem(state.household, 'grinder');
  const grinder = profileOf(grinderItem);
  const doseG = state.settings.doseByBrewer[brewerItem.id] ?? brewer.defaultDoseG;
  const plan = planBrew({
    card: currentCard(),
    brewer,
    doseG,
    grinder,
    grinderOffset: grinderItem ? grinderItem.offset : 0,
    beanOffset: state.house.grind_offset,
    otherBrewers: brewers.filter((b) => b.item.id !== brewerItem.id).map((b) => b.profile),
  });
  return { brewers, brewerItem, brewer, grinderItem, grinder, doseG, plan, unit: state.settings.unit };
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
      if (!state.run) audio.close();
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
    if (audio.state() === 'running') audio.refresh();
    else armSound();
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
  audio.close();
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
  setRun(reopenRun(run));
  armSound();
  wake.acquire();
  renderView();
}

function clearRun() {
  setRun(null);
  audio.close();
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

function setHouseOffset(offset) {
  state.house = { ...state.house, grind_offset: offset };
  saveHouse(store, state.house);
}

/** Finer (-1) or coarser (+1) for this recipe. A tap that cannot move the setting any further is ignored. */
function nudgeGrind(coarserOrFiner) {
  const before = brewContext();
  if (!before.grinder) return;
  const previous = state.house.grind_offset;
  setHouseOffset(nudgeOffset(previous, before.grinder, coarserOrFiner));
  if (brewContext().plan.grind.setting === before.plan.grind.setting) setHouseOffset(previous);
  renderView();
}

function resetGrindNudge() {
  setHouseOffset(0);
  renderView();
}

function setUnit(unit) {
  state.settings = { ...state.settings, unit: unit === 'oz' ? 'oz' : 'g' };
  saveSettings(store, state.settings);
  render();
}

function setSetting(key, value) {
  state.settings = { ...state.settings, [key]: value };
  saveSettings(store, state.settings);
  if (key === 'sound' && !value) audio.close();
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
  render();
  if (state.run && state.run.doneAtMs == null) wake.acquire();
  if (!state.run && !state.settings.calibrationAsked) openSheet('calibrate', { first: true });
}

boot();
