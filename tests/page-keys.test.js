import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPageKey, initPageKeys, blurFocused, isFormField, activatesOnKey, isUndoKey, initUndoKey, navigationKey } from '../docs/js/page-keys.js';

// Minimal stand-in for document: the settings panel, a focused element, keydown listeners
function fakeDocument({ menuOpen = false, hasMenu = true, focused = null } = {}) {
  const listeners = [];

  return {
    activeElement: focused,
    getElementById: (id) => (id === 'settings-panel' && hasMenu ? { hidden: !menuOpen } : null),
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    press: (key, mods = {}) => listeners.filter((l) => l.type === 'keydown').forEach((l) => l.fn({ key, ...mods })),
    listeners,
  };
}

describe('isPageKey', () => {
  it('accepts plain keys while the settings menu is closed', () => {
    assert.equal(isPageKey({ key: 'Escape' }, fakeDocument()), true);
  });
  it('leaves keys to the open settings menu', () => {
    assert.equal(isPageKey({ key: 'Escape' }, fakeDocument({ menuOpen: true })), false);
  });
  it('leaves Alt / Ctrl / Cmd shortcuts to the browser', () => {
    for (const mod of ['altKey', 'ctrlKey', 'metaKey']) {
      assert.equal(isPageKey({ key: 'ArrowLeft', [mod]: true }, fakeDocument()), false, mod);
    }
  });
  it('works on a page without the settings menu', () => {
    assert.equal(isPageKey({ key: 'Escape' }, fakeDocument({ hasMenu: false })), true);
  });
});

describe('initPageKeys', () => {
  it('listens in the capture phase and passes only page keys', () => {
    const doc = fakeDocument();
    const keys = [];
    initPageKeys((e) => keys.push(e.key), doc);
    assert.equal(doc.listeners[0].capture, true);
    doc.press('Escape');
    doc.press('ArrowLeft', { metaKey: true });
    assert.deepEqual(keys, ['Escape']);
  });
});

describe('blurFocused', () => {
  const focused = (matches) => {
    const el = { blurred: false, closest: (sel) => (sel === matches ? el : null), blur: () => { el.blurred = true; } };
    return el;
  };

  it('blurs the focused element when it matches', () => {
    const el = focused('.note-chip');
    blurFocused('.note-chip', fakeDocument({ focused: el }));
    assert.equal(el.blurred, true);
  });
  it('keeps the focus on other elements', () => {
    const el = focused('select');
    blurFocused('.note-chip', fakeDocument({ focused: el }));
    assert.equal(el.blurred, false);
  });
  it('does nothing without a focused element', () => {
    assert.doesNotThrow(() => blurFocused('.note-chip', fakeDocument()));
  });
});

// Target that matches the given CSS selectors in its closest() (selector lists split on commas)
function fakeTarget(...matching) {
  return { closest: (sel) => (sel.split(',').map((x) => x.trim()).some((x) => matching.includes(x)) ? {} : null) };
}

describe('isFormField', () => {
  it('recognizes inputs, text areas, selects and editable content', () => {
    for (const sel of ['input', 'textarea', 'select', '[contenteditable="true"]']) assert.equal(isFormField(fakeTarget(sel)), true, sel);
  });
  it('does not count buttons or plain elements', () => {
    assert.equal(isFormField(fakeTarget('button')), false);
    assert.equal(isFormField(fakeTarget()), false);
  });
  it('handles a target without closest (document)', () => {
    assert.equal(isFormField({}), false);
    assert.equal(isFormField(null), false);
  });
});

describe('activatesOnKey', () => {
  it('covers buttons, links, focusable rows and form fields', () => {
    for (const sel of ['button', 'a[href]', '[tabindex]', 'input']) assert.equal(activatesOnKey(fakeTarget(sel)), true, sel);
  });
  it('leaves plain elements to the page', () => {
    assert.equal(activatesOnKey(fakeTarget()), false);
    assert.equal(activatesOnKey({}), false);
  });
});

describe('isUndoKey', () => {
  it('accepts Cmd+Z and Ctrl+Z', () => {
    assert.equal(isUndoKey({ key: 'z', metaKey: true }), true);
    assert.equal(isUndoKey({ key: 'z', ctrlKey: true }), true);
    assert.equal(isUndoKey({ key: 'Z', metaKey: true }), true);
  });
  it('rejects Z alone, Shift (redo) and Alt', () => {
    assert.equal(isUndoKey({ key: 'z' }), false);
    assert.equal(isUndoKey({ key: 'z', metaKey: true, shiftKey: true }), false);
    assert.equal(isUndoKey({ key: 'z', metaKey: true, altKey: true }), false);
  });
});

describe('initUndoKey', () => {
  const press = (doc, event) => doc.listeners.forEach((l) => l.fn({ target: fakeTarget(), ...event }));

  it('calls the handler on Cmd+Z', () => {
    const doc = fakeDocument();
    let calls = 0;
    initUndoKey(() => calls++, doc);
    press(doc, { key: 'z', metaKey: true });
    press(doc, { key: 'z' });
    assert.equal(calls, 1);
  });
  it('leaves Cmd+Z to form fields and to the open settings menu', () => {
    let calls = 0;
    const doc = fakeDocument();
    initUndoKey(() => calls++, doc);
    press(doc, { key: 'z', metaKey: true, target: fakeTarget('input') });
    const menuDoc = fakeDocument({ menuOpen: true });
    initUndoKey(() => calls++, menuDoc);
    press(menuDoc, { key: 'z', metaKey: true });
    assert.equal(calls, 0);
  });
});

describe('navigationKey', () => {
  it('Shift+← / Shift+→ step through the scales', () => {
    assert.deepEqual(navigationKey({ key: 'ArrowLeft', shiftKey: true }), { axis: 'scale', step: -1 });
    assert.deepEqual(navigationKey({ key: 'ArrowRight', shiftKey: true }), { axis: 'scale', step: 1 });
  });
  it('Shift+↑ / Shift+↓ step through the minor variants', () => {
    assert.deepEqual(navigationKey({ key: 'ArrowUp', shiftKey: true }), { axis: 'variant', step: -1 });
    assert.deepEqual(navigationKey({ key: 'ArrowDown', shiftKey: true }), { axis: 'variant', step: 1 });
  });
  it('ignores plain arrows (they move the selected note)', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) assert.equal(navigationKey({ key }), null, key);
  });
  it('ignores other keys with Shift', () => {
    assert.equal(navigationKey({ key: 'Home', shiftKey: true }), null);
    assert.equal(navigationKey({ key: 'A', shiftKey: true }), null);
  });
});
