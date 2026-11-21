// Screen wake lock: keeps the phone awake from Start to Done. See docs/BUILD_BRIEF.md section 5.3.
// Works in Home Screen web apps from iOS 18.4. Feature-detected; there is no hidden-video fallback.
// The phone drops the lock whenever the page is hidden, so it is asked for again when the page returns.
// NOT verified on a Mac: this must be checked on a real iPhone (docs/TESTING.md).

export function wakeLockSupported() {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock != null;
}

export function createWakeLock() {
  const supported = wakeLockSupported();
  let sentinel = null;
  let wanted = false;
  let pending = null;
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener(Boolean(sentinel));
  }

  function request() {
    if (!supported || !wanted || sentinel || pending) return pending || Promise.resolve(Boolean(sentinel));
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return Promise.resolve(false);
    pending = navigator.wakeLock
      .request('screen')
      .then(
        (lock) => {
          pending = null;
          if (!wanted) {
            lock.release().catch(() => {});
            return false;
          }
          sentinel = lock;
          lock.addEventListener('release', () => {
            if (sentinel === lock) sentinel = null;
            emit();
          });
          emit();
          return true;
        },
        () => {
          pending = null;
          return false;
        },
      );
    return pending;
  }

  /** Keep the screen awake until release() is called. Safe to call again and again. */
  function acquire() {
    wanted = true;
    return request();
  }

  function release() {
    wanted = false;
    const lock = sentinel;
    sentinel = null;
    if (lock) lock.release().catch(() => {});
    emit();
  }

  if (supported && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (wanted && document.visibilityState === 'visible') request();
    });
  }

  return {
    supported,
    acquire,
    release,
    held: () => Boolean(sentinel),
    wanted: () => wanted,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
