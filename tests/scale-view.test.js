import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  setVariantHeader, makeOption, renderNoteRow, scaleIdToHash, hashToScaleId, applyHashToState,
} from '../docs/js/scale-view.js';
import { SCALE_CATALOG } from '../docs/js/music.js';

// Minimal element: children, replaceChildren, querySelector and dataset
function element(tagName, properties = {}) {
  return {
    tagName,
    children: [],
    dataset: {},
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    ...properties,
  };
}

const doc = {
  createElement: (tagName) => element(tagName),
  createTextNode: (text) => ({ text }),
};

const byId = (id) => SCALE_CATALOG.find((s) => s.id === id);

describe('setVariantHeader', () => {
  const sectionWith = (h3) => ({ querySelector: (selector) => (selector === 'h3' ? h3 : null) });
  const notes = ['Es', 'F', 'G', 'As', 'B', 'C', 'D', 'Es'];

  it('writes the title with the accidentals and drops the previous content', () => {
    const h3 = element('h3', { children: [{ text: 'old' }] });
    setVariantHeader(sectionWith(h3), 'Es dur', notes, null, undefined, doc);
    assert.deepEqual(h3.children, [{ text: 'Es dur (3♭ : es, as, b)' }]);
  });
  it('adds the hint and the changes as spans', () => {
    const h3 = element('h3');
    setVariantHeader(sectionWith(h3), 'Melodická', notes, '(vzestupná)', 'G → Gis', doc);
    assert.equal(h3.children.length, 3);
    assert.deepEqual([h3.children[1].className, h3.children[1].textContent], ['variant-hint', ' (vzestupná)']);
    assert.deepEqual([h3.children[2].className, h3.children[2].textContent], ['variant-changes-inline', ' · G → Gis']);
  });
});

describe('makeOption', () => {
  it('names a major scale with its key signature', () => {
    const option = makeOption(byId('Es-major'), doc);
    assert.equal(option.value, 'Es-major');
    assert.equal(option.textContent, 'Es dur (3♭ : b, es, as)');
  });
  it('names a minor scale', () => {
    assert.match(makeOption(byId('a-minor'), doc).textContent, /^a moll/);
  });
});

describe('renderNoteRow', () => {
  const scale = [{ name: 'C' }, { name: 'D' }, { name: 'E' }, { name: 'Fisis' }];

  it('renders a chip per note: tonic, chord notes and plain notes', () => {
    const row = element('div', { children: [{ stale: true }] });
    renderNoteRow(row, scale, ['C', 'E'], doc);
    assert.deepEqual(row.children.map((c) => c.className), ['note-chip tonic', 'note-chip', 'note-chip chord', 'note-chip']);
    assert.deepEqual(row.children.map((c) => c.type), ['button', 'button', 'button', 'button']);
  });
  it('labels double sharps and stores the semitone', () => {
    const row = element('div');
    renderNoteRow(row, scale, [], doc);
    assert.equal(row.children[3].textContent, 'Fisis (=G)');
    assert.equal(row.children[1].dataset.semitone, 2);
  });
});

describe('URL hash', () => {
  it('converts between scale ids and hashes', () => {
    assert.equal(scaleIdToHash('Es-major'), 'Es-dur');
    assert.equal(scaleIdToHash('a-minor'), 'a-moll');
    assert.equal(hashToScaleId('#a-moll'), 'a-minor');
    assert.equal(hashToScaleId('Es-dur'), 'Es-major');
  });

  const freshState = () => ({
    scaleId: 'C-major', filterType: new Set(['major']), filterAcc: new Set(['natural']),
  });

  it('selects the scale and switches on the filters it needs', () => {
    const state = freshState();
    applyHashToState(state, '#Es-dur');
    assert.equal(state.scaleId, 'Es-major');
    assert.ok(state.filterAcc.has('flat'));
    applyHashToState(state, '#a-moll');
    assert.equal(state.scaleId, 'a-minor');
    assert.ok(state.filterType.has('minor'));
  });
  it('ignores an empty or unknown hash', () => {
    const state = freshState();
    applyHashToState(state, '');
    applyHashToState(state, '#nonsense');
    assert.equal(state.scaleId, 'C-major');
  });
  it('ignores types the page cannot show', () => {
    const other = SCALE_CATALOG.find((s) => s.type !== 'major' && s.type !== 'minor' && !s.baseId);
    if (!other) return;
    const state = freshState();
    applyHashToState(state, '#' + scaleIdToHash(other.id));
    assert.equal(state.scaleId, 'C-major');
  });
  it('falls back to the base major scale of a major-from scale', () => {
    const from = SCALE_CATALOG.find((s) => s.baseId);
    if (!from) return;
    const state = freshState();
    applyHashToState(state, '#' + scaleIdToHash(from.id));
    assert.equal(state.scaleId, from.baseId);
  });
});
