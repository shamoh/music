import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appFooterLinks, renderAppFooter, LICENSE_URL } from '../docs/js/app-footer.js';
import { APP_VERSION, BUILD_DATE } from '../docs/js/defaults.js';
import { fakeDocument, fakeContainer } from './helpers/fake-dom.js';

describe('appFooterLinks', () => {
  it('links the version to the history page', () => {
    const [versionLink] = appFooterLinks({ appVersion: '9.8.7', buildDate: '2030-01-02 03:04' });

    assert.deepEqual(versionLink, { href: '/history.html', text: 'Scales v9.8.7 · 2030-01-02 03:04' });
  });

  it('uses the current version and build date by default', () => {
    assert.equal(appFooterLinks()[0].text, `Scales v${APP_VERSION} · ${BUILD_DATE}`);
  });

  it('ends with the link to the license page inside the app', () => {
    assert.deepEqual(appFooterLinks().at(-1), { href: '/license.html', text: 'Licence FSL-1.1-MIT' });
    assert.equal(LICENSE_URL, '/license.html');
  });
});

describe('renderAppFooter', () => {
  it('renders the links separated by a dot', () => {
    const footer = fakeContainer();
    renderAppFooter(footer, { documentRef: fakeDocument() });

    assert.equal(footer.children.length, 3);
    assert.equal(footer.children[0].href, '/history.html');
    assert.equal(footer.children[1].text, ' · ');
    assert.equal(footer.children[2].href, LICENSE_URL);
  });

  it('does nothing without a footer element', () => {
    assert.doesNotThrow(() => renderAppFooter(null, { documentRef: fakeDocument() }));
  });

  it('renders a single link without a separator', () => {
    const footer = fakeContainer();
    renderAppFooter(footer, { documentRef: fakeDocument(), links: [{ href: '/a', text: 'A' }] });

    assert.equal(footer.children.length, 1);
    assert.equal(footer.children[0].tagName, 'a');
    assert.equal(footer.children[0].href, '/a');
    assert.equal(footer.children[0].textContent, 'A');
  });
});

describe('license page', () => {
  const unescapeHtml = (text) => text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

  it('shows the full text of the LICENSE file', () => {
    const page = readFileSync(new URL('../docs/license.html', import.meta.url), 'utf8');
    const licenseFile = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8');
    const [, shownText] = page.match(/<pre class="license-text" id="license-text">([\s\S]*?)<\/pre>/);

    assert.equal(unescapeHtml(shownText), licenseFile.trimEnd());
  });

  it('is cached by the service worker for offline use', () => {
    const serviceWorker = readFileSync(new URL('../docs/service-worker.js', import.meta.url), 'utf8');

    assert.match(serviceWorker, /'\/license\.html'/);
  });
});
