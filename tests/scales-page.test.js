import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createScalesPage, FILTER_STORAGE_KEY } from '../docs/js/scales-page.js';
import { filteredScales } from '../docs/js/music.js';
import { memoryStorage, fakeEventTarget } from './helpers/fake-dom.js';

function element(tagName = 'div', properties = {}) {
  const classes = new Set();

  return {
    tagName,
    children: [],
    dataset: {},
    hidden: false,
    textContent: '',
    value: '',
    href: '',
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)), has: (name) => classes.has(name) },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    setAttribute() {},
    querySelector(selector) { return this.parts?.[selector] ?? null; },
    ...properties,
  };
}

// Page with all elements the scales page uses, the staff / heading / animation recorded
function setup({ hash = '' } = {}) {
  const sections = {};
  for (const id of ['minor-natural', 'minor-harmonic', 'minor-melodic']) {
    sections[id] = element('section', { parts: { h3: element('h3'), '.note-row': element(), '.staff-container': element() } });
  }
  const elements = {
    'scale-select': element('select'), 'major-view': element(), 'minor-view': element(),
    'major-title': element(), 'major-chord': element(), 'major-note-row': element(), 'major-staff': element(),
    'major-range-link': element('a'), 'minor-chord': element(), 'scale-heading': element(), 'scale-nav-prev': element(),
    'scale-nav-title': element(), 'scale-nav-next': element(), ...sections,
  };
  const rangeLinks = [element('a', { dataset: { rangeType: 'natural' } }), element('a', { dataset: { rangeType: 'harmonic' } })];
  const chips = [];
  const noteRows = [fakeEventTarget()];
  const staffs = [fakeEventTarget()];
  const lists = { '#minor-view .range-link[data-range-type]': rangeLinks, '.note-chip': chips, '.note-row': noteRows, '.staff-container': staffs };
  const doc = fakeEventTarget({
    getElementById: (id) => elements[id],
    createElement: (tagName) => element(tagName),
    createTextNode: (text) => ({ text }),
    querySelectorAll: (selector) => lists[selector] ?? [],
    activeElement: null,
  });
  const calls = { staves: [], tracked: [], headings: [], slides: [], replaced: [] };
  const location = { hash };
  const history = { replaceState: (_s, _t, url) => { calls.replaced.push(url); location.hash = url; } };
  const storage = memoryStorage();
  const page = createScalesPage({
    doc, location, history, storage,
    renderStaff: (container, notes, chord, keySig, isMinor) => calls.staves.push({ container, notes, chord, keySig, isMinor }),
    trackView: (id) => calls.tracked.push(id),
    renderHeading: (heading, options) => calls.headings.push({ heading, options }),
    slideIn: (els, step) => calls.slides.push({ els, step }),
  });

  return { page, doc, noteRows, staffs, elements, sections, rangeLinks, calls, storage, location };
}

describe('update', () => {
  it('renders a major scale: title, chord, chips, staff, range link', () => {
    const { page, elements, calls } = setup();
    page.state.scaleId = 'Es-major';
    page.update();
    assert.equal(elements['major-view'].hidden, false);
    assert.equal(elements['minor-view'].hidden, true);
    assert.equal(elements['major-title'].textContent, 'Es dur (3♭ : b, es, as)');
    assert.equal(elements['major-chord'].textContent, 'Akord: Es – G – B');
    assert.equal(elements['major-note-row'].children.length, 8);
    assert.equal(calls.staves.length, 1);
    assert.deepEqual([calls.staves[0].keySig, calls.staves[0].isMinor], [-3, false]);
    assert.equal(elements['major-range-link'].href, '/scales/instrument/saxophone/alto/#Es-dur');
  });
  it('renders the three minor variants and their range links', () => {
    const { page, elements, sections, rangeLinks, calls } = setup();
    page.state.scaleId = 'a-minor';
    page.update();
    assert.equal(elements['major-view'].hidden, true);
    assert.equal(elements['minor-view'].hidden, false);
    assert.equal(calls.staves.length, 3);
    assert.ok(calls.staves.every((s) => s.isMinor));
    assert.match(sections['minor-natural'].parts.h3.children[0].text, /^Aiolská a moll/);
    assert.match(sections['minor-harmonic'].parts.h3.children[0].text, /^Harmonická a moll/);
    assert.equal(sections['minor-melodic'].parts.h3.children.length, 3);
    assert.deepEqual(rangeLinks.map((a) => a.href), [
      '/scales/instrument/saxophone/alto/#a-moll',
      '/scales/instrument/saxophone/alto/#a-moll?type=harmonic',
    ]);
  });
  it('puts the scale into the hash, tracks the view and redraws the heading', () => {
    const { page, calls } = setup();
    page.state.scaleId = 'G-major';
    page.update();
    assert.deepEqual(calls.replaced, ['#G-dur']);
    assert.deepEqual(calls.tracked, ['G-major']);
    assert.equal(calls.headings[0].options.current.id, 'G-major');
    assert.equal(calls.headings[0].options.href({ id: 'a-minor' }), '#a-moll');
    assert.equal(calls.headings[0].options.groupLabel('minor'), 'Moll');
  });
  it('leaves the hash alone when it is already right', () => {
    const { page, calls } = setup({ hash: '#C-dur' });
    page.state.scaleId = 'C-major';
    page.update();
    assert.deepEqual(calls.replaced, []);
  });
  it('does nothing for an unknown scale', () => {
    const { page, calls } = setup();
    page.state.scaleId = 'nonsense';
    page.update();
    assert.deepEqual(calls.tracked, []);
  });
});

describe('repopulateSelect', () => {
  it('groups the scales into Dur and Moll when both types are on', () => {
    const { page, elements } = setup();
    page.state.scaleId = 'a-minor';
    page.repopulateSelect();
    const select = elements['scale-select'];
    assert.deepEqual(select.children.map((g) => g.label), ['Dur', 'Moll']);
    assert.equal(select.value, 'a-minor');
  });
  it('lists plain options for a single type', () => {
    const { page, elements } = setup();
    page.state.filterType = new Set(['major']);
    page.repopulateSelect();
    const select = elements['scale-select'];
    assert.ok(select.children.length > 0);
    assert.ok(select.children.every((o) => o.tagName === 'option'));
  });
});

describe('switchScale', () => {
  it('moves to the next scale, remembers it and slides it in', () => {
    const { page, elements, calls, storage } = setup();
    page.state.scaleId = 'C-major';
    page.switchScale(1);
    assert.notEqual(page.state.scaleId, 'C-major');
    assert.equal(elements['scale-select'].value, page.state.scaleId);
    assert.ok(Object.values(storage.items).includes(page.state.scaleId));
    assert.equal(calls.slides[0].step, 1);
    assert.equal(calls.slides[0].els[0], elements['major-view']);
  });
  it('moves back with step −1', () => {
    const { page } = setup();
    page.state.scaleId = 'C-major';
    page.switchScale(1);
    page.switchScale(-1);
    assert.equal(page.state.scaleId, 'C-major');
  });
  it('does nothing at the start of the list', () => {
    const { page, calls } = setup();
    const first = filteredScales(page.state.filterType, page.state.filterAcc)[0];
    page.state.scaleId = first.id;
    page.switchScale(-1);
    assert.equal(page.state.scaleId, first.id);
    assert.deepEqual(calls.slides, []);
  });
});

describe('filters', () => {
  it('keeps the shown scale when it stays visible and remembers the filters', () => {
    const { page, storage } = setup();
    page.state.scaleId = 'C-major';
    page.applyFilterChange();
    assert.equal(page.state.scaleId, 'C-major');
    assert.ok(FILTER_STORAGE_KEY in storage.items);
  });
  it('falls back to the first offered scale when the shown one is filtered out', () => {
    const { page } = setup();
    page.state.scaleId = 'a-minor';
    page.state.filterType = new Set(['major']);
    page.applyFilterChange();
    assert.equal(page.state.scaleId.endsWith('-major'), true);
  });
  it('"Vše zapnout" switches every filter on', () => {
    const { page } = setup();
    page.state.filterType = new Set(['major']);
    page.state.filterAcc = new Set(['sharp']);
    page.enableAllScaleFilters();
    assert.deepEqual([...page.state.filterType].sort(), ['major', 'minor']);
    assert.deepEqual([...page.state.filterAcc].sort(), ['flat', 'sharp']);
  });
});

describe('selecting and the URL hash', () => {
  it('selectScale shows and remembers the picked scale', () => {
    const { page, storage, calls } = setup();
    page.selectScale('D-major');
    assert.equal(page.state.scaleId, 'D-major');
    assert.deepEqual(calls.tracked, ['D-major']);
    assert.ok(Object.values(storage.items).includes('D-major'));
  });
  it('showHashScale switches on the needed filters and shows the scale', () => {
    const { page, elements } = setup();
    page.state.filterAcc = new Set(['sharp']);
    page.showHashScale('#Es-dur');
    assert.equal(page.state.scaleId, 'Es-major');
    assert.ok(page.state.filterAcc.has('flat'));
    assert.equal(elements['scale-select'].value, 'Es-major');
  });
});

describe('toggleHighlight', () => {
  it('toggles the highlighted semitone', () => {
    const { page } = setup();
    page.toggleHighlight(4);
    assert.equal(page.state.highlight, 4);
    page.toggleHighlight(4);
    assert.equal(page.state.highlight, null);
  });
});

describe('initNoteHighlight', () => {
  const chipTarget = (semitone) => ({ target: { closest: (selector) => (selector === '.note-chip' ? { dataset: { semitone: String(semitone) } } : null) } });
  const labelTarget = (note) => {
    const g = { dataset: { note }, closest: () => null };

    return { target: { closest: (selector) => (selector === '[data-note]' ? g : selector === '[data-note-label]' ? {} : null) } };
  };

  it('a click on a note chip highlights its note, a second click turns it off', () => {
    const { page, noteRows } = setup();
    page.initNoteHighlight();
    noteRows[0].dispatch('click', chipTarget(7));
    assert.equal(page.state.highlight, 7);
    noteRows[0].dispatch('click', chipTarget(7));
    assert.equal(page.state.highlight, null);
  });
  it('ignores a click beside the chips', () => {
    const { page, noteRows } = setup();
    page.initNoteHighlight();
    noteRows[0].dispatch('click', { target: { closest: () => null } });
    assert.equal(page.state.highlight, null);
  });
  it('a click on a staff note label highlights the note, other clicks on the staff do not', () => {
    const { page, staffs } = setup();
    page.initNoteHighlight();
    staffs[0].dispatch('click', labelTarget('G'));
    assert.equal(page.state.highlight, 7);
    staffs[0].dispatch('click', { target: { closest: () => null } });
    assert.equal(page.state.highlight, 7);
  });
  it('Escape clears the highlight and drops the focus ring of a chip', () => {
    const { page, doc } = setup();
    page.initNoteHighlight();
    page.toggleHighlight(4);
    let blurred = false;
    doc.activeElement = { closest: (selector) => (selector === '.note-chip' ? {} : null), blur: () => { blurred = true; } };
    doc.dispatch('keydown', { key: 'Escape' });
    assert.equal(page.state.highlight, null);
    assert.equal(blurred, true);
  });
  it('other keys and Escape without a highlight change nothing', () => {
    const { page, doc } = setup();
    page.initNoteHighlight();
    doc.dispatch('keydown', { key: 'Escape' });
    assert.equal(page.state.highlight, null);
    page.toggleHighlight(4);
    doc.dispatch('keydown', { key: 'a' });
    assert.equal(page.state.highlight, 4);
  });
  it('keys belong to the open settings menu', () => {
    const { page, doc } = setup();
    page.initNoteHighlight();
    page.toggleHighlight(4);
    doc.getElementById = (id) => (id === 'settings-panel' ? { hidden: false } : null);
    doc.dispatch('keydown', { key: 'Escape' });
    assert.equal(page.state.highlight, 4);
  });
});

// createScalesPage is built from functions that refer to each other and to its state; none
// of it may touch the page while it is being built (like in the range page, where modules
// refer to each other lazily) — the page is only used once its init functions run.
describe('createScalesPage creation', () => {
  it('does not touch the document, the storage or the location while it is created', () => {
    const forbidden = () => { throw new Error('touched while creating the page'); };
    const guarded = new Proxy({}, { get: forbidden, set: forbidden });
    assert.doesNotThrow(() => createScalesPage({
      doc: guarded, location: guarded, history: guarded, storage: guarded,
      renderStaff: forbidden, trackView: forbidden, renderHeading: forbidden, slideIn: forbidden,
    }));
  });
  it('exposes every operation of the page right after it is created', () => {
    const { page } = setup();
    for (const name of ['repopulateSelect', 'applyFilterChange', 'enableAllScaleFilters', 'toggleHighlight', 'initNoteHighlight', 'switchScale', 'selectScale', 'showHashScale', 'update', 'scaleNavHeading']) {
      assert.equal(typeof page[name], 'function', name);
    }
    assert.equal(page.scaleNavHeading().root, page.scaleNavHeading().root);
  });
});
