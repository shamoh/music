// Saxophone fingerings, written pitch, chromatic from B3 to F6 (the range of the app) — the same for the whole family.
//
// Each note:   { note, octave, variants } — enharmonic spellings are derived via music.js
// Each variant: { id, name, keys: [key ids from keys.js], verify?, comment? }
//   The first variant is the basic fingering, the others are alternatives.
//   verify: true marks fingerings that still need to be checked by a player.
// Checked against the Yamaha alto saxophone fingering chart (YAS-280).

const LH = ['lh1', 'lh2', 'lh3'];
const RH = ['rh1', 'rh2', 'rh3'];
const O = 'octave';

export const FINGERINGS = [
  // ── Low register ────────────────────────────────────────────────────────
  { note: 'B', octave: 3, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'lowBb', ...RH, 'lowC'] },
  ] },
  { note: 'H', octave: 3, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'lowB', ...RH, 'lowC'] },
  ] },
  { note: 'C', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, ...RH, 'lowC'] },
  ] },
  { note: 'Cis', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'lowCSharp', ...RH, 'lowC'] },
  ] },
  { note: 'D', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, ...RH] },
  ] },
  { note: 'Es', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, ...RH, 'lowEb'] },
  ] },
  { note: 'E', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'rh1', 'rh2'] },
  ] },
  { note: 'F', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'rh1'] },
  ] },
  { note: 'Fis', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'rh2'] },
    { id: 'chromatic', name: 'Chromatické Fis', keys: [...LH, 'rh1', 'altFSharp'] },
  ] },
  { note: 'G', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH] },
  ] },
  { note: 'Gis', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: [...LH, 'gSharp'] },
  ] },
  { note: 'A', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: ['lh1', 'lh2'] },
  ] },
  { note: 'B', octave: 4, variants: [
    { id: 'side', name: 'Postranní B', keys: ['lh1', 'lh2', 'sideBb'] },
    { id: 'bis', name: 'Bis', keys: ['lh1', 'bis'] },
    { id: 'oneAndOne', name: '1 + 1', keys: ['lh1', 'rh1'] },
    { id: 'oneAndTwo', name: '1 + 2', keys: ['lh1', 'rh2'] },
    { id: 'oneAndThree', name: '1 + 3', keys: ['lh1', 'rh3'] },
  ] },
  { note: 'H', octave: 4, variants: [
    { id: 'std', name: 'Základní', keys: ['lh1'] },
  ] },
  { note: 'C', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: ['lh2'] },
    { id: 'side', name: 'Postranní C', keys: ['lh1', 'sideC'] },
  ] },
  { note: 'Cis', octave: 5, variants: [
    { id: 'std', name: 'Základní (vše otevřené)', keys: [] },
  ] },

  // ── Middle register (octave key) ────────────────────────────────────────
  { note: 'D', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH, ...RH] },
  ] },
  { note: 'Es', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH, ...RH, 'lowEb'] },
  ] },
  { note: 'E', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH, 'rh1', 'rh2'] },
  ] },
  { note: 'F', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH, 'rh1'] },
  ] },
  { note: 'Fis', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH, 'rh2'] },
    { id: 'chromatic', name: 'Chromatické Fis', keys: [O, ...LH, 'rh1', 'altFSharp'] },
  ] },
  { note: 'G', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH] },
  ] },
  { note: 'Gis', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, ...LH, 'gSharp'] },
  ] },
  { note: 'A', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'lh1', 'lh2'] },
  ] },
  { note: 'B', octave: 5, variants: [
    { id: 'side', name: 'Postranní B', keys: [O, 'lh1', 'lh2', 'sideBb'] },
    { id: 'bis', name: 'Bis', keys: [O, 'lh1', 'bis'] },
    { id: 'oneAndOne', name: '1 + 1', keys: [O, 'lh1', 'rh1'] },
    { id: 'oneAndTwo', name: '1 + 2', keys: [O, 'lh1', 'rh2'] },
    { id: 'oneAndThree', name: '1 + 3', keys: [O, 'lh1', 'rh3'] },
  ] },
  { note: 'H', octave: 5, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'lh1'] },
  ] },
  { note: 'C', octave: 6, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'lh2'] },
    { id: 'side', name: 'Postranní C', keys: [O, 'lh1', 'sideC'] },
  ] },
  { note: 'Cis', octave: 6, variants: [
    { id: 'std', name: 'Základní', keys: [O] },
  ] },

  // ── Palm key register ───────────────────────────────────────────────────
  { note: 'D', octave: 6, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'palmD'] },
  ] },
  { note: 'Es', octave: 6, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'palmD', 'palmEb'] },
  ] },
  { note: 'E', octave: 6, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'palmD', 'palmEb', 'sideE'] },
    { id: 'frontF', name: 'Přední F', keys: [O, 'frontF', 'lh2', 'lh3'] },
  ] },
  { note: 'F', octave: 6, variants: [
    { id: 'std', name: 'Základní', keys: [O, 'palmD', 'palmEb', 'palmF', 'sideE'] },
    { id: 'frontF', name: 'Přední F', keys: [O, 'frontF', 'lh2'] },
  ] },
];
