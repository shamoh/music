// Czech note names for each semitone (0=C) — used for range display and accidental detection
export const CHROMATIC_SHARP = ['C','Cis','D','Dis','E','F','Fis','G','Gis','A','Ais','H'];
export const CHROMATIC_FLAT  = ['C','Des','D','Es', 'E','F','Ges','G','As', 'A','B',  'H'];

// Semitone value for each Czech note name (including extended names)
const NOTE_SEMITONE = {
  C: 0,  Cis: 1,  Ces: 11,
  D: 2,  Dis: 3,  Des: 1,
  E: 4,  Eis: 5,  Es: 3,
  F: 5,  Fis: 6,  Fes: 4,
  G: 7,  Gis: 8,  Ges: 6,
  A: 9,  Ais: 10, As: 8,
  H: 11, His: 0,  B: 10,
  Fisis: 7, Gisis: 9, Cisis: 2,
};

export function noteNameToSemitone(name) {
  const s = NOTE_SEMITONE[name];
  if (s === undefined) throw new Error(`Unknown note name: ${name}`);
  return s;
}

// Map note name to accidental type: 'sharp', 'double-sharp', 'flat', or null
export function accidentalType(noteName) {
  if (noteName === 'B') return 'flat';
  const lower = noteName.toLowerCase();
  if (lower.endsWith('isis')) return 'double-sharp';
  if (lower.length > 1 && lower.endsWith('is')) return 'sharp';
  if (lower.endsWith('es') || lower.endsWith('as')) return 'flat';
  return null;
}

// Returns the diatonic letter of a Czech note name (strips accidentals)
export function diatonicLetter(noteName) {
  if (noteName === 'B') return 'H'; // B (Bb) uses H diatonic step
  return noteName[0].toUpperCase();
}

// ─── Scale catalog ──────────────────────────────────────────────────────────
//
// Each entry has predefined correct note names per music theory.
// For minor scales all 3 variants are stored.
//
// accidental classification (for UI filter):
//   'natural' = 0 key signature (C major, a minor) — shown in both # and b filters
//   'sharp'   = key uses sharps
//   'flat'    = key uses flats
//
// keySig: number of sharps (positive) or flats (negative), 0 for natural

export const SCALE_CATALOG = [
  // ── Major / Dur ──────────────────────────────────────────────────────────
  { id: 'C-major',   root: 'C',   semitone: 0,  type: 'major', accidental: 'natural', keySig: 0,
    notes: ['C','D','E','F','G','A','H','C'] },
  { id: 'G-major',   root: 'G',   semitone: 7,  type: 'major', accidental: 'sharp',   keySig: 1,
    notes: ['G','A','H','C','D','E','Fis','G'] },
  { id: 'D-major',   root: 'D',   semitone: 2,  type: 'major', accidental: 'sharp',   keySig: 2,
    notes: ['D','E','Fis','G','A','H','Cis','D'] },
  { id: 'A-major',   root: 'A',   semitone: 9,  type: 'major', accidental: 'sharp',   keySig: 3,
    notes: ['A','H','Cis','D','E','Fis','Gis','A'] },
  { id: 'E-major',   root: 'E',   semitone: 4,  type: 'major', accidental: 'sharp',   keySig: 4,
    notes: ['E','Fis','Gis','A','H','Cis','Dis','E'] },
  { id: 'H-major',   root: 'H',   semitone: 11, type: 'major', accidental: 'sharp',   keySig: 5,
    notes: ['H','Cis','Dis','E','Fis','Gis','Ais','H'] },
  { id: 'Fis-major', root: 'Fis', semitone: 6,  type: 'major', accidental: 'sharp',   keySig: 6,
    notes: ['Fis','Gis','Ais','H','Cis','Dis','Eis','Fis'] },
  { id: 'Cis-major', root: 'Cis', semitone: 1,  type: 'major', accidental: 'sharp',   keySig: 7,
    notes: ['Cis','Dis','Eis','Fis','Gis','Ais','His','Cis'] },
  { id: 'F-major',   root: 'F',   semitone: 5,  type: 'major', accidental: 'flat',    keySig: -1,
    notes: ['F','G','A','B','C','D','E','F'] },
  { id: 'B-major',   root: 'B',   semitone: 10, type: 'major', accidental: 'flat',    keySig: -2,
    notes: ['B','C','D','Es','F','G','A','B'] },
  { id: 'Es-major',  root: 'Es',  semitone: 3,  type: 'major', accidental: 'flat',    keySig: -3,
    notes: ['Es','F','G','As','B','C','D','Es'] },
  { id: 'As-major',  root: 'As',  semitone: 8,  type: 'major', accidental: 'flat',    keySig: -4,
    notes: ['As','B','C','Des','Es','F','G','As'] },
  { id: 'Des-major', root: 'Des', semitone: 1,  type: 'major', accidental: 'flat',    keySig: -5,
    notes: ['Des','Es','F','Ges','As','B','C','Des'] },
  { id: 'Ges-major', root: 'Ges', semitone: 6,  type: 'major', accidental: 'flat',    keySig: -6,
    notes: ['Ges','As','B','Ces','Des','Es','F','Ges'] },
  { id: 'Ces-major', root: 'Ces', semitone: 11, type: 'major', accidental: 'flat',    keySig: -7,
    notes: ['Ces','Des','Es','Fes','Ges','As','B','Ces'] },

  // ── Minor / Moll ─────────────────────────────────────────────────────────
  { id: 'a-minor',   root: 'a',   semitone: 9,  type: 'minor', accidental: 'natural', keySig: 0,
    notes:         ['A','H','C','D','E','F','G','A'],
    harmonicNotes: ['A','H','C','D','E','F','Gis','A'],
    melodicNotes:  ['A','H','C','D','E','Fis','Gis','A'] },
  { id: 'e-minor',   root: 'e',   semitone: 4,  type: 'minor', accidental: 'sharp',   keySig: 1,
    notes:         ['E','Fis','G','A','H','C','D','E'],
    harmonicNotes: ['E','Fis','G','A','H','C','Dis','E'],
    melodicNotes:  ['E','Fis','G','A','H','Cis','Dis','E'] },
  { id: 'h-minor',   root: 'h',   semitone: 11, type: 'minor', accidental: 'sharp',   keySig: 2,
    notes:         ['H','Cis','D','E','Fis','G','A','H'],
    harmonicNotes: ['H','Cis','D','E','Fis','G','Ais','H'],
    melodicNotes:  ['H','Cis','D','E','Fis','Gis','Ais','H'] },
  { id: 'fis-minor', root: 'fis', semitone: 6,  type: 'minor', accidental: 'sharp',   keySig: 3,
    notes:         ['Fis','Gis','A','H','Cis','D','E','Fis'],
    harmonicNotes: ['Fis','Gis','A','H','Cis','D','Eis','Fis'],
    melodicNotes:  ['Fis','Gis','A','H','Cis','Dis','Eis','Fis'] },
  { id: 'cis-minor', root: 'cis', semitone: 1,  type: 'minor', accidental: 'sharp',   keySig: 4,
    notes:         ['Cis','Dis','E','Fis','Gis','A','H','Cis'],
    harmonicNotes: ['Cis','Dis','E','Fis','Gis','A','His','Cis'],
    melodicNotes:  ['Cis','Dis','E','Fis','Gis','Ais','His','Cis'] },
  { id: 'gis-minor', root: 'gis', semitone: 8,  type: 'minor', accidental: 'sharp',   keySig: 5,
    notes:         ['Gis','Ais','H','Cis','Dis','E','Fis','Gis'],
    harmonicNotes: ['Gis','Ais','H','Cis','Dis','E','Fisis','Gis'],
    melodicNotes:  ['Gis','Ais','H','Cis','Dis','Eis','Fisis','Gis'] },
  { id: 'dis-minor', root: 'dis', semitone: 3,  type: 'minor', accidental: 'sharp',   keySig: 6,
    notes:         ['Dis','Eis','Fis','Gis','Ais','H','Cis','Dis'],
    harmonicNotes: ['Dis','Eis','Fis','Gis','Ais','H','Cisis','Dis'],
    melodicNotes:  ['Dis','Eis','Fis','Gis','Ais','His','Cisis','Dis'] },
  { id: 'ais-minor', root: 'ais', semitone: 10, type: 'minor', accidental: 'sharp',   keySig: 7,
    notes:         ['Ais','His','Cis','Dis','Eis','Fis','Gis','Ais'],
    harmonicNotes: ['Ais','His','Cis','Dis','Eis','Fis','Gisis','Ais'],
    melodicNotes:  ['Ais','His','Cis','Dis','Eis','Fisis','Gisis','Ais'] },
  { id: 'd-minor',   root: 'd',   semitone: 2,  type: 'minor', accidental: 'flat',    keySig: -1,
    notes:         ['D','E','F','G','A','B','C','D'],
    harmonicNotes: ['D','E','F','G','A','B','Cis','D'],
    melodicNotes:  ['D','E','F','G','A','H','Cis','D'] },
  { id: 'g-minor',   root: 'g',   semitone: 7,  type: 'minor', accidental: 'flat',    keySig: -2,
    notes:         ['G','A','B','C','D','Es','F','G'],
    harmonicNotes: ['G','A','B','C','D','Es','Fis','G'],
    melodicNotes:  ['G','A','B','C','D','E','Fis','G'] },
  { id: 'c-minor',   root: 'c',   semitone: 0,  type: 'minor', accidental: 'flat',    keySig: -3,
    notes:         ['C','D','Es','F','G','As','B','C'],
    harmonicNotes: ['C','D','Es','F','G','As','H','C'],
    melodicNotes:  ['C','D','Es','F','G','A','H','C'] },
  { id: 'f-minor',   root: 'f',   semitone: 5,  type: 'minor', accidental: 'flat',    keySig: -4,
    notes:         ['F','G','As','B','C','Des','Es','F'],
    harmonicNotes: ['F','G','As','B','C','Des','E','F'],
    melodicNotes:  ['F','G','As','B','C','D','E','F'] },
  { id: 'b-minor',   root: 'b',   semitone: 10, type: 'minor', accidental: 'flat',    keySig: -5,
    notes:         ['B','C','Des','Es','F','Ges','As','B'],
    harmonicNotes: ['B','C','Des','Es','F','Ges','A','B'],
    melodicNotes:  ['B','C','Des','Es','F','G','A','B'] },
  { id: 'es-minor',  root: 'es',  semitone: 3,  type: 'minor', accidental: 'flat',    keySig: -6,
    notes:         ['Es','F','Ges','As','B','Ces','Des','Es'],
    harmonicNotes: ['Es','F','Ges','As','B','Ces','D','Es'],
    melodicNotes:  ['Es','F','Ges','As','B','C','D','Es'] },
  { id: 'as-minor',  root: 'as',  semitone: 8,  type: 'minor', accidental: 'flat',    keySig: -7,
    notes:         ['As','B','Ces','Des','Es','Fes','Ges','As'],
    harmonicNotes: ['As','B','Ces','Des','Es','Fes','G','As'],
    melodicNotes:  ['As','B','Ces','Des','Es','F','G','As'] },
];

// ─── Scale generation ────────────────────────────────────────────────────────

// Assigns octaves and semitone numbers to a raw note-name array.
// When a note's semitone value is <= previous note's semitone, the octave increments.
function assignOctaves(noteNames, startOctave) {
  const result = [];
  let octave = startOctave;
  let prevSemitone = -1;
  for (const name of noteNames) {
    const semitone = noteNameToSemitone(name);
    if (prevSemitone !== -1 && semitone <= prevSemitone) octave++;
    result.push({ name, semitone, octave, midi: octave * 12 + semitone });
    prevSemitone = semitone;
  }
  return result;
}

// Returns 8 notes [{name, semitone, octave, midi}] for a scale.
// variant: 'natural' (default) | 'harmonic' | 'melodic' — only meaningful for minor.
export function generateScale(scaleId, startOctave = 4, variant = 'natural') {
  const entry = SCALE_CATALOG.find((s) => s.id === scaleId);
  if (!entry) throw new Error(`Unknown scale id: ${scaleId}`);
  const names = variant === 'harmonic' && entry.harmonicNotes ? entry.harmonicNotes
    : variant === 'melodic'  && entry.melodicNotes  ? entry.melodicNotes
    : entry.notes;
  return assignOctaves(names, startOctave);
}

// ─── Chord ───────────────────────────────────────────────────────────────────

export function getChordIndices() { return [0, 2, 4]; }

export function getChordNotes(scaleNotes) {
  return getChordIndices().map((i) => scaleNotes[i]);
}

// ─── Scale filtering (for UI) ────────────────────────────────────────────────

// filterType: Set of 'major' | 'minor'
// filterAcc:  Set of 'sharp' | 'flat'
// 'natural' scales always included when at least one type matches.
export function filteredScales(filterType, filterAcc) {
  return SCALE_CATALOG.filter((s) => {
    if (!filterType.has(s.type)) return false;
    if (s.accidental === 'natural') return true;
    return filterAcc.has(s.accidental);
  });
}

// ─── Alto Saxophone range ────────────────────────────────────────────────────

const FLAT_RANGE_SEMITONES = new Set([1, 3, 8, 10]); // Des Es As B

export const ALTO_SAX_LOW  = { name: 'B',   semitone: 10, octave: 3 };
export const ALTO_SAX_HIGH = { name: 'Fis', semitone: 6,  octave: 5 };

export function buildAltSaxRange() {
  const notes = [];
  let { semitone, octave } = ALTO_SAX_LOW;
  const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;
  while (true) {
    const midi = octave * 12 + semitone;
    if (midi > highMidi) break;
    const useFlats = CHROMATIC_FLAT[semitone] !== CHROMATIC_SHARP[semitone]
      && FLAT_RANGE_SEMITONES.has(semitone);
    notes.push({ name: useFlats ? CHROMATIC_FLAT[semitone] : CHROMATIC_SHARP[semitone], semitone, octave, midi });
    semitone++;
    if (semitone === 12) { semitone = 0; octave++; }
  }
  return notes;
}

// ─── Staff slot calculation ──────────────────────────────────────────────────

const DIATONIC_NAMES = ['C','D','E','F','G','A','H'];

export function noteToStaffSlot(noteName, octave) {
  const letter = diatonicLetter(noteName);
  const di = DIATONIC_NAMES.indexOf(letter);
  if (di === -1) throw new Error(`Unknown note letter: ${letter} from ${noteName}`);
  const absoluteStep = octave * 7 + di;
  const g4Step = 4 * 7 + 4; // G4: octave=4, di=4
  return absoluteStep - g4Step;
}

// ─── Legacy constants (kept for notation.js compatibility) ───────────────────
export const DIATONIC_LETTERS = DIATONIC_NAMES;
