import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toggledSemitone, elementSemitone, markHighlightedNote, staffLabelSemitone } from '../docs/js/note-highlight.js';

// Minimal stand-in for a DOM element: dataset, classList.toggle, setAttribute
function fakeElement(dataset) {
  const classes = new Set();
  const attrs = {};

  return {
    dataset,
    classes,
    attrs,
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    setAttribute: (name, value) => { attrs[name] = value; },
  };
}

// Click target inside an SVG note group; `matches` lists the selectors closest() finds
function fakeTarget(note, matches) {
  const g = { dataset: { note }, closest: (sel) => (matches.includes(`g ${sel}`) ? {} : null) };

  return { target: { closest: (sel) => (matches.includes(sel) ? (sel === '[data-note]' ? g : {}) : null) } };
}

describe('toggledSemitone', () => {
  it('highlights a new note', () => {
    assert.equal(toggledSemitone(null, 6), 6);
    assert.equal(toggledSemitone(2, 6), 6);
  });
  it('turns the highlight off on a second click', () => {
    assert.equal(toggledSemitone(6, 6), null);
  });
  it('treats C (0) as a note, not as "none"', () => {
    assert.equal(toggledSemitone(null, 0), 0);
    assert.equal(toggledSemitone(0, 0), null);
  });
});

describe('elementSemitone', () => {
  it('reads data-semitone', () => {
    assert.equal(elementSemitone(fakeElement({ semitone: '6' })), 6);
  });
  it('derives the semitone from data-note in any spelling', () => {
    assert.equal(elementSemitone(fakeElement({ note: 'Fis' })), 6);
    assert.equal(elementSemitone(fakeElement({ note: 'Ges' })), 6);
    assert.equal(elementSemitone(fakeElement({ note: 'His' })), 0);
  });
});

describe('markHighlightedNote', () => {
  const elements = () => [fakeElement({ note: 'D' }), fakeElement({ note: 'Fis' }), fakeElement({ semitone: '2' })];

  it('marks every element of the highlighted note, in any octave or spelling', () => {
    const els = elements();
    markHighlightedNote(els, 2);
    assert.deepEqual(els.map((e) => e.classes.has('same-note')), [true, false, true]);
  });
  it('clears the marks when nothing is highlighted', () => {
    const els = elements();
    markHighlightedNote(els, 2);
    markHighlightedNote(els, null);
    assert.ok(els.every((e) => !e.classes.has('same-note')));
  });
  it('uses the given class and sets aria-pressed only for pressable elements', () => {
    const els = elements();
    markHighlightedNote(els, 6, { className: 'active', pressable: true });
    assert.deepEqual(els.map((e) => e.classes.has('active')), [false, true, false]);
    assert.deepEqual(els.map((e) => e.attrs['aria-pressed']), ['false', 'true', 'false']);
    const plain = elements();
    markHighlightedNote(plain, 6);
    assert.ok(plain.every((e) => e.attrs['aria-pressed'] === undefined));
  });
});

describe('staffLabelSemitone', () => {
  it('gives the semitone of a clicked name label', () => {
    assert.equal(staffLabelSemitone(fakeTarget('Fis', ['[data-note]', '[data-note-label]'])), 6);
  });
  it('ignores clicks outside the label (note head, column)', () => {
    assert.equal(staffLabelSemitone(fakeTarget('Fis', ['[data-note]'])), null);
  });
  it('ignores grey notes outside the scale', () => {
    assert.equal(staffLabelSemitone(fakeTarget('Fis', ['[data-note]', '[data-note-label]', 'g [data-layer="muted-notes"]'])), null);
  });
  it('ignores clicks that are not on a note', () => {
    assert.equal(staffLabelSemitone({ target: { closest: () => null } }), null);
  });
});
