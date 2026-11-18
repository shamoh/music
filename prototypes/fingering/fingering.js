// Instrument-agnostic fingering helpers (pure functions, no DOM).
import { enharmonicSpellings, accidentalType } from '../../docs/js/music.js';

// All practical spellings of a written note as display strings, main spelling first:
// ('H', 3) → ['H3', 'Ces4'], ('G', 4) → ['G4'] (double sharps / flats are left out).
export function noteSpellingLabels(note, octave) {
  return enharmonicSpellings(note, octave)
    .filter((s, i) => i === 0 || accidentalType(s.name) !== 'double-sharp')
    .map(s => `${s.name}${s.octave}`);
}
