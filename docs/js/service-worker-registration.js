// Registers the PWA service worker (offline support) — except on a local development
// host: there it would serve its cached files instead of the edited ones. A service
// worker installed there before is unregistered and its caches are deleted.

const DEV_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

export function isDevHost(hostname) {
  return DEV_HOSTNAMES.includes(hostname) || hostname.endsWith('.localhost');
}

// Returns what was done: 'registered', 'unregistered' (development host) or 'unsupported'.
export async function registerServiceWorker({ nav = globalThis.navigator, loc = globalThis.location, cacheStorage = globalThis.caches } = {}) {
  if (!nav?.serviceWorker) return 'unsupported';

  if (isDevHost(loc.hostname)) {
    try {
      const registrations = await nav.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const cacheNames = cacheStorage ? await cacheStorage.keys() : [];
      await Promise.all(cacheNames.map((name) => cacheStorage.delete(name)));
    } catch (_) {}

    return 'unregistered';
  }

  nav.serviceWorker.register('/service-worker.js').catch(() => {});

  return 'registered';
}
