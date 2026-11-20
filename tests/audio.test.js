// The cue player, run against a stand-in for the browser's audio so its logic can be checked on a Mac:
// cues are scheduled once and at the right moments, missed cues are dropped, and the phone's audio is let
// go of cleanly at the end of a brew. Whether anything is audible on an iPhone is a device check
// (docs/TESTING.md), not something these tests can show.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createCuePlayer, sessionTypeFor, setSessionType } from '../next/app/platform/audio.js';

class FakeParam {
  constructor() {
    this.value = 0;
  }
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeNode {
  connect(node) {
    return node;
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeOscillator extends FakeNode {
  constructor(context) {
    super();
    this.context = context;
    this.frequency = new FakeParam();
    this.type = 'sine';
    this.stops = [];
  }
  start(when) {
    this.startAt = when;
    this.context.oscillators.push(this);
  }
  stop(when) {
    this.stops.push(when);
  }
}

class FakeGain extends FakeNode {
  constructor() {
    super();
    this.gain = new FakeParam();
  }
}

class FakeAudioContext {
  static made = [];
  constructor() {
    this.state = 'suspended';
    this.currentTime = 100;
    this.sampleRate = 44100;
    this.destination = new FakeNode();
    this.oscillators = [];
    this.onstatechange = null;
    FakeAudioContext.made.push(this);
  }
  createOscillator() {
    return new FakeOscillator(this);
  }
  createGain() {
    return new FakeGain();
  }
  createBuffer() {
    return {};
  }
  createBufferSource() {
    const node = new FakeNode();
    node.start = () => {};
    return node;
  }
  resume() {
    this.state = 'running';
    if (this.onstatechange) this.onstatechange();
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    if (this.onstatechange) this.onstatechange();
    return Promise.resolve();
  }
}

// Sounds that have been scheduled and not silenced since (the player silences by calling stop() with no time).
const live = (context) => context.oscillators.filter((osc) => !osc.stops.includes(undefined));
const round = (n) => Math.round(n * 100) / 100;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withFakeAudio(run) {
  return async () => {
    const hadSession = Object.getOwnPropertyDescriptor(globalThis.navigator, 'audioSession');
    Object.defineProperty(globalThis.navigator, 'audioSession', { value: { type: 'auto' }, configurable: true, writable: true });
    globalThis.AudioContext = FakeAudioContext;
    FakeAudioContext.made = [];
    try {
      await run();
    } finally {
      delete globalThis.AudioContext;
      if (hadSession) Object.defineProperty(globalThis.navigator, 'audioSession', hadSession);
      else delete globalThis.navigator.audioSession;
    }
  };
}

const CUES = [
  { atS: 5, kind: 'tick' },
  { atS: 10, kind: 'pour' }, // a chime is two notes
  { atS: 20, kind: 'finish' }, // a double chime is four
];

test('the on-silent setting picks the audio type', () => {
  assert.equal(sessionTypeFor(true), 'playback');
  assert.equal(sessionTypeFor(false), 'ambient');
});

test('without browser audio the player says so and does nothing', async () => {
  const player = createCuePlayer();
  assert.equal(player.supported, false);
  assert.equal(player.state(), 'unsupported');
  assert.equal(await player.unlock(), false);
  player.release();
  player.close();
});

test('setting the audio type reports what is in force, or null when the phone has no such control', withFakeAudio(async () => {
  assert.equal(setSessionType('playback'), 'playback');
  assert.equal(globalThis.navigator.audioSession.type, 'playback');
  delete globalThis.navigator.audioSession;
  assert.equal(setSessionType('playback'), null);
}));

test('cues are scheduled once, at the right moments on the audio clock', withFakeAudio(async () => {
  const player = createCuePlayer();
  player.setProvider(() => ({ cues: CUES, elapsedS: 0 }));
  assert.equal(player.state(), 'none', 'no audio exists before the first tap');
  assert.equal(await player.unlock(), true);
  const [context] = FakeAudioContext.made;
  assert.equal(FakeAudioContext.made.length, 1);
  assert.equal(context.oscillators.length, 7, 'one tick, a two-note chime, a four-note finish: nothing twice');
  assert.deepEqual(context.oscillators.map((osc) => round(osc.startAt - 100)), [5.04, 10.04, 10.04, 20.04, 20.04, 20.46, 20.46]);
  assert.equal(player.scheduled(), 7);
}));

test('missed cues are dropped, and a cue a moment late plays at once', withFakeAudio(async () => {
  const player = createCuePlayer();
  player.setProvider(() => ({ cues: CUES, elapsedS: 10.2 })); // back from another app at 0:10.2
  await player.unlock();
  const [context] = FakeAudioContext.made;
  assert.deepEqual(context.oscillators.map((osc) => round(osc.startAt - 100)), [0.04, 0.04, 9.84, 9.84, 10.26, 10.26]);
}));

test('refresh throws the old schedule away before building the new one', withFakeAudio(async () => {
  const player = createCuePlayer();
  let elapsedS = 0;
  player.setProvider(() => ({ cues: CUES, elapsedS }));
  await player.unlock();
  const [context] = FakeAudioContext.made;
  elapsedS = 12;
  assert.equal(player.refresh(), 1, 'only the finish is still to come');
  assert.equal(live(context).length, 4);
  assert.deepEqual(live(context).map((osc) => round(osc.startAt - 100)), [8.04, 8.04, 8.46, 8.46]);
}));

test('pausing silences everything that was scheduled', withFakeAudio(async () => {
  const player = createCuePlayer();
  let paused = false;
  player.setProvider(() => (paused ? null : { cues: CUES, elapsedS: 0 }));
  await player.unlock();
  paused = true;
  assert.equal(player.refresh(), 0);
  assert.equal(live(FakeAudioContext.made[0]).length, 0);
  assert.equal(player.scheduled(), 0);
}));

test('a second tap while audio is already running rebuilds the schedule instead of doubling it', withFakeAudio(async () => {
  const player = createCuePlayer();
  player.setProvider(() => ({ cues: CUES, elapsedS: 0 }));
  await player.unlock();
  await player.unlock();
  const [context] = FakeAudioContext.made;
  assert.equal(FakeAudioContext.made.length, 1, 'the same audio is reused');
  assert.equal(live(context).length, 7);
}));

test('at the end of a brew the player switches to the music-friendly type, then closes the audio', withFakeAudio(async () => {
  const player = createCuePlayer();
  player.setProvider(() => ({ cues: CUES, elapsedS: 0 }));
  setSessionType('playback');
  await player.unlock();
  const [context] = FakeAudioContext.made;

  player.release(20);
  assert.equal(globalThis.navigator.audioSession.type, 'ambient', 'the type changes at once');
  assert.equal(live(context).length, 0, 'nothing is left scheduled');
  assert.equal(context.state, 'running', 'the audio stays open for a moment');
  await pause(60);
  assert.equal(context.state, 'closed');
  assert.equal(player.state(), 'none');
}));

test('starting a new brew before the old one has let go keeps the audio alive', withFakeAudio(async () => {
  const player = createCuePlayer();
  player.setProvider(() => ({ cues: CUES, elapsedS: 0 }));
  await player.unlock();
  const [context] = FakeAudioContext.made;

  player.release(30);
  setSessionType('playback'); // what the app does on the next Start tap
  assert.equal(await player.unlock(), true);
  await pause(80);
  assert.equal(context.state, 'running', 'the pending close was called off');
  assert.equal(FakeAudioContext.made.length, 1);
  assert.equal(live(context).length, 7, 'and the new brew has its cues');
  assert.equal(globalThis.navigator.audioSession.type, 'playback');
}));

test('closing at once also calls off a pending release, and the next tap gets fresh audio', withFakeAudio(async () => {
  const player = createCuePlayer();
  player.setProvider(() => ({ cues: CUES, elapsedS: 0 }));
  await player.unlock();
  player.release(20);
  player.close();
  assert.equal(FakeAudioContext.made[0].state, 'closed');
  await player.unlock();
  await pause(60);
  assert.equal(FakeAudioContext.made.length, 2);
  assert.equal(FakeAudioContext.made[1].state, 'running', 'the old timer did not close the new audio');
}));
