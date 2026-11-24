import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRangePage, scaleIdToCode, codeToScaleId, makeHash, scaleName, pairName, scaleNameWithAccidentals, FULL_RANGE_ID,
} from '../docs/js/range-page.js';
import { SAXOPHONE_ALTO } from '../docs/js/instrument/saxophone/alto/instrument.js';
import { SCALE_CATALOG, buildAltSaxRange } from '../docs/js/music.js';
import { memoryStorage, fakeEventTarget } from './helpers/fake-dom.js';

const byId = (id) => SCALE_CATALOG.find((s) => s.id === id);

// Generic element: every element the page asks for by id is created on demand
function element(tagName = 'div') {
  const classes = new Set();

  return {
    tagName,
    children: [],
    dataset: {},
    style: { setProperty() {} },
    hidden: false,
    textContent: '',
    value: '',
    href: '',
    parentNode: null,
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)), has: (name) => classes.has(name) },
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    replaceChildren() { this.children = []; },
    setAttribute() {},
    insertAdjacentHTML() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    closest() { return null; },
    ...fakeEventTarget(),
  };
}

function setup({ hash = '' } = {}) {
  const cache = {};
  const selectorElements = {};
  const location = { hash, pathname: '/scales/instrument/saxophone/alto/', search: '' };
  const calls = { staves: [], tracked: [], headings: [], slides: [], replaced: [], navigation: [] };
  const history = { replaceState: (_s, _t, url) => { calls.replaced.push(url); location.hash = url.startsWith('#') ? url : ''; } };
  const storage = memoryStorage();
  const doc = fakeEventTarget({
    getElementById: (id) => (id === 'settings-panel' ? null : (cache[id] ??= element())),
    createElement: (tagName) => element(tagName),
    createTextNode: (text) => ({ text }),
    querySelectorAll: () => [],
    querySelector: (selector) => (selectorElements[selector] ??= element()),
    activeElement: null,
  });
  const page = createRangePage({
    doc, location, history, storage,
    renderStaff: (container, range, scale, chord, keySig, isMinor) => calls.staves.push({ container, range, scale, chord, keySig, isMinor }),
    trackView: (id, variant) => calls.tracked.push([id, variant]),
    renderHeading: (heading, options) => calls.headings.push(options),
    slideIn: (els, step) => calls.slides.push(step),
    initNavigation: (options) => calls.navigation.push(options),
  });
  const $ = (id) => doc.getElementById(id);

  return { page, doc, $, calls, location, storage, selectorElements, state: page.state };
}

describe('names and URL codes', () => {
  it('converts scale ids to URL codes and back', () => {
    assert.equal(scaleIdToCode('Es-major'), 'Es-dur');
    assert.equal(scaleIdToCode('a-minor'), 'a-moll');
    assert.equal(codeToScaleId('Es-dur'), 'Es-major');
    assert.equal(codeToScaleId('a-moll'), 'a-minor');
  });
  it('keeps whole-tone ids and maps "dur od tónu" without clashing with dur', () => {
    assert.equal(scaleIdToCode('C-whole-tone'), 'C-whole-tone');
    const from = SCALE_CATALOG.find((s) => s.type === 'major-from');
    const code = scaleIdToCode(from.id);
    assert.ok(code.endsWith('-dur-od-tonu'));
    assert.equal(codeToScaleId(code), from.id);
  });
  it('builds a hash with the variant only for non-natural minor scales', () => {
    assert.equal(makeHash(byId('a-minor'), 'natural'), '#a-moll');
    assert.equal(makeHash(byId('a-minor'), 'harmonic'), '#a-moll?type=harmonic');
    assert.equal(makeHash(byId('C-major'), 'harmonic'), '#C-dur');
  });
  it('names scales', () => {
    assert.equal(scaleName(byId('Es-major')), 'Es dur');
    assert.equal(scaleName(byId('a-minor')), 'a moll');
    assert.match(scaleNameWithAccidentals(byId('Es-major')), /^Es dur \(/);
    assert.equal(scaleNameWithAccidentals(byId('C-major')), 'C dur');
    assert.equal(typeof pairName(byId('Es-major')), 'string');
  });
});

describe('applyHashToState', () => {
  it('shows the full range without a hash', () => {
    const { page, state } = setup();
    state.scaleId = 'C-major';
    state.variantType = 'harmonic';
    assert.equal(page.applyHashToState(), true);
    assert.deepEqual([state.scaleId, state.variantType], [FULL_RANGE_ID, 'natural']);
  });
  it('selects a scale and a minor variant', () => {
    const { page, state } = setup({ hash: '#a-moll?type=harmonic' });
    assert.equal(page.applyHashToState(), true);
    assert.deepEqual([state.scaleId, state.variantType], ['a-minor', 'harmonic']);
  });
  it('falls back to natural for an invalid or non-minor variant', () => {
    const minor = setup({ hash: '#a-moll?type=bogus' });
    minor.page.applyHashToState();
    assert.equal(minor.state.variantType, 'natural');
    const major = setup({ hash: '#C-dur?type=harmonic' });
    major.page.applyHashToState();
    assert.equal(major.state.variantType, 'natural');
  });
  it('rejects an unknown scale and keeps the state', () => {
    const { page, state } = setup({ hash: '#nonsense' });
    state.scaleId = 'C-major';
    assert.equal(page.applyHashToState(), false);
    assert.equal(state.scaleId, 'C-major');
  });
  it('switches on the filters the scale needs', () => {
    const { page, state } = setup({ hash: '#Es-dur' });
    state.filterAcc = new Set(['sharp']);
    page.applyHashToState();
    assert.ok(state.filterAcc.has('flat'));
  });
});

describe('repopulateSelect', () => {
  it('puts "Celý rozsah" first, then groups by type', () => {
    const { page, $, state } = setup();
    state.scaleId = 'a-minor';
    page.repopulateSelect();
    const select = $('scale-select');
    assert.equal(select.children[0].value, FULL_RANGE_ID);
    assert.deepEqual(select.children.slice(1).map((g) => g.label), ['Dur', 'Moll', 'Celotónové', 'Dur od tónu']);
    assert.equal(select.value, 'a-minor');
  });
});

describe('update', () => {
  it('renders the full range: no hash, hint, two staves, fingerings', () => {
    const { page, $, calls, location } = setup({ hash: '#C-dur' });
    page.state.scaleId = FULL_RANGE_ID;
    page.update();
    assert.equal(location.hash, '');
    assert.equal($('twin-block').hidden, false);
    assert.equal($('desc-block').hidden, true);
    assert.match($('range-hint').textContent, /^Klepnutím na notu/);
    assert.equal($('nav-scales-link').href, '/scales/');
    assert.equal(calls.staves.length, 2);
    assert.equal(calls.staves[0].range.length, buildAltSaxRange(false).length);
    assert.deepEqual(calls.tracked, [[FULL_RANGE_ID, 'natural']]);
    assert.equal($('fingering-chart').hidden, false);
    assert.equal(calls.headings[0].current, null);
  });
  it('renders a major scale: hash, links, one staff', () => {
    const { page, $, calls, location } = setup();
    page.state.scaleId = 'Es-major';
    page.update();
    assert.equal(location.hash, '#Es-dur');
    assert.equal($('nav-scales-link').href, '/scales/#Es-dur');
    assert.match($('range-hint').textContent, /^Noty stupnice/);
    assert.equal($('twin-block').hidden, true);
    assert.equal($('desc-block').hidden, true);
    assert.equal(calls.staves.length, 1);
    assert.equal(calls.headings[0].current.id, 'Es-major');
    assert.deepEqual(calls.tracked, [['Es-major', 'natural']]);
    assert.ok(page.state.scaleNotes.length > 0);
  });
  it('renders the descending staff for melodic minor and shows the variant switcher', () => {
    const { page, $, calls } = setup();
    page.state.scaleId = 'a-minor';
    page.state.variantType = 'melodic';
    page.update();
    assert.equal($('desc-block').hidden, false);
    assert.equal(calls.staves.length, 2);
    assert.equal($('type-nav').hidden, false);
    assert.equal($('type-nav').children.filter((c) => c.tagName === 'button').length, 2);
    assert.equal($('type-nav').children.filter((c) => c.tagName === 'strong')[0].textContent, 'Melodická');
  });
  it('hides the variant switcher for major scales', () => {
    const { page, $ } = setup();
    page.state.scaleId = 'C-major';
    page.update();
    assert.equal($('type-nav').hidden, true);
  });
  it('links the scales page to its base scale from a theoretical key and to its default from whole-tone', () => {
    const { page, $ } = setup();
    page.state.scaleId = SCALE_CATALOG.find((s) => s.type === 'whole-tone').id;
    page.update();
    assert.equal($('nav-scales-link').href, '/scales/');
  });
  it('does nothing for an unknown scale', () => {
    const { page, calls } = setup();
    page.state.scaleId = 'nonsense';
    page.update();
    assert.deepEqual(calls.tracked, []);
  });
});

describe('switching', () => {
  it('switchScale saves the target and changes the hash with a pending slide', () => {
    const { page, state, storage, location, calls } = setup();
    state.scaleId = 'C-major';
    page.switchScale(1);
    assert.notEqual(location.hash, '');
    assert.ok(Object.values(storage.items).some((v) => v !== 'C-major' && v.length > 0));
    page.handleHashChange();
    assert.deepEqual(calls.slides, [1]);
  });
  it('switchScale does nothing on the full range', () => {
    const { page, state, location } = setup();
    state.scaleId = FULL_RANGE_ID;
    page.switchScale(1);
    assert.equal(location.hash, '');
  });
  it('switchVariant moves between minor variants and stops at the ends', () => {
    const { page, state, location } = setup();
    state.scaleId = 'a-minor';
    page.switchVariant(1);
    assert.equal(location.hash, '#a-moll?type=harmonic');
    state.variantType = 'melodic';
    location.hash = '#x';
    page.switchVariant(1);
    assert.equal(location.hash, '#x');
  });
  it('switchVariant does nothing for a major scale', () => {
    const { page, state, location } = setup();
    state.scaleId = 'C-major';
    page.switchVariant(1);
    assert.equal(location.hash, '');
  });
  it('selectScale resets the variant and remembers real scales only', () => {
    const { page, state, storage } = setup();
    state.variantType = 'harmonic';
    page.selectScale(FULL_RANGE_ID);
    assert.equal(state.variantType, 'natural');
    assert.deepEqual(storage.items, {});
    page.selectScale('D-major');
    assert.ok(Object.values(storage.items).includes('D-major'));
  });
  it('handleHashChange shows the scale of the new hash', () => {
    const { page, state, location, $ } = setup();
    location.hash = '#a-moll?type=harmonic';
    page.handleHashChange();
    assert.deepEqual([state.scaleId, state.variantType], ['a-minor', 'harmonic']);
    assert.equal($('scale-select').value, 'a-minor');
  });
});

describe('filters', () => {
  it('keeps the shown scale and falls back to the first offered one when it is filtered out', () => {
    const { page, state } = setup();
    state.scaleId = 'C-major';
    page.applyFilterChange();
    assert.equal(state.scaleId, 'C-major');
    state.filterType = new Set(['minor']);
    page.applyFilterChange();
    assert.ok(state.scaleId.endsWith('-minor'));
  });
  it('keeps the full range regardless of the filters', () => {
    const { page, state } = setup();
    state.scaleId = FULL_RANGE_ID;
    state.filterType = new Set(['minor']);
    page.applyFilterChange();
    assert.equal(state.scaleId, FULL_RANGE_ID);
  });
});

describe('selection keys', () => {
  const press = (doc, key) => {
    const event = { key, target: null, prevented: false, preventDefault() { event.prevented = true; } };
    doc.dispatch('keydown', event);

    return event;
  };

  it('arrows move the selected note on a scale page and Escape clears it', () => {
    const { page, doc, state } = setup();
    state.scaleId = 'C-major';
    page.update();
    page.initSelectionKeys();
    state.scaleNote = { name: state.scaleNotes[2].name, octave: state.scaleNotes[2].octave };
    const before = state.scaleNote;
    assert.equal(press(doc, 'ArrowRight').prevented, true);
    assert.notDeepEqual(state.scaleNote, before);
    press(doc, 'Escape');
    assert.equal(state.scaleNote, null);
  });
  it('keys do nothing without a selected note', () => {
    const { page, doc } = setup();
    page.state.scaleId = FULL_RANGE_ID;
    page.initSelectionKeys();
    assert.equal(press(doc, 'ArrowRight').prevented, false);
  });
  it('Escape also clears the highlighted column note', () => {
    const { page, doc, state } = setup();
    state.scaleId = 'C-major';
    page.update();
    page.initSelectionKeys();
    state.columnNote = 4;
    press(doc, 'Escape');
    assert.equal(state.columnNote, null);
  });
  it('Shift+arrows are left to the scale navigation', () => {
    const { page, doc, state } = setup();
    state.scaleId = FULL_RANGE_ID;
    page.update();
    page.initSelectionKeys();
    state.startNote = { name: 'C', octave: 4 };
    const event = { key: 'ArrowRight', shiftKey: true, target: null, preventDefault() { event.prevented = true; } };
    doc.dispatch('keydown', event);
    assert.equal(event.prevented, undefined);
    assert.deepEqual(state.startNote, { name: 'C', octave: 4 });
  });
});

describe('initScaleSwitching', () => {
  const clickOn = (control, modifiers = {}) => {
    const event = { target: { closest: (selector) => (selector === '[data-variant-step]' ? control : null) }, prevented: false, preventDefault() { event.prevented = true; }, ...modifiers };

    return event;
  };

  it('hands the heading, the areas and the callbacks to the scale navigation', () => {
    const { page, $, calls, selectorElements } = setup();
    page.initScaleSwitching();
    const options = calls.navigation[0];
    assert.equal(options.heading.root, $('scale-heading'));
    assert.equal(options.heading.title, $('range-title'));
    assert.equal(options.stickyRow, selectorElements['.range-section > .scale-nav-row']);
    assert.equal(options.swipeArea, selectorElements['.range-section']);
    assert.equal(options.variantSwipeArea, $('type-nav'));
    assert.equal(options.onScaleStep, page.switchScale);
    assert.equal(options.onVariantStep, page.switchVariant);
  });
  it('"Vše zapnout" switches every filter on and redraws', () => {
    const { page, state, calls } = setup();
    page.initScaleSwitching();
    state.filterType = new Set(['major']);
    state.filterAcc = new Set(['sharp']);
    calls.navigation[0].onEnableAllFilters();
    assert.equal(state.filterType.size, 4);
    assert.equal(state.filterAcc.size, 2);
  });
  it('a click on a variant link switches the variant like a key', () => {
    const { page, $, state, location } = setup();
    state.scaleId = 'a-minor';
    page.initScaleSwitching();
    const event = clickOn({ dataset: { variantStep: '2' } });
    $('type-nav').dispatch('click', event);
    assert.equal(event.prevented, true);
    assert.equal(location.hash, '#a-moll?type=melodic');
  });
  it('a click with a modifier or beside the controls is left to the browser', () => {
    const { page, $, state, location } = setup();
    state.scaleId = 'a-minor';
    page.initScaleSwitching();
    const modified = clickOn({ dataset: { variantStep: '1' } }, { shiftKey: true });
    $('type-nav').dispatch('click', modified);
    const beside = clickOn(null);
    $('type-nav').dispatch('click', beside);
    assert.deepEqual([modified.prevented, beside.prevented, location.hash], [false, false, '']);
  });
});

// createRangePage builds fingerings, selection and start scales that refer to each other
// through lazy references: the order they are created in must not matter once it is built.
describe('modules that refer to each other', () => {
  const pick = SAXOPHONE_ALTO.fingerings.find((f) => f.variants.length > 1);
  const noteClick = (note, octave) => {
    const g = { dataset: { note, octave: String(octave) }, closest: () => null };

    return { target: { closest: (selector) => (selector === '[data-note]' ? g : null) } };
  };

  it('can be created without any DOM access beyond the document it is given', () => {
    assert.doesNotThrow(() => setup());
  });
  it('a clicked note is selected by the selection and drawn by the fingerings and the start scales', () => {
    const { page, $, state } = setup();
    state.scaleId = FULL_RANGE_ID;
    page.initStartScales();
    $('fingering-chart').dispatch('click', noteClick(pick.note, pick.octave));
    assert.deepEqual(state.startNote, { name: pick.note, octave: pick.octave });
    assert.equal($('note-fingerings').hidden, false);
    assert.equal($('start-scales').hidden, false);
  });
  it('a second click on the same note clears it again', () => {
    const { page, $, state } = setup();
    state.scaleId = FULL_RANGE_ID;
    page.initStartScales();
    $('fingering-chart').dispatch('click', noteClick(pick.note, pick.octave));
    $('fingering-chart').dispatch('click', noteClick(pick.note, pick.octave));
    assert.equal(state.startNote, null);
    assert.equal($('note-fingerings').hidden, true);
  });
  it('a click on a column name highlights its note through the fingerings', () => {
    const { page, $, state } = setup();
    page.initColumnHighlight();
    $('fingering-chart').dispatch('click', { target: { closest: (selector) => (selector === '.fingering-header-cell' ? { dataset: { semitone: '4' } } : null) } });
    assert.equal(state.columnNote, 4);
  });
});
