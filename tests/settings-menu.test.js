import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { settingsMenuHtml, renderSettingsMenu, initSettingsMenu, SETTINGS_MENU_LINKS, SECTION_TINT_ROW } from '../docs/js/settings-menu.js';
import { fakeDocument, fakeSettingsMenu } from './helpers/fake-dom.js';

// Document with the settings menu (or without it)
function fakeMenuDocument({ hasMenu = true } = {}) {
  const { toggle, panel, elements } = fakeSettingsMenu();

  return Object.assign(fakeDocument({ elements: hasMenu ? elements : {} }), { toggle, panel });
}

// Click event whose target is inside (or outside) the .settings container
const clickEvent = (insideMenu) => ({ target: { closest: (selector) => (selector === '.settings' && insideMenu ? {} : null) } });

describe('settingsMenuHtml', () => {
  it('renders the gear button controlling the hidden panel', () => {
    const html = settingsMenuHtml();

    assert.match(html, /^<button type="button" id="settings-toggle" class="settings-toggle" aria-label="Nastavení" aria-expanded="false" aria-controls="settings-panel"><svg /);
    assert.match(html, /<div id="settings-panel" class="settings-panel" hidden>/);
  });

  it('always has the appearance select', () => {
    assert.match(settingsMenuHtml(), /<label class="settings-row">Vzhled<select id="profile-select" class="profile-select"><\/select><\/label>/);
  });

  it('ends with the history and license links side by side', () => {
    assert.match(settingsMenuHtml(), /<div class="settings-links"><a class="settings-link" href="\/history\.html">Historie verzí<\/a><a class="settings-link" href="\/license\.html">Licence<\/a><\/div><\/div>$/);
    assert.deepEqual(SETTINGS_MENU_LINKS.map((link) => link.href), ['/history.html', '/license.html']);
  });

  it('adds page-specific rows below the appearance select', () => {
    const html = settingsMenuHtml({ extraRows: [SECTION_TINT_ROW] });
    const profileAt = html.indexOf('id="profile-select"');
    const tintAt = html.indexOf('id="section-tint-select"');

    assert.ok(profileAt > 0 && tintAt > profileAt);
    assert.match(html, /<label class="settings-row">Podbarvení rozsahu<select id="section-tint-select" class="profile-select"><\/select><\/label>/);
  });

  it('has no page-specific rows by default', () => {
    assert.ok(!settingsMenuHtml().includes('section-tint-select'));
  });
});

describe('renderSettingsMenu', () => {
  it('fills the container with the menu', () => {
    const container = { innerHTML: '' };
    renderSettingsMenu(container, { extraRows: [SECTION_TINT_ROW], documentRef: fakeMenuDocument() });

    assert.equal(container.innerHTML, settingsMenuHtml({ extraRows: [SECTION_TINT_ROW] }));
  });

  it('wires the rendered menu', () => {
    const doc = fakeMenuDocument();
    renderSettingsMenu({ innerHTML: '' }, { documentRef: doc });

    assert.equal(doc.toggle.dataset.ready, '1');
  });

  it('does nothing without a container', () => {
    assert.doesNotThrow(() => renderSettingsMenu(null));
  });
});

describe('initSettingsMenu', () => {
  it('opens and closes the panel with the gear button', () => {
    const doc = fakeMenuDocument();
    initSettingsMenu(doc);

    doc.toggle.click();
    assert.equal(doc.panel.hidden, false);
    assert.equal(doc.toggle.attrs['aria-expanded'], 'true');

    doc.toggle.click();
    assert.equal(doc.panel.hidden, true);
    assert.equal(doc.toggle.attrs['aria-expanded'], 'false');
  });

  it('closes on a click outside the menu, not inside it', () => {
    const doc = fakeMenuDocument();
    initSettingsMenu(doc);
    doc.toggle.click();

    doc.dispatch('click', clickEvent(true));
    assert.equal(doc.panel.hidden, false);

    doc.dispatch('click', clickEvent(false));
    assert.equal(doc.panel.hidden, true);
  });

  it('closes on Escape and returns the focus to the gear button', () => {
    const doc = fakeMenuDocument();
    initSettingsMenu(doc);
    doc.toggle.click();

    doc.dispatch('keydown', { key: 'ArrowLeft' });
    assert.equal(doc.panel.hidden, false);

    doc.dispatch('keydown', { key: 'Escape' });
    assert.equal(doc.panel.hidden, true);
    assert.equal(doc.toggle.focused, true);
  });

  it('leaves Escape alone while the menu is closed', () => {
    const doc = fakeMenuDocument();
    initSettingsMenu(doc);

    doc.dispatch('keydown', { key: 'Escape' });
    assert.equal(doc.toggle.focused, false);
  });

  it('wires the menu only once', () => {
    const doc = fakeMenuDocument();
    initSettingsMenu(doc);
    initSettingsMenu(doc);

    assert.equal(doc.listenerCount('click'), 1);
    assert.equal(doc.listenerCount('keydown'), 1);
    doc.toggle.click();
    assert.equal(doc.panel.hidden, false);
  });

  it('does nothing on a page without the menu', () => {
    const doc = fakeMenuDocument({ hasMenu: false });

    assert.doesNotThrow(() => initSettingsMenu(doc));
    assert.equal(doc.listenerCount('click'), 0);
  });
});
