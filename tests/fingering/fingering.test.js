import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { noteSpellingLabels, fingeringFor, fingeringRows, columnLabels } from '../../docs/js/fingering.js';
import { altSaxRangeSection } from '../../docs/js/music.js';
import { SAXOPHONE_ALTO } from '../../docs/js/instrument/saxophone/alto/instrument.js';

describe('noteSpellingLabels', () => {
  it('puts the main spelling first, followed by its enharmonic', () => {
    assert.deepEqual(noteSpellingLabels('Fis', 4), ['Fis4', 'Ges4']);
    assert.deepEqual(noteSpellingLabels('B', 3), ['Hes3', 'Ais3']);
  });

  it('spells B out as Hes in either position', () => {
    assert.deepEqual(noteSpellingLabels('Ais', 4), ['Ais4', 'Hes4']);
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
  // entry: note name + octave (the column is derived from the pitch), section number
  const entry = (name, octave, section) => ({ note: name, octave, section });
  const sectionOf = (e) => e.section;
  const label = (e) => `${e.note}${e.octave}`;

  it('splits entries into rows by section, in input order, sorted by section', () => {
    const { rows } = fingeringRows([entry('E', 4, 2), entry('C', 4, 1), entry('Cis', 4, 1)], sectionOf);
    assert.deepEqual(rows.map(r => [r.section, r.entries.map(label)]), [[1, ['C4', 'Cis4']], [2, ['E4']]]);
  });

  it('puts the same note into the same column, starting from the longest row', () => {
    const data = [
      entry('A', 3, 0), entry('H', 3, 0),
      entry('C', 4, 1), entry('Cis', 4, 1), entry('D', 4, 1), entry('Dis', 4, 1),
      entry('D', 5, 2),
    ];
    const { columns, rows } = fingeringRows(data, sectionOf);
    // columns: C C♯ D D♯ … ; A3 → col 10, H3 → col 12 (A♯ skipped), D5 → col 3 under D4
    assert.deepEqual(rows.map(r => r.columns), [[10, 12], [1, 2, 3, 4], [3]]);
    assert.equal(columns, 12);
  });

  it('handles no fingerings', () => {
    assert.deepEqual(fingeringRows([], sectionOf), { columns: 0, rows: [] });
  });

  it('aligns the alto sax range by note: 14 columns from C, B3/H3 above B4/H4, D5/D6 under D4', () => {
    const { columns, rows } = fingeringRows(SAXOPHONE_ALTO.fingerings, (f) => altSaxRangeSection(f.note, f.octave));
    assert.equal(columns, 14);
    assert.deepEqual(rows.map(r => r.entries.length), [2, 14, 12, 4]);
    assert.deepEqual(rows.map(r => r.columns[0]), [11, 1, 3, 3]);
    assert.deepEqual(rows.map(r => r.columns.at(-1)), [12, 14, 14, 6]);
    // every column holds one pitch class only
    const pitchClassByColumn = new Map();
    for (const r of rows) {
      r.entries.forEach((f, i) => {
        const pc = (f.octave * 12 + ['C', 'Cis', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H'].indexOf(f.note)) % 12;
        const col = r.columns[i];
        if (pitchClassByColumn.has(col)) assert.equal(pitchClassByColumn.get(col), pc, `column ${col}`);
        pitchClassByColumn.set(col, pc);
      });
    }
  });
});

describe('columnLabels', () => {
  const rows = [
    { entries: [{ note: 'H', octave: 3 }], columns: [12] },
    { entries: [{ note: 'C', octave: 4 }, { note: 'Cis', octave: 4 }, { note: 'H', octave: 4 }, { note: 'C', octave: 5 }], columns: [1, 2, 12, 13] },
  ];

  it('labels each column by its first entry', () => {
    const labels = columnLabels(rows, (e) => `${e.note}${e.octave}`);
    assert.deepEqual([...labels.entries()].sort((a, b) => a[0] - b[0]), [[1, 'C4'], [2, 'Cis4'], [12, 'H3'], [13, 'C5']]);
  });

  it('skips entries without a label and falls back to the next one in the column', () => {
    const labels = columnLabels(rows, (e) => (e.octave === 3 || e.note === 'Cis' ? null : e.note + e.octave));
    assert.equal(labels.get(12), 'H4');
    assert.equal(labels.has(2), false);
  });

  it('labels the 14 columns of the alto sax chart from C to C♯', () => {
    const { rows: saxRows } = fingeringRows(SAXOPHONE_ALTO.fingerings, (f) => altSaxRangeSection(f.note, f.octave));
    const labels = columnLabels(saxRows, (f) => f.note);
    assert.deepEqual([...labels.keys()].sort((a, b) => a - b), Array.from({ length: 14 }, (_, i) => i + 1));
    assert.equal(labels.get(1), 'C');
    assert.equal(labels.get(3), 'D');
    assert.equal(labels.get(11), 'B');
    assert.equal(labels.get(14), 'Cis');
  });
});
