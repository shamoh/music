import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { noteSpellingLabels, fingeringFor, fingeringRows } from '../../docs/js/fingering.js';
import { altSaxRangeSection } from '../../docs/js/music.js';
import { SAXOPHONE_ALTO } from '../../docs/js/instrument/saxophone/alto/instrument.js';

describe('noteSpellingLabels', () => {
  it('puts the main spelling first, followed by its enharmonic', () => {
    assert.deepEqual(noteSpellingLabels('Fis', 4), ['Fis4', 'Ges4']);
    assert.deepEqual(noteSpellingLabels('B', 3), ['B3', 'Ais3']);
  });

  it('shifts the octave for Ces and His', () => {
    assert.deepEqual(noteSpellingLabels('H', 3), ['H3', 'Ces4']);
    assert.deepEqual(noteSpellingLabels('C', 4), ['C4', 'His3']);
  });

  it('leaves out double sharps', () => {
    assert.deepEqual(noteSpellingLabels('G', 4), ['G4']);
    assert.deepEqual(noteSpellingLabels('D', 5), ['D5']);
  });
});

describe('fingeringFor', () => {
  const FINGERINGS = [
    { note: 'B', octave: 3, variants: [] },
    { note: 'H', octave: 3, variants: [] },
    { note: 'C', octave: 4, variants: [] },
    { note: 'Cis', octave: 4, variants: [] },
  ];

  it('finds the entry by the spelling used in the data', () => {
    assert.equal(fingeringFor(FINGERINGS, 'Cis', 4), FINGERINGS[3]);
  });

  it('finds the entry by any enharmonic spelling', () => {
    assert.equal(fingeringFor(FINGERINGS, 'Des', 4), FINGERINGS[3]);
    assert.equal(fingeringFor(FINGERINGS, 'Ais', 3), FINGERINGS[0]);
    assert.equal(fingeringFor(FINGERINGS, 'Ces', 4), FINGERINGS[1]);
    assert.equal(fingeringFor(FINGERINGS, 'His', 3), FINGERINGS[2]);
  });

  it('returns undefined outside the range', () => {
    assert.equal(fingeringFor(FINGERINGS, 'A', 3), undefined);
    assert.equal(fingeringFor(FINGERINGS, 'D', 4), undefined);
  });
});

describe('fingeringRows', () => {
  const entry = (id, section) => ({ id, section });
  const sectionOf = (e) => e.section;

  it('splits entries into rows by section, in input order', () => {
    const { rows } = fingeringRows([entry('a', 0), entry('b', 1), entry('c', 1), entry('d', 2)], sectionOf);
    assert.deepEqual(rows.map(r => [r.section, r.entries.map(e => e.id)]), [[0, ['a']], [1, ['b', 'c']], [2, ['d']]]);
  });

  it('is as wide as the longest row, first row aligned right, the others left', () => {
    const data = [entry('a', 0), entry('b', 0), ...['c', 'd', 'e', 'f'].map(id => entry(id, 1)), entry('g', 2), entry('h', 2), entry('i', 3)];
    const { columns, rows } = fingeringRows(data, sectionOf);
    assert.equal(columns, 4);
    assert.deepEqual(rows.map(r => r.startColumn), [3, 1, 1, 1]);
  });

  it('orders rows by section number', () => {
    const { rows } = fingeringRows([entry('x', 2), entry('y', 0)], sectionOf);
    assert.deepEqual(rows.map(r => r.section), [0, 2]);
    assert.equal(rows[0].startColumn, 1);
  });

  it('handles no fingerings', () => {
    assert.deepEqual(fingeringRows([], sectionOf), { columns: 0, rows: [] });
  });

  it('lays out the alto sax range in rows of 2, 14, 12 and 4 notes', () => {
    const { columns, rows } = fingeringRows(SAXOPHONE_ALTO.fingerings, (f) => altSaxRangeSection(f.note, f.octave));
    assert.equal(columns, 14);
    assert.deepEqual(rows.map(r => r.entries.length), [2, 14, 12, 4]);
    assert.deepEqual(rows.map(r => r.startColumn), [13, 1, 1, 1]);
    assert.deepEqual(rows.map(r => `${r.entries[0].note}${r.entries[0].octave}`), ['B3', 'C4', 'D5', 'D6']);
  });
});
