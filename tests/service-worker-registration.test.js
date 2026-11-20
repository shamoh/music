import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDevHost, registerServiceWorker } from '../docs/js/service-worker-registration.js';

describe('isDevHost', () => {
  it('local development hosts', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', 'music.localhost']) assert.equal(isDevHost(host), true, host);
  });
  it('the published site and other hosts', () => {
    for (const host of ['music.kramolis.cz', 'localhost.example.com', '192.168.1.10']) assert.equal(isDevHost(host), false, host);
  });
});

// Stand-ins: navigator.serviceWorker with registrations, CacheStorage with cache names
function fakeBrowser({ registrations = 0, cacheNames = [] } = {}) {
  const calls = { registered: [], unregistered: 0, deletedCaches: [] };
  const serviceWorker = {
    register: (url) => { calls.registered.push(url); return Promise.resolve(); },
    getRegistrations: async () => Array.from({ length: registrations }, () => ({ unregister: async () => { calls.unregistered += 1; } })),
  };
  const cacheStorage = {
    keys: async () => cacheNames,
    delete: async (name) => { calls.deletedCaches.push(name); return true; },
  };

  return { nav: { serviceWorker }, cacheStorage, calls };
}

describe('registerServiceWorker', () => {
  it('registers the service worker on the published site', async () => {
    const browser = fakeBrowser();
    const result = await registerServiceWorker({ nav: browser.nav, loc: { hostname: 'music.kramolis.cz' }, cacheStorage: browser.cacheStorage });
    assert.equal(result, 'registered');
    assert.deepEqual(browser.calls.registered, ['/service-worker.js']);
  });
  it('on localhost it does not register, unregisters an older one and deletes its caches', async () => {
    const browser = fakeBrowser({ registrations: 2, cacheNames: ['scales-1.0.53', 'scales-1.0.54'] });
    const result = await registerServiceWorker({ nav: browser.nav, loc: { hostname: 'localhost' }, cacheStorage: browser.cacheStorage });
    assert.equal(result, 'unregistered');
    assert.deepEqual(browser.calls.registered, []);
    assert.equal(browser.calls.unregistered, 2);
    assert.deepEqual(browser.calls.deletedCaches, ['scales-1.0.53', 'scales-1.0.54']);
  });
  it('a failing cleanup on localhost does not throw', async () => {
    const nav = { serviceWorker: { getRegistrations: async () => { throw new Error('denied'); } } };
    assert.equal(await registerServiceWorker({ nav, loc: { hostname: '127.0.0.1' } }), 'unregistered');
  });
  it('a browser without service workers', async () => {
    assert.equal(await registerServiceWorker({ nav: {}, loc: { hostname: 'music.kramolis.cz' } }), 'unsupported');
  });
});
