import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { initSitePage } from '../docs/js/site-layout.js';
import { siteHeaderHtml } from '../docs/js/site-header.js';
import { SECTION_TINT_ROW } from '../docs/js/settings-menu.js';
import { fakeDocument, fakeContainer, fakeEventTarget, fakeSettingsMenu } from './helpers/fake-dom.js';

// Document with an empty header, footer, settings menu and profile select. themes.js works
// with the global document, so the tests install it as globalThis.document.
function fakePageDocument({ hasHeader = true, hasFooter = true } = {}) {
  const settingsContainer = { innerHTML: '' };
  const header = { innerHTML: '', querySelector: (selector) => (selector === '#settings-menu' ? settingsContainer : null) };
  const footer = fakeContainer();
  const { toggle, elements: settingsMenuElements } = fakeSettingsMenu();
  const profileSelect = fakeContainer(fakeEventTarget());
  const doc = fakeDocument({
    elements: {
      ...settingsMenuElements,
      ...(hasHeader ? { 'site-header': header } : {}),
      ...(hasFooter ? { 'app-footer': footer } : {}),
      'profile-select': profileSelect,
    },
  });

  return Object.assign(doc, { header, footer, settingsContainer, toggle, profileSelect });
}

// Analytics / service worker stand-ins counting their calls
function fakePageServices() {
  const calls = { analytics: 0, serviceWorker: 0 };

  return {
    calls,
    initAnalytics: () => { calls.analytics += 1; },
    registerServiceWorker: () => { calls.serviceWorker += 1; },
  };
}

function initFakePage(options = {}, documentOptions = {}) {
  const doc = fakePageDocument(documentOptions);
  const pageServices = fakePageServices();
  globalThis.document = doc;
  initSitePage({ ...options, documentRef: doc, pageServices });

  return Object.assign(doc, { serviceCalls: pageServices.calls });
}

describe('initSitePage', () => {
  afterEach(() => { delete globalThis.document; });

  it('renders the header with the current section and the settings menu', () => {
    const doc = initFakePage({ currentSectionId: 'scales', settingsRows: [SECTION_TINT_ROW] });

    assert.equal(doc.header.innerHTML, siteHeaderHtml({ currentSectionId: 'scales' }));
    assert.match(doc.settingsContainer.innerHTML, /id="section-tint-select"/);
    assert.equal(doc.toggle.dataset.ready, '1');
  });

  it('renders no current section by default', () => {
    const doc = initFakePage();

    assert.equal(doc.header.innerHTML, siteHeaderHtml());
  });

  it('renders the footer with the version and license links', () => {
    const doc = initFakePage();

    assert.deepEqual(doc.footer.children.filter((child) => child.tagName === 'a').map((link) => link.href), ['/history.html', '/license.html']);
  });

  it('applies the visual profile', () => {
    const doc = initFakePage();

    assert.ok(doc.cssVariables['--bg']);
    assert.ok(doc.cssVariables['--font-scale']);
  });

  it('fills the profile select and calls onProfileChange after a change', () => {
    let profileChanges = 0;
    const doc = initFakePage({ onProfileChange: () => { profileChanges += 1; } });

    assert.deepEqual(doc.profileSelect.children.map((option) => option.value), ['auto', 'compact', 'large']);
    doc.profileSelect.dispatch('change', { target: { value: 'compact' } });
    assert.equal(profileChanges, 1);
    assert.equal(doc.cssVariables['--font-scale'], '1');
  });

  it('registers the service worker by default, without analytics', () => {
    const doc = initFakePage();

    assert.deepEqual(doc.serviceCalls, { analytics: 0, serviceWorker: 1 });
  });

  it('loads analytics on request', () => {
    assert.deepEqual(initFakePage({ analytics: true }).serviceCalls, { analytics: 1, serviceWorker: 1 });
  });

  it('leaves the service worker out on request', () => {
    assert.deepEqual(initFakePage({ offlineSupport: false }).serviceCalls, { analytics: 0, serviceWorker: 0 });
  });

  it('renders the footer even on a page without the header, and vice versa', () => {
    const withoutHeader = initFakePage({}, { hasHeader: false });
    assert.equal(withoutHeader.footer.children.length, 3);

    const withoutFooter = initFakePage({}, { hasFooter: false });
    assert.equal(withoutFooter.header.innerHTML, siteHeaderHtml());
  });
});
