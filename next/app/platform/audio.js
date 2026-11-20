// Sound cues, scheduled on the Web Audio clock. See docs/BUILD_BRIEF.md section 5.3.
//
// iPhone rules this module follows:
// - The AudioContext is created inside a tap (call unlock() from the tap handler), never before.
// - Cues are scheduled on the audio clock, not with timers.
// - After the app comes back from the background the schedule is thrown away and rebuilt from the
//   wall-clock position, so nothing plays late and missed cues are never replayed.
//
// Whether cues are audible with the ringer switch on silent, and whether they stop other apps' audio,
// depends on navigator.audioSession.type. A Mac cannot show that; next/audio-test.html on a real iPhone can.
//
// Tried on the owner's iPhone on 2026-11-20 (ringer on silent, music playing; docs/DECISIONS.md):
//   playback                 heard, and the music stopped
//   auto, ambient, transient muted by the switch, music kept playing
//   transient-solo, play-and-record   muted by the switch, and the music stopped
// So no type is both heard on silent and friendly to other audio. The app uses 'playback' when the user
// wants cues on silent (the default) and 'ambient' when they would rather keep their music.
// Still to try: that 'ambient' cues are heard over music when the ringer is on.

export const SESSION_TYPES = Object.freeze(['auto', 'ambient', 'transient', 'transient-solo', 'playback', 'play-and-record']);

export const SESSION_FOR_SILENT_SWITCH = Object.freeze({ ignore: 'playback', obey: 'ambient' });

export function sessionTypeFor(playOnSilent) {
  return playOnSilent ? SESSION_FOR_SILENT_SWITCH.ignore : SESSION_FOR_SILENT_SWITCH.obey;
}

export function audioSessionSupported() {
  return typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession != null;
}

/** Ask for an audio session type. Returns the type now in force, or null when the phone has no such control. */
export function setSessionType(type) {
  if (!audioSessionSupported()) return null;
  try {
    navigator.audioSession.type = type;
    return navigator.audioSession.type;
  } catch {
    return null;
  }
}

const MASTER_GAIN = 0.9;
const LEAD_S = 0.04; // schedule slightly ahead so the first sample is never cut off
const LATE_OK_S = 0.3; // a cue this late still plays at once; anything older is a missed cue

// Each sound is a list of partials: when it starts (s), frequency (Hz), length (s), loudness, wave shape.
// The heads-up is soft and low, ticks are short and high, the pour chime is a two-note bell, and the
// finish is that bell twice, a little higher.
const SOUNDS = Object.freeze({
  headsup: [{ at: 0, freq: 660, dur: 0.34, gain: 0.22, type: 'sine' }],
  tick: [{ at: 0, freq: 1320, dur: 0.07, gain: 0.32, type: 'triangle' }],
  pour: [
    { at: 0, freq: 880, dur: 0.9, gain: 0.42, type: 'sine' },
    { at: 0, freq: 1320, dur: 0.6, gain: 0.2, type: 'sine' },
  ],
  finish: [
    { at: 0, freq: 1047, dur: 0.5, gain: 0.42, type: 'sine' },
    { at: 0, freq: 1568, dur: 0.35, gain: 0.2, type: 'sine' },
    { at: 0.42, freq: 1047, dur: 0.9, gain: 0.42, type: 'sine' },
    { at: 0.42, freq: 1568, dur: 0.6, gain: 0.2, type: 'sine' },
  ],
});

export const CUE_KINDS = Object.freeze(Object.keys(SOUNDS));

/**
 * The cue player. One per page.
 * setProvider(fn): fn() returns { cues: [{ atS, kind }], elapsedS } for the run in progress, or null when
 * nothing should play (no run, paused, done, sound off). The player calls it whenever it rebuilds the
 * schedule: after unlock(), after the audio comes back, and on refresh().
 */
export function createCuePlayer() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext || null;
  let ctx = null;
  let master = null;
  let provider = null;
  let built = false; // true once the schedule has been built for the current stretch of running audio
  const voices = new Set();
  const listeners = new Set();

  function state() {
    if (!Ctor) return 'unsupported';
    if (!ctx) return 'none';
    return ctx.state;
  }

  function emit() {
    for (const listener of listeners) listener(state());
  }

  function ensureContext() {
    if (!Ctor) return null;
    if (!ctx || ctx.state === 'closed') {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
      built = false;
      const mine = ctx;
      ctx.onstatechange = () => {
        if (mine !== ctx) return;
        if (ctx.state !== 'running') built = false;
        else if (!built) refresh();
        emit();
      };
    }
    return ctx;
  }

  function voice(partial, when) {
    const start = when + partial.at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = partial.type;
    osc.frequency.setValueAtTime(partial.freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(partial.gain, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + partial.dur);
    osc.connect(gain);
    gain.connect(master);
    const entry = { osc, gain };
    voices.add(entry);
    osc.onended = () => {
      voices.delete(entry);
      try {
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
    };
    osc.start(start);
    osc.stop(start + partial.dur + 0.05);
  }

  function playAt(kind, when) {
    const partials = SOUNDS[kind];
    if (!partials) return;
    for (const partial of partials) voice(partial, when);
  }

  /** Silence everything that is scheduled or sounding. */
  function cancel() {
    for (const { osc, gain } of voices) {
      osc.onended = null;
      try {
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
      try {
        osc.stop();
      } catch {
        /* never started */
      }
    }
    voices.clear();
  }

  /** Throw the schedule away and rebuild it from the provider. Returns how many cues were scheduled. */
  function refresh() {
    cancel();
    if (!ctx || ctx.state !== 'running') return 0;
    built = true;
    if (!provider) return 0;
    const now = provider();
    if (!now) return 0;
    const base = ctx.currentTime + LEAD_S;
    let count = 0;
    for (const cue of now.cues) {
      const inS = cue.atS - now.elapsedS;
      if (inS < -LATE_OK_S) continue;
      playAt(cue.kind, base + Math.max(0, inS));
      count++;
    }
    return count;
  }

  /**
   * Call inside a tap. Creates the AudioContext if needed and asks it to run. Resolves to true once the
   * context is running (the schedule is rebuilt at that moment).
   */
  function unlock() {
    const c = ensureContext();
    if (!c) return Promise.resolve(false);
    try {
      // One silent sample inside the gesture, which older iOS versions need before audio is allowed.
      const source = c.createBufferSource();
      source.buffer = c.createBuffer(1, 1, c.sampleRate);
      source.connect(c.destination);
      source.start(0);
    } catch {
      /* not needed on this browser */
    }
    const wasRunning = c.state === 'running';
    const running = wasRunning ? Promise.resolve() : c.resume();
    return Promise.resolve(running).then(
      () => {
        const ok = c === ctx && c.state === 'running';
        // When the context has just started, its statechange handler may already have built the
        // schedule. Build it here only if that has not happened, so no cue is ever scheduled twice.
        if (ok && (wasRunning || !built)) refresh();
        emit();
        return ok;
      },
      () => {
        emit();
        return false;
      },
    );
  }

  /** Try to bring a suspended or interrupted context back. May do nothing without a tap. */
  function resumeIfNeeded() {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return Promise.resolve(state() === 'running');
    return ctx.resume().then(
      () => state() === 'running',
      () => false,
    );
  }

  /** Play one cue sound now (Settings test button, sound test page). The context must be running. */
  function playNow(kind, delayS = 0) {
    if (!ctx || ctx.state !== 'running') return false;
    playAt(kind, ctx.currentTime + LEAD_S + delayS);
    return true;
  }

  /** Close the context so the phone's audio goes back to other apps. */
  function close() {
    cancel();
    const old = ctx;
    ctx = null;
    master = null;
    built = false;
    if (old && old.state !== 'closed') {
      old.onstatechange = null;
      old.close().catch(() => {});
    }
    emit();
  }

  return {
    supported: Boolean(Ctor),
    state,
    unlock,
    resumeIfNeeded,
    refresh,
    cancel,
    playNow,
    close,
    setProvider(fn) {
      provider = fn;
    },
    scheduled: () => voices.size,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
