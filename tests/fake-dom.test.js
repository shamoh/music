import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage, blockedStorage, fakeEventTarget, fakeContainer, fakeDocument, fakeSettingsMenu } from './helpers/fake-dom.js';

describe('test helpers: fake DOM', () => {
  it('memoryStorage keeps string values', () => {
    const storage = memoryStorage({ a: '1' });
    storage.setItem('b', 2);

    assert.equal(storage.getItem('a'), '1');
    assert.equal(storage.getItem('b'), '2');
    assert.equal(storage.getItem('missing'), null);
  });

  it('blockedStorage throws on every access', () => {
    assert.throws(() => blockedStorage().getItem('a'));
    assert.throws(() => blockedStorage().setItem('a', '1'));
  });

  it('fakeEventTarget dispatches to the listeners of one type', () => {
    const target = fakeEventTarget({ id: 'x' });
    const events = [];
    target.addEventListener('click', (event) => events.push(['click', event]));
    target.addEventListener('keydown', (event) => events.push(['keydown', event]));

    target.click({ n: 1 });
    target.dispatch('keydown', { key: 'Escape' });
    assert.deepEqual(events, [['click', { n: 1 }], ['keydown', { key: 'Escape' }]]);
    assert.equal(target.listenerCount('click'), 1);
    assert.equal(target.listenerCount('touchstart'), 0);
    assert.equal(target.id, 'x');
  });

  it('fakeDocument finds elements, creates containers and collects CSS variables', () => {
    const header = {};
    const doc = fakeDocument({ elements: { header } });
    doc.documentElement.style.setProperty('--bg', '#fff');
    const created = doc.createElement('a');
    created.appendChild(doc.createTextNode('A'));

    assert.equal(doc.getElementById('header'), header);
    assert.equal(doc.getElementById('missing'), null);
    assert.deepEqual(doc.cssVariables, { '--bg': '#fff' });
    assert.equal(created.tagName, 'a');
    assert.deepEqual(created.children, [{ text: 'A' }]);
    assert.deepEqual(fakeContainer({ tagName: 'div' }).children, []);
  });

  it('fakeSettingsMenu records the attributes and the focus of the gear button', () => {
    const { toggle, panel, elements } = fakeSettingsMenu();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.focus();

    assert.deepEqual(toggle.attrs, { 'aria-expanded': 'true' });
    assert.equal(toggle.focused, true);
    assert.equal(panel.hidden, true);
    assert.deepEqual(Object.keys(elements), ['settings-toggle', 'settings-panel']);
  });
});
