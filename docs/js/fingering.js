// Instrument-agnostic fingering helpers (pure functions, no DOM).
import { enharmonicSpellings, accidentalType, notePitchMidi } from './music.js';

// All practical spellings of a written note as display strings, main spelling first:
// ('H', 3) → ['H3', 'Ces4'], ('G', 4) → ['G4'] (double sharps / flats are left out).
export function noteSpellingLabels(note, octave) {
  return enharmonicSpellings(note, octave)
    .filter((s, i) => i === 0 || accidentalType(s.name) !== 'double-sharp')
    .map(s => `${s.name}${s.octave}`);
}

// Fingering entry ({ note, octave, variants }) of a written note in any spelling
// (Ais4 and B4 find the same entry), or undefined outside the instrument range.
export function fingeringFor(fingerings, name, octave) {
  const pitch = notePitchMidi(name, octave);

  return fingerings.find(f => notePitchMidi(f.note, f.octave) === pitch);
}

// Splits fingerings into rows by section (sectionOf(entry) → row index) and places
// them on a common grid as wide as the longest row: the first row is aligned to the
// right, the other rows to the left. Rows keep the order of the input.
// → [{ section, startColumn (1-based), entries }], plus the column count.
export function fingeringRows(fingerings, sectionOf) {
  const bySection = new Map();
  for (const f of fingerings) {
    const section = sectionOf(f);
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push(f);
  }
  const sections = [...bySection.keys()].sort((a, b) => a - b);
  const columns = Math.max(0, ...[...bySection.values()].map(entries => entries.length));
  const rows = sections.map((section, i) => {
    const entries = bySection.get(section);

    return { section, startColumn: i === 0 ? columns - entries.length + 1 : 1, entries };
  });

  return { columns, rows };
}
