import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRangeView, buildFullSaxRange } from '../docs/js/range-view.js';
import { FULL_RANGE_ID, FULL_RANGE_HINT, SCALE_HINT } from '../docs/js/range-names.js';
import { SCALE_CATALOG, generateScale, buildAltSaxRange } from '../docs/js/music.js';

function element() {
  return {
    children: [], dataset: {}, hidden: false, textContent: '', href: '', parentNode: null,
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    replaceChildren() { this.children = []; },
    querySelectorAll() { return []; },
  };
}

// The view with recording stand-ins for everything it draws through
function setup(state = {}) {
  const cache = {};
  const calls = { staves: [], tracked: [], header: [], chart: [], fingerings: 0, details: 0, pushed: [], cleared: 0, subtitles: [] };
  const doc = { createElement: element, createTextNode: (text) => ({ text }), getElementById: (id) => (cache[id] ??= element()) };
  const $ = (id) => doc.getElementById(id);
  const fullState = { scaleId: 'C-major', variantType: 'natural', scaleNote: null, scaleNoteKey: null, scaleNotes: [], rangeNotes: [], ...state };
  const header = {
    updateTypeNav: (...args) => calls.header.push(['typeNav', ...args]),
    updateScaleHeading: (entry) => calls.header.push(['heading', entry]),
    setSubtitle: (el, name, text, suffix) => calls.subtitles.push([name, text, suffix]),
    setScaleSubtitle: (el, entry, variant) => calls.subtitles.push([entry.id, variant]),
  };
  const fingerings = {
    renderFingeringChart: (...args) => calls.chart.push(args),
    renderNoteFingerings: () => { calls.fingerings++; },
  };
  const view = createRangeView({
    doc, $, state: fullState, header, fingerings,
    renderStaff: (...args) => calls.staves.push(args),
    trackView: (id, variant) => calls.tracked.push([id, variant]),
    renderNoteDetails: () => { calls.details++; },
    pushHash: (entry, type) => calls.pushed.push([entry.id, type]),
    clearHash: () => { calls.cleared++; },
  });

  return { view, state: fullState, calls, $ };
}

describe('buildFullSaxRange', () => {
  const scaleOf = (id) => generateScale(id, 4, 'natural');

  it('keeps the range of the instrument and renames the notes the scale spells differently', () => {
    const range = buildFullSaxRange(scaleOf('Es-major'), true);
    assert.equal(range.length, buildAltSaxRange(true).length);
    assert.ok(range.some((n) => n.name === 'B'));
  });
  it('moves the octave of His and Ces, which cross the octave boundary', () => {
    const base = buildAltSaxRange(false);
    const ces = buildFullSaxRange(scaleOf('Ces-major'), true).find((n) => n.name === 'Ces');
    const same = base.find((n) => n.semitone === ces.semitone && n.octave === ces.octave - 1);
    assert.ok(same);
    const his = buildFullSaxRange(scaleOf('Cis-major'), false).find((n) => n.name === 'His');
    assert.ok(base.find((n) => n.semitone === his.semitone && n.octave === his.octave + 1));
  });
});

describe('update: full range', () => {
  it('clears the hash, draws two staves and the chart, tracks the view', () => {
    const { view, state, calls, $ } = setup({ scaleId: FULL_RANGE_ID });
    view.update();
    assert.equal(calls.cleared, 1);
    assert.deepEqual(calls.pushed, []);
    assert.equal(calls.staves.length, 2);
    assert.deepEqual(calls.subtitles.map(([name]) => name), ['Křížky', 'Béčka']);
    assert.equal($('range-hint').textContent, FULL_RANGE_HINT);
    assert.equal($('twin-block').hidden, false);
    assert.equal($('desc-block').hidden, true);
    assert.equal($('nav-scales-link').href, '/scales/');
    assert.deepEqual(calls.chart, [[]]);
    assert.equal(calls.details, 1);
    assert.deepEqual(calls.tracked, [[FULL_RANGE_ID, 'natural']]);
    assert.deepEqual(calls.header.map(([name]) => name), ['heading', 'typeNav']);
    assert.equal(state.scaleId, FULL_RANGE_ID);
  });
  it('shows the details panel in its place above the chart', () => {
    const { view, $ } = setup({ scaleId: FULL_RANGE_ID });
    $('note-fingerings').parentNode = $('note-details-bottom');
    view.update();
    assert.equal($('note-fingerings').parentNode, $('note-details'));
  });
});

describe('update: scale', () => {
  it('draws the staff and the fingerings of a major scale', () => {
    const { view, state, calls, $ } = setup({ scaleId: 'Es-major' });
    view.update();
    assert.deepEqual(calls.pushed, [['Es-major', 'natural']]);
    assert.equal($('range-hint').textContent, SCALE_HINT);
    assert.equal($('start-scales').hidden, true);
    assert.equal($('nav-scales-link').href, '/scales/#Es-dur');
    assert.equal($('twin-block').hidden, true);
    assert.equal($('desc-block').hidden, true);
    assert.equal(calls.staves.length, 1);
    assert.deepEqual(calls.subtitles, [['Es-major', 'natural']]);
    assert.deepEqual(calls.tracked, [['Es-major', 'natural']]);
    assert.ok(state.scaleNotes.length > 0);
    assert.ok(state.rangeNotes.length >= state.scaleNotes.length);
    const [scaleNotes, tonic, chord, isMinor, rangeNotes, allNames] = calls.chart[0];
    assert.deepEqual([scaleNotes, tonic, chord, isMinor, rangeNotes, allNames], [state.scaleNotes, 'Es', ['Es', 'G', 'B'], false, state.rangeNotes, false]);
    assert.equal(calls.fingerings, 1);
  });
  it('draws the descending staff for melodic minor and keeps the fingerings of both directions', () => {
    const { view, state, calls, $ } = setup({ scaleId: 'a-minor', variantType: 'melodic' });
    view.update();
    assert.equal(calls.staves.length, 2);
    assert.equal($('asc-label').hidden, false);
    assert.equal($('desc-block').hidden, false);
    assert.equal($('note-fingerings').parentNode, $('note-details-bottom'));
    assert.deepEqual(calls.pushed, [['a-minor', 'melodic']]);
    assert.equal(calls.chart[0][3], true);
    assert.ok(state.scaleNotes.length > 14);
  });
  it('links a theoretical key to its base scale and whole-tone to the default page', () => {
    const basis = SCALE_CATALOG.find((s) => s.baseId);
    const wholeTone = SCALE_CATALOG.find((s) => s.type === 'whole-tone');
    const first = setup({ scaleId: basis.id });
    first.view.update();
    assert.ok(first.$('nav-scales-link').href.startsWith('/scales/#'));
    const second = setup({ scaleId: wholeTone.id });
    second.view.update();
    assert.equal(second.$('nav-scales-link').href, '/scales/');
    assert.equal(second.calls.chart[0][5], true);
  });
  it('draws a pair of staves for a "dur od tónu" scale', () => {
    const from = SCALE_CATALOG.find((s) => s.startOctave !== undefined && s.id.startsWith('Ais'));
    const { view, calls, $ } = setup({ scaleId: from.id });
    view.update();
    assert.equal($('twin-block').hidden, false);
    assert.equal(calls.staves.length, 2);
    assert.equal(calls.chart[0][5], true);
  });
  it('keeps the clicked note only while it is in the new scale', () => {
    const { view, state } = setup({ scaleId: 'C-major', scaleNote: { name: 'C', octave: 4 }, scaleNoteKey: 'D-major/natural' });
    view.update();
    assert.deepEqual(state.scaleNote, { name: 'C', octave: 4 });
    state.scaleId = 'Es-major';
    state.scaleNote = { name: 'E', octave: 4 };
    view.update();
    assert.equal(state.scaleNote, null);
    assert.equal(state.scaleNoteKey, 'Es-major/natural');
  });
  it('keeps a note outside the scale when the same scale is redrawn', () => {
    const { view, state } = setup({ scaleId: 'C-major' });
    view.update();
    state.scaleNote = { name: 'Fis', octave: 4 };
    view.update();
    assert.deepEqual(state.scaleNote, { name: 'Fis', octave: 4 });
  });
  it('does nothing for an unknown scale', () => {
    const { view, calls } = setup({ scaleId: 'nonsense' });
    view.update();
    assert.deepEqual([calls.staves.length, calls.tracked.length, calls.pushed.length], [0, 0, 0]);
  });
});
