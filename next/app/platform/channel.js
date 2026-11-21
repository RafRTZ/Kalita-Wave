// Which copy of the app is running, and its version.
// The same files are served at /next/ (the test copy) and at the root (the live copy), so the channel is
// read from the URL instead of being baked into the code. That lets promote copy files unchanged.

// Bump this with every change the owner will test on a phone. Settings shows it.
export const APP_VERSION = '2.0.0-m1.8';

export const CHANNELS = Object.freeze({ NEXT: 'next', LIVE: 'live' });

/** 'next' when the path has a /next/ folder in it, otherwise 'live'. */
export function channelFromPath(pathname) {
  return /(^|\/)next(\/|$)/.test(String(pathname || '')) ? CHANNELS.NEXT : CHANNELS.LIVE;
}

export function currentChannel() {
  return channelFromPath(globalThis.location ? globalThis.location.pathname : '');
}

/** True when the app was opened from a Home Screen icon. */
export function isHomeScreenApp() {
  const nav = globalThis.navigator;
  if (nav && nav.standalone === true) return true;
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(display-mode: standalone)').matches;
}
