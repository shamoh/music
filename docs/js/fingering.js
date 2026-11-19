// Instrument-agnostic fingering helpers (pure functions, no DOM).
import { enharmonicSpellings, accidentalType, notePitchMidi, longNoteName } from './music.js';

// All practical spellings of a written note as long Czech names, main spelling first:
// ('H', 3) → ['H3', 'Ces4'], ('B', 3) → ['Hes3', 'Ais3'], ('G', 4) → ['G4']
// (double sharps / flats are left out).
export function noteSpellingLabels(note, octave) {
  return enharmonicSpellings(note, octave)
    .filter((s, i) => i === 0 || accidentalType(s.name) !== 'double-sharp')
    .map(s => `${longNoteName(s.name)}${s.octave}`);
}

// Fingering entry ({ note, octave, variants }) of a written note in any spelling
// (Ais4 and B4 find the same entry), or undefined outside the instrument range.
export function fingeringFor(fingerings, name, octave) {
  const pitch = notePitchMidi(name, octave);

  return fingerings.find(f => notePitchMidi(f.note, f.octave) === pitch);
}

// Splits fingerings into rows by section (sectionOf(entry) → row index) and places them
// on a common grid so that a column always holds the same note (pitch class): the
// columns follow the chromatic scale from the first note of the longest row; a row
// spanning more than an octave repeats its first notes at its end. Rows keep the order
// of the input and are sorted by section.
// → { columns (count), rows: [{ section, entries, columns: [1-based column per entry] }] }
export function fingeringRows(fingerings, sectionOf) {
  const bySection = new Map();
  for (const f of fingerings) {
    const section = sectionOf(f);
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push(f);
  }
  const groups = [...bySection.entries()].sort(([a], [b]) => a - b);
  if (groups.length === 0) return { columns: 0, rows: [] };

  const pitchOf = (f) => notePitchMidi(f.note, f.octave);
  const longest = groups.map(([, entries]) => entries).reduce((a, b) => (b.length > a.length ? b : a));
  const basePitchClass = pitchOf(longest[0]) % 12;
  const rows = groups.map(([section, entries]) => {
    const first = pitchOf(entries[0]);
    const firstColumn = (first % 12 - basePitchClass + 12) % 12 + 1;

    return { section, entries, columns: entries.map((f) => firstColumn + pitchOf(f) - first) };
  });

  return { columns: Math.max(...rows.flatMap((r) => r.columns)), rows };
}

// Labels of the grid columns from fingeringRows: column → labelOf(entry) of the first
// entry in that column for which labelOf gives a value (null / undefined = skip, e.g.
// a note outside the shown scale). Columns without a labelled entry are left out.
export function columnLabels(rows, labelOf) {
  const labels = new Map();
  for (const row of rows) {
    row.entries.forEach((entry, i) => {
      const column = row.columns[i];
      if (labels.has(column)) return;
      const label = labelOf(entry);
      if (label !== null && label !== undefined) labels.set(column, label);
    });
  }

  return labels;
}
