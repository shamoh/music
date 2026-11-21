import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  navLabelParts, initScaleNavigation, initFilterToggle, filtersWrapped, inactiveFilterCount,
  savedLastScaleId, saveLastScaleId, appendScaleOptionGroup,
} from '../docs/js/scale-nav.js';
import { memoryStorage, blockedStorage, fakeContainer, fakeDocument, fakeEventTarget } from './helpers/fake-dom.js';
import { SCALE_CATALOG } from '../docs/js/music.js';

const byId = (id) => SCALE_CATALOG.find((s) => s.id === id);
const labels = { scaleLabel: (s) => s.id, groupLabel: (type) => type.toUpperCase() };

describe('navLabelParts', () => {
  it('a scale of the same group: arrow and name', () => {
    const prev = navLabelParts({ target: byId('G-major'), current: byId('C-major'), side: 'prev', ...labels });
    assert.deepEqual(prev, [{ text: '‹ ' }, { text: 'G-major' }]);
    const next = navLabelParts({ target: byId('F-major'), current: byId('C-major'), side: 'next', ...labels });
    assert.deepEqual(next, [{ text: 'F-major' }, { text: ' ›' }]);
  });
  it('a scale of another group gets the group name as a tag', () => {
    const next = navLabelParts({ target: byId('ais-minor'), current: byId('Ces-major'), side: 'next', ...labels });
    assert.deepEqual(next, [{ text: 'MINOR', group: true }, { text: ' ' }, { text: 'ais-minor' }, { text: ' ›' }]);
  });
  it('no tag without a current scale', () => {
    const prev = navLabelParts({ target: byId('C-major'), current: null, side: 'prev', ...labels });
    assert.deepEqual(prev, [{ text: '‹ ' }, { text: 'C-major' }]);
  });
});

// Stand-ins: a document taking key presses (Shift held) and a heading root collecting clicks
function fakeKeyDocument() {
  const doc = fakeDocument();
  doc.press = (key, extra = {}) => {
    const event = { key, shiftKey: true, prevented: false, preventDefault() { event.prevented = true; }, target: null, ...extra };
    doc.dispatch('keydown', event);

    return event;
  };

  return doc;
}

function fakeHeading() {
  let onClick = null;
  const root = { addEventListener: (type, fn) => { onClick = fn; } };
  const click = (step, mods = {}) => {
    const link = { dataset: { step: String(step) } };
    const event = { target: { closest: (sel) => (sel === 'a[data-step]' ? link : null) }, prevented: false, preventDefault() { event.prevented = true; }, ...mods };
    onClick(event);
    return event;
  };

  return { heading: { root }, click };
}

function setup({ withVariants = true } = {}) {
  const doc = fakeKeyDocument();
  const { heading, click } = fakeHeading();
  const steps = [];
  initScaleNavigation({
    heading,
    doc,
    onScaleStep: (step) => steps.push(['scale', step]),
    onVariantStep: withVariants ? (step) => steps.push(['variant', step]) : null,
  });

  return { doc, click, steps };
}

describe('initScaleNavigation', () => {
  it('Shift+arrows step through scales and variants', () => {
    const { doc, steps } = setup();
    assert.equal(doc.press('ArrowRight').prevented, true);
    doc.press('ArrowLeft');
    doc.press('ArrowDown');
    doc.press('ArrowUp');
    assert.deepEqual(steps, [['scale', 1], ['scale', -1], ['variant', 1], ['variant', -1]]);
  });
  it('leaves plain arrows and form fields alone', () => {
    const { doc, steps } = setup();
    assert.equal(doc.press('ArrowRight', { shiftKey: false }).prevented, false);
    doc.press('ArrowRight', { target: { closest: () => ({}) } });
    assert.deepEqual(steps, []);
  });
  it('without variants Shift+↑ / ↓ stay with the browser', () => {
    const { doc, steps } = setup({ withVariants: false });
    assert.equal(doc.press('ArrowDown').prevented, false);
    assert.deepEqual(steps, []);
  });
  it('the ‹ / › links switch the scale; with a modifier they open as a link', () => {
    const { click, steps } = setup();
    assert.equal(click(-1).prevented, true);
    assert.equal(click(1, { metaKey: true }).prevented, false);
    assert.deepEqual(steps, [['scale', -1]]);
  });
});

describe('filtersWrapped', () => {
  it('filters on the heading line fit', () => {
    assert.equal(filtersWrapped({ top: 10, bottom: 40 }, { top: 12, bottom: 38 }), false);
  });
  it('filters below the heading line wrapped', () => {
    assert.equal(filtersWrapped({ top: 10, bottom: 40 }, { top: 44, bottom: 70 }), true);
    assert.equal(filtersWrapped({ top: 10, bottom: 40 }, { top: 39.5, bottom: 70 }), true);
  });
});

const chip = (active) => ({ classList: { contains: (c) => c === 'active' && active } });

describe('inactiveFilterCount', () => {
  it('counts the switched off chips', () => {
    assert.equal(inactiveFilterCount([chip(true), chip(false), chip(true), chip(false)]), 2);
    assert.equal(inactiveFilterCount([chip(true), chip(true)]), 0);
  });
});

describe('initFilterToggle', () => {
  // Stand-ins: a row with the toggle and chips, a document and a window collecting listeners
  function setup({ withToggle = true, chips = [chip(true), chip(false)], onEnableAllFilters = null } = {}) {
    const classes = new Set(['filters-collapsed']);
    const element = (extra = {}) => fakeEventTarget({
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      ...extra,
    });
    const toggle = element({ inserted: [], lastElementChild: {}, insertBefore(node) { this.inserted.push(node); } });
    const reset = element({ hidden: true });
    const row = {
      classList: {
        contains: (c) => classes.has(c),
        toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      },
      querySelector: (sel) => {
        if (sel === '.scale-nav-filters-toggle') return withToggle ? toggle : null;
        return sel === '.scale-nav-filters-reset' ? reset : null;
      },
      querySelectorAll: () => chips,
    };
    const doc = element({ getElementById: () => null, createElement: () => ({}) });
    const win = element();
    initFilterToggle(row, { doc, win, onEnableAllFilters });
    const target = (inside) => ({ closest: () => (inside ? {} : null) });
    const escape = () => {
      const event = { key: 'Escape', stopped: false, stopPropagation() { event.stopped = true; } };
      win.dispatch('keydown', event);
      return event;
    };

    return {
      isOpen: () => classes.has('filters-open'),
      clickToggle: () => toggle.click(),
      clickPage: (inside) => doc.click({ target: target(inside) }),
      escape,
      toggle,
      reset,
    };
  }

  it('the toggle opens and closes the filters', () => {
    const page = setup();
    page.clickToggle();
    assert.equal(page.isOpen(), true);
    assert.equal(page.toggle.attributes['aria-expanded'], 'true');
    page.clickToggle();
    assert.equal(page.isOpen(), false);
    assert.equal(page.toggle.attributes['aria-expanded'], 'false');
  });
  it('a click outside the filters closes them, a click on a filter keeps them open', () => {
    const page = setup();
    page.clickToggle();
    page.clickPage(true);
    assert.equal(page.isOpen(), true);
    page.clickPage(false);
    assert.equal(page.isOpen(), false);
  });
  it('Escape closes open filters and goes no further; closed filters leave it alone', () => {
    const page = setup();
    assert.equal(page.escape().stopped, false);
    page.clickToggle();
    assert.equal(page.escape().stopped, true);
    assert.equal(page.isOpen(), false);
  });
  it('the toggle shows the number of switched off filters', () => {
    const page = setup({ chips: [chip(false), chip(true), chip(false)] });
    const badge = page.toggle.inserted[0];
    assert.equal(badge.textContent, '2');
    assert.equal(badge.hidden, false);
    assert.equal(page.toggle.attributes['aria-label'], 'Filtry, vypnuté: 2');
  });
  it('no number while every filter is on', () => {
    const page = setup({ chips: [chip(true), chip(true)] });
    assert.equal(page.toggle.inserted[0].hidden, true);
    assert.equal(page.toggle.attributes['aria-label'], 'Filtry');
  });
  it('"Vše zapnout" is shown while a filter is off and enables all filters', () => {
    let calls = 0;
    const page = setup({ chips: [chip(false), chip(true)], onEnableAllFilters: () => { calls += 1; } });
    assert.equal(page.reset.hidden, false);
    page.reset.click();
    assert.equal(calls, 1);
  });
  it('"Vše zapnout" stays hidden while every filter is on or without the page callback', () => {
    assert.equal(setup({ chips: [chip(true)], onEnableAllFilters: () => {} }).reset.hidden, true);
    assert.equal(setup({ chips: [chip(false)] }).reset.hidden, true);
  });
  it('a row without the toggle is left alone', () => {
    assert.doesNotThrow(() => setup({ withToggle: false }));
  });
});

describe('last shown scale', () => {
  it('is remembered for both scale pages under one key', () => {
    const storage = memoryStorage();
    saveLastScaleId('A-minor', storage);

    assert.equal(savedLastScaleId(storage), 'A-minor');
    assert.deepEqual(storage.items, { 'scales-last-scale': 'A-minor' });
  });

  it('is null when nothing is stored or the storage fails', () => {
    assert.equal(savedLastScaleId(memoryStorage()), null);
    assert.equal(savedLastScaleId(blockedStorage()), null);
    assert.doesNotThrow(() => saveLastScaleId('C-major', blockedStorage()));
  });
});

describe('appendScaleOptionGroup', () => {
  const fakeSelect = () => fakeContainer();
  const documentRef = fakeDocument();
  const makeOption = (scale) => ({ value: scale.id });

  it('appends a labelled group with an option per scale', () => {
    const select = fakeSelect();
    appendScaleOptionGroup(select, 'Moll', [byId('a-minor'), byId('e-minor')], makeOption, documentRef);

    assert.equal(select.children.length, 1);
    assert.equal(select.children[0].tagName, 'optgroup');
    assert.equal(select.children[0].label, 'Moll');
    assert.deepEqual(select.children[0].children, [{ value: 'a-minor' }, { value: 'e-minor' }]);
  });

  it('appends nothing for no scales', () => {
    const select = fakeSelect();
    appendScaleOptionGroup(select, 'Moll', [], makeOption, documentRef);

    assert.equal(select.children.length, 0);
  });
});
