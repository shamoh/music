// Czech note names for each semitone (0=C)
export const CHROMATIC_SHARP = ['C','Cis','D','Dis','E','F','Fis','G','Gis','A','Ais','H'];
export const CHROMATIC_FLAT  = ['C','Des','D','Es', 'E','F','Ges','G','As', 'A','B',  'H'];

// Diatonic note letters in order (used for staff slot calculation)
export const DIATONIC_LETTERS = ['C','D','E','F','G','A','H'];

export const SCALE_PATTERNS = {
  major:         [2,2,1,2,2,2,1],
  naturalMinor:  [2,1,2,2,1,2,2],
  harmonicMinor: [2,1,2,2,1,3,1],
  melodicMinor:  [2,1,2,2,2,2,1],
};

// Keys that prefer flat notation (by root semitone)
const FLAT_KEYS = new Set([1, 3, 5, 8, 10]); // Des, Es, Ges, As, B

export function preferFlats(rootSemitone) {
  return FLAT_KEYS.has(rootSemitone);
}

function chromaticName(semitone, useFlats) {
  return useFlats ? CHROMATIC_FLAT[semitone] : CHROMATIC_SHARP[semitone];
}

// Returns the diatonic letter of a Czech note name (strips accidentals)
export function diatonicLetter(noteName) {
  // Special: 'H' -> 'H', 'B' -> 'H' (both are the B diatonic step)
  if (noteName === 'B') return 'H';
  return noteName[0].toUpperCase();
}

// Alto Saxophone written range: Bb3 (semitone index) to F#5
// Written pitch = what the player reads in treble clef
// Bb3 = MIDI 58, but we track as {name, octave, semitone}
// Semitone within octave: C=0, Cis/Des=1, D=2, ... H=11
export const ALTO_SAX_LOW  = { name: 'B',   semitone: 10, octave: 3 }; // Bb3
export const ALTO_SAX_HIGH = { name: 'Fis', semitone: 6,  octave: 5 }; // F#5

// Build the complete Alto Sax written range as array of {name, semitone, octave}
export function buildAltSaxRange() {
  const notes = [];
  let { semitone, octave } = ALTO_SAX_LOW;
  const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;

  while (true) {
    const midi = octave * 12 + semitone;
    if (midi > highMidi) break;
    const useFlats = CHROMATIC_FLAT[semitone] !== CHROMATIC_SHARP[semitone]
      ? FLAT_KEYS.has(semitone)
      : false;
    notes.push({
      name: chromaticName(semitone, useFlats),
      semitone,
      octave,
      midi,
    });
    semitone++;
    if (semitone === 12) { semitone = 0; octave++; }
  }
  return notes;
}

// Generate 8-note scale starting from rootSemitone in given octave
export function generateScale(rootSemitone, scaleType, startOctave = 4) {
  const pattern = SCALE_PATTERNS[scaleType];
  if (!pattern) throw new Error(`Unknown scale type: ${scaleType}`);

  const useFlats = preferFlats(rootSemitone);
  const notes = [];
  let semitone = rootSemitone;
  let octave = startOctave;

  notes.push({ name: chromaticName(semitone, useFlats), semitone, octave, midi: octave * 12 + semitone });

  for (const interval of pattern) {
    semitone += interval;
    if (semitone >= 12) { semitone -= 12; octave++; }
    notes.push({ name: chromaticName(semitone, useFlats), semitone, octave, midi: octave * 12 + semitone });
  }

  return notes; // 8 notes (root + 7 steps)
}

// Returns indices [0, 2, 4] into scaleNotes (tonic triad: 1st, 3rd, 5th)
export function getChordIndices() {
  return [0, 2, 4];
}

// Returns the 3 chord notes from a scale
export function getChordNotes(scaleNotes) {
  return getChordIndices().map((i) => scaleNotes[i]);
}

// All root note options for the selector
export const ROOT_NOTES = [
  { semitone: 0,  name: 'C'   },
  { semitone: 1,  name: 'Des' },
  { semitone: 2,  name: 'D'   },
  { semitone: 3,  name: 'Es'  },
  { semitone: 4,  name: 'E'   },
  { semitone: 5,  name: 'F'   },
  { semitone: 6,  name: 'Fis' },
  { semitone: 7,  name: 'G'   },
  { semitone: 8,  name: 'As'  },
  { semitone: 9,  name: 'A'   },
  { semitone: 10, name: 'B'   },
  { semitone: 11, name: 'H'   },
];

export const SCALE_TYPES = [
  { key: 'major',         label: 'Dur'              },
  { key: 'naturalMinor',  label: 'Přirozená moll'   },
  { key: 'harmonicMinor', label: 'Harmonická moll'  },
  { key: 'melodicMinor',  label: 'Melodická moll'   },
];

// Map note name to accidental type: 'sharp', 'flat', or null
export function accidentalType(noteName) {
  if (CHROMATIC_SHARP.includes(noteName) && noteName !== CHROMATIC_FLAT[CHROMATIC_SHARP.indexOf(noteName)]) {
    const idx = CHROMATIC_SHARP.indexOf(noteName);
    if (CHROMATIC_SHARP[idx] !== CHROMATIC_FLAT[idx]) return 'sharp';
  }
  if (CHROMATIC_FLAT.includes(noteName)) {
    const idx = CHROMATIC_FLAT.indexOf(noteName);
    if (CHROMATIC_FLAT[idx] !== CHROMATIC_SHARP[idx]) return 'flat';
  }
  return null;
}

// Staff slot: diatonic position relative to G4=0 (used by notation.js)
// Each step = one line or space
const DIATONIC_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A H
const DIATONIC_NAMES     = ['C','D','E','F','G','A','H'];

export function noteToStaffSlot(noteName, octave) {
  const letter = diatonicLetter(noteName);
  const di = DIATONIC_NAMES.indexOf(letter);
  if (di === -1) throw new Error(`Unknown note letter: ${letter} from ${noteName}`);
  // Slot relative to G4=0: G is index 4 in diatonic scale
  // Each octave = 7 diatonic steps
  const absoluteStep = octave * 7 + di;
  const g4Step = 4 * 7 + 4; // G4: octave=4, di=4
  return absoluteStep - g4Step;
}
