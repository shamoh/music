import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { siteHeaderHtml, renderSiteHeader, SITE_SECTIONS } from '../docs/js/site-header.js';
import { SECTION_TINT_ROW } from '../docs/js/settings-menu.js';
import { fakeDocument, fakeSettingsMenu } from './helpers/fake-dom.js';

// Minimal stand-in for the header element: innerHTML + querySelector of the settings container
function fakeHeader() {
  const settingsContainer = { innerHTML: '' };

  return {
    innerHTML: '',
    settingsContainer,
    querySelector: (selector) => (selector === '#settings-menu' ? settingsContainer : null),
  };
}

// Document with the settings menu, enough for wiring it
function fakeMenuDocument() {
  const { toggle, elements } = fakeSettingsMenu();

  return Object.assign(fakeDocument({ elements }), { toggle });
}

describe('siteHeaderHtml', () => {
  it('starts with the logo linking to the home page', () => {
    assert.match(siteHeaderHtml(), /^<h1><a href="\/" class="bc-logo"><svg class="logo" viewBox="0 0 85 50" aria-hidden="true">/);
  });

  it('links all three sections in order on a page outside them', () => {
    const html = siteHeaderHtml();

    assert.ok(html.includes(
      '<a id="nav-theory-link" href="/" class="bc-link">Hudební nauka</a><span class="bc-sep" aria-hidden="true">|</span>'
      + '<a id="nav-scales-link" href="/scales/" class="bc-link">Stupnice</a><span class="bc-sep" aria-hidden="true">|</span>'
      + '<a id="nav-metronome-link" href="/metronome/" class="bc-link">Metronom</a></h1>',
    ));
    assert.ok(!html.includes('nav-current'));
  });

  it('shows the current section as text, not as a link', () => {
    for (const section of SITE_SECTIONS) {
      const html = siteHeaderHtml({ currentSectionId: section.id });

      assert.ok(html.includes(`<span class="nav-current">${section.label}</span>`), section.id);
      assert.ok(!html.includes(`id="nav-${section.id}-link"`), section.id);
      assert.equal((html.match(/class="bc-link"/g) ?? []).length, SITE_SECTIONS.length - 1, section.id);
    }
  });

  it('ends with the settings menu container', () => {
    assert.match(siteHeaderHtml(), /<\/h1><div class="settings" id="settings-menu"><\/div>$/);
  });
});

describe('renderSiteHeader', () => {
  it('fills the header and renders the settings menu into it', () => {
    const header = fakeHeader();
    const doc = fakeMenuDocument();
    renderSiteHeader(header, { currentSectionId: 'metronome', settingsRows: [SECTION_TINT_ROW], documentRef: doc });

    assert.equal(header.innerHTML, siteHeaderHtml({ currentSectionId: 'metronome' }));
    assert.match(header.settingsContainer.innerHTML, /id="section-tint-select"/);
    assert.equal(doc.toggle.dataset.ready, '1');
  });

  it('does nothing without a header element', () => {
    assert.doesNotThrow(() => renderSiteHeader(null));
  });
});
