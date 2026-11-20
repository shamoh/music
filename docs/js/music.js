// Czech note names for each semitone (0=C) — used for range display and accidental detection
export const CHROMATIC_SHARP = ['C','Cis','D','Dis','E','F','Fis','G','Gis','A','Ais','H'];
export const CHROMATIC_FLAT  = ['C','Des','D','Es', 'E','F','Ges','G','As', 'A','B',  'H'];

// Semitone value for each Czech note name (including extended names)
const NOTE_SEMITONE = {
  C: 0,  Cis: 1,   Cisis: 2,  Ces: 11,
  D: 2,  Dis: 3,              Des: 1,
  E: 4,  Eis: 5,   Es: 3,
  F: 5,  Fis: 6,   Fisis: 7,  Fes: 4,
  G: 7,  Gis: 8,   Gisis: 9,  Ges: 6,
  A: 9,  Ais: 10,             As: 8,
  H: 11, His: 0,              B: 10,
};

// Returns enharmonic equivalent { name, octave } for accidental notes, null for naturals.
// Covers: Cis/Des, Dis/Es, Fis/Ges, Gis/As, Ais/B, Eis/F, Fes/E, His/C (+1 oct), Ces/H (-1 oct),
// and double-sharps Fisis/G, Cisis/D, Gisis/A.
export function enharmonicEquivalent(name, octave) {
  const map = {
    Cis: { name: 'Des', dOct: 0 },  Des: { name: 'Cis', dOct: 0 },
    Dis: { name: 'Es',  dOct: 0 },  Es:  { name: 'Dis', dOct: 0 },
    Fis: { name: 'Ges', dOct: 0 },  Ges: { name: 'Fis', dOct: 0 },
    Gis: { name: 'As',  dOct: 0 },  As:  { name: 'Gis', dOct: 0 },
    Ais: { name: 'B',   dOct: 0 },  B:   { name: 'Ais', dOct: 0 },
    Eis: { name: 'F',   dOct: 0 },  Fes: { name: 'E',   dOct: 0 },
    His: { name: 'C',   dOct: +1 }, Ces: { name: 'H',   dOct: -1 },
    Fisis: { name: 'G', dOct: 0 },  Cisis: { name: 'D', dOct: 0 },
    Gisis: { name: 'A', dOct: 0 },
  };
  const eq = map[name];
  if (!eq) return null;
  return { name: eq.name, octave: octave + eq.dOct };
}

export function noteNameToSemitone(name) {
  const s = NOTE_SEMITONE[name];
  if (s === undefined) throw new Error(`Unknown note name: ${name}`);
  return s;
}

// Map note name to accidental type: 'sharp', 'double-sharp', 'flat', or null
export function accidentalType(noteName) {
  if (noteName === 'B') return 'flat';
  const lower = noteName.toLowerCase();
  if (lower.endsWith('isis')) return 'double-sharp'; // must check before 'is'
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

  // ── Whole-tone / Celotónová ──────────────────────────────────────────────
  //
  // Only 2 distinct whole-tone scales exist (every root maps to one of them).
  // accidental is always 'natural' — they sit outside the sharp/flat key-sig
  // classification and should always be shown regardless of that UI filter.
  { id: 'C-whole-tone',   root: 'C',   semitone: 0, type: 'whole-tone', accidental: 'natural', keySig: 0,
    notes: ['C','D','E','Fis','Gis','Ais','C'] },
  { id: 'Des-whole-tone', root: 'Des', semitone: 1, type: 'whole-tone', accidental: 'natural', keySig: 0,
    notes: ['Des','Es','F','G','A','H','Des'] },
];

// ── Major from a specific pitch / Dur od tónu ─────────────────────────────
//
// One entry per semitone from the lowest alto sax note (B3) up to A4,
// appended to SCALE_CATALOG below.

// Theoretical major keys (8–10 sharps, with double sharps) offered only as
// 'major-from' scales — in practice written as As, Es and B major.
const THEORETICAL_MAJOR = {
  Gis: { semitone: 8,  keySig: 8,  notes: ['Gis','Ais','His','Cis','Dis','Eis','Fisis','Gis'] },
  Dis: { semitone: 3,  keySig: 9,  notes: ['Dis','Eis','Fisis','Gis','Ais','His','Cisis','Dis'] },
  Ais: { semitone: 10, keySig: 10, notes: ['Ais','His','Cisis','Dis','Eis','Fisis','Gisis','Ais'] },
};

// Start pitches (written name + octave) for 'major-from' scales: every semitone
// from B3 to A4. Enharmonic pairs are listed sharp-first (Ais/B, H/Ces, Cis/Des,
// Dis/Es, Fis/Ges, Gis/As); Ais, Dis and Gis major come from THEORETICAL_MAJOR.
// Ces4 sounds as H3 (octave convention).
function majorFromStarts() {
  return [
    ['Ais', 3], ['B', 3], ['H', 3], ['Ces', 4], ['C', 4], ['Cis', 4], ['Des', 4], ['D', 4],
    ['Dis', 4], ['Es', 4], ['E', 4], ['F', 4], ['Fis', 4], ['Ges', 4], ['G', 4],
    ['Gis', 4], ['As', 4], ['A', 4],
  ];
}

// Builds 'major-from' entries. Catalog keys copy notes and key data from their
// base major entry (baseId); theoretical keys have no base entry.
function buildMajorFromEntries() {
  return majorFromStarts().map(([root, startOctave]) => {
    const common = { id: `${root}-major-from`, root, startOctave, type: 'major-from' };
    const theoretical = THEORETICAL_MAJOR[root];
    if (theoretical) return { ...common, accidental: 'sharp', ...theoretical };

    const base = SCALE_CATALOG.find((s) => s.id === `${root}-major`);
    if (!base) throw new Error(`Unknown base scale: ${root}-major`);

    return {
      ...common,
      baseId: base.id,
      semitone: base.semitone,
      accidental: base.accidental,
      keySig: base.keySig,
      notes: base.notes,
    };
  });
}

SCALE_CATALOG.push(...buildMajorFromEntries());

// Pitch number of a written note, accounting for Ces/His crossing the octave
// boundary (Ces4 sounds as H3, His3 sounds as C4).
export function notePitchMidi(name, octave) {
  const semitone = noteNameToSemitone(name);
  if (name === 'Ces') return (octave - 1) * 12 + 11;
  if (name === 'His') return (octave + 1) * 12;
  return octave * 12 + semitone;
}

// Pitch range { lowMidi, highMidi } of the one octave starting at the scale's
// start note, or null for scales without a fixed start pitch.
export function scaleFocusRange(entry) {
  if (!entry || entry.startOctave === undefined) return null;
  const lowMidi = notePitchMidi(entry.notes[0], entry.startOctave);
  return { lowMidi, highMidi: lowMidi + 12 };
}

// ─── Scale generation ────────────────────────────────────────────────────────

// Assigns octaves and semitone numbers to a raw note-name array.
// Octave increments when the diatonic letter steps backward (e.g. H→C).
// Semitone comparison fails for B→Ces (10→11 looks like same octave but Ces is C-flat in next octave).
function assignOctaves(noteNames, startOctave) {
  const result = [];
  let octave = startOctave;
  let prevDi = -1;
  for (const name of noteNames) {
    const letter = diatonicLetter(name);
    const di = DIATONIC_NAMES.indexOf(letter);
    if (prevDi !== -1 && di < prevDi) octave++;
    const semitone = noteNameToSemitone(name);
    result.push({ name, semitone, octave, midi: octave * 12 + semitone });
    prevDi = di;
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

// Returns the preferred start octave for displaying a scale on the staff.
// Prefers octave 3 when octave 4 would produce upper ledger lines (slot >= 8),
// but stays at octave 4 if the root note at octave 3 falls below the alto sax
// lowest playable note (Ais3/B3, MIDI 46) — A and As are the affected roots.
export function scaleStartOctave(scaleId) {
  const entry = SCALE_CATALOG.find((s) => s.id === scaleId);
  if (!entry) return 4;
  if (entry.startOctave !== undefined) return entry.startOctave;
  const notes4 = assignOctaves(entry.notes, 4);
  const maxSlot = Math.max(...notes4.map((n) => noteToStaffSlot(n.name, n.octave)));
  if (maxSlot < 8) return 4;
  const rootMidi3 = 3 * 12 + noteNameToSemitone(entry.notes[0]);
  const saxLowMidi = ALTO_SAX_LOW.octave * 12 + ALTO_SAX_LOW.semitone;
  return rootMidi3 < saxLowMidi ? 4 : 3;
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
// Sorted by key signature (sharps first); scales with a fixed start pitch
// ('major-from') are sorted by that pitch instead.
export function filteredScales(filterType, filterAcc) {
  const visible = SCALE_CATALOG.filter((s) => {
    if (!filterType.has(s.type)) return false;
    if (s.accidental === 'natural') return true;
    return filterAcc.has(s.accidental);
  });
  const byKeySig = visible.filter((s) => !scaleFocusRange(s)).sort((a, b) => b.keySig - a.keySig);
  const byPitch  = visible.filter((s) => scaleFocusRange(s))
    .sort((a, b) => scaleFocusRange(a).lowMidi - scaleFocusRange(b).lowMidi);

  return [...byKeySig, ...byPitch];
}

// Scales of the same type starting on the same pitch as entry (enharmonic
// 'major-from' pairs such as Ais/B), in catalog order — sharp spelling first.
// Scales without a fixed start pitch return just [entry].
export function scalePair(entry) {
  const focus = scaleFocusRange(entry);
  if (!focus) return [entry];

  return SCALE_CATALOG.filter((s) => s.type === entry.type && scaleFocusRange(s)?.lowMidi === focus.lowMidi);
}

// Keeps one scale per enharmonic pair: drops a scale whose pair leader
// (first of scalePair) is also in the list.
export function dedupePairs(scales) {
  return scales.filter((s) => {
    const leader = scalePair(s)[0];
    return leader === s || !scales.includes(leader);
  });
}

// Previous and next scale of scaleId within an ordered list (e.g. the result of
// filteredScales), the scales grouped by type in typeOrder — like the groups of the
// scale select. The first scale of a group steps back to the last scale of the previous
// group, the last one on to the first scale of the next group.
// Returns { prev, next }; null at the ends of the list or when the scale is not in it.
export function adjacentScales(scales, scaleId, typeOrder) {
  const ordered = typeOrder.flatMap((type) => scales.filter((s) => s.type === type));
  const idx = ordered.findIndex((s) => s.id === scaleId);
  if (idx < 0) return { prev: null, next: null };

  return { prev: ordered[idx - 1] ?? null, next: ordered[idx + 1] ?? null };
}

// Scales starting on the given written note, in catalog order.
// Scales without a fixed start pitch (dur, moll, whole-tone) match by pitch
// class, so enharmonic roots are included (Fis dur and Ges dur for Fis or Ges);
// 'major-from' scales must start on exactly that pitch (octave included).
export function scalesStartingAt(name, octave) {
  const semitone = noteNameToSemitone(name);
  const pitch = notePitchMidi(name, octave);

  return SCALE_CATALOG.filter((s) => {
    const focus = scaleFocusRange(s);
    return focus ? focus.lowMidi === pitch : s.semitone === semitone;
  });
}

// ─── Alto Saxophone range ────────────────────────────────────────────────────

export const ALTO_SAX_LOW  = { name: 'B',   semitone: 10, octave: 3 };
export const ALTO_SAX_HIGH = { name: 'F',   semitone: 5,  octave: 6 };

// The alto sax range is split into 4 sections fixed by pitch (frequency),
// independent of scale or key signature; the range staff tints them and the
// fingering chart puts each on its own row.
// App MIDI = octave*12 + semitone  (C4=48, H3=47).
// Ces/His cross octave boundaries: Ces4 pitchMidi=(4-1)*12+11=47, His3 pitchMidi=(3+1)*12=48.
//
// Sec 0 (≤47):   Ais3/B3  H3/Ces4
// Sec 1 (48–61): His3/C4  Cis4/Des4  D4  Dis4/Es4  E4/Fes4  Eis4/F4  Fis4/Ges4  G4  Gis4/As4  A4  Ais4/B4  H4/Ces5  His4/C5  Cis5/Des5
// Sec 2 (62–73): D5  Dis5/Es5  E5/Fes5  Eis5/F5  Fis5/Ges5  G5  Gis5/As5  A5  Ais5/B5  H5/Ces6  His5/C6  Cis6/Des6
// Sec 3 (≥74):   D6  Dis6/Es6  E6/Fes6  Eis6/F6
const ALTO_SAX_SECTION_MIDI_MAX = [47, 61, 73]; // section i = pitchMidi ≤ value[i]; section 3 = remainder

// Section index 0–3 of a written note within the alto sax range.
export function altSaxRangeSection(name, octave) {
  const midi = notePitchMidi(name, octave);
  const idx = ALTO_SAX_SECTION_MIDI_MAX.findIndex((max) => midi <= max);

  return idx === -1 ? 3 : idx;
}

// The note of the list with the same pitch as { name, octave } in any spelling
// (Fis4 finds Ges4, Ces5 finds H4), or undefined.
export function findSamePitch(notes, { name, octave }) {
  const pitch = notePitchMidi(name, octave);

  return notes.find((n) => notePitchMidi(n.name, n.octave) === pitch);
}

// The note `step` places above (+1) or below (-1) `current` among `notes`, ordered by
// pitch; `current` may be spelled differently. Stays on the matching note at either
// end. A `current` that is not among the notes (e.g. outside the scale) moves to the
// nearest note in the step's direction — undefined when there is none.
export function adjacentNote(notes, current, step) {
  const pitchOf = (n) => notePitchMidi(n.name, n.octave);
  const sorted = [...notes].sort((a, b) => pitchOf(a) - pitchOf(b));
  const match = findSamePitch(sorted, current);
  if (!match) {
    const pitch = pitchOf(current);

    return step > 0 ? sorted.find((n) => pitchOf(n) > pitch) : sorted.findLast((n) => pitchOf(n) < pitch);
  }
  const index = Math.min(sorted.length - 1, Math.max(0, sorted.indexOf(match) + step));

  return sorted[index];
}

// Where a note outside the scale lies: "mezi E a F♯" (between the nearest scale notes
// below and above, short names without octaves), "pod H" / "nad E" at an end of the
// notes; '' for no notes. lowercase=true for minor scales.
export function scaleNeighborsLabel(scaleNotes, note, lowercase = false) {
  const name = (n) => (lowercase ? shortNoteName(n.name).toLowerCase() : shortNoteName(n.name));
  const below = adjacentNote(scaleNotes, note, -1);
  const above = adjacentNote(scaleNotes, note, 1);
  if (below && above) return `mezi ${name(below)} a ${name(above)}`;
  if (above) return `pod ${name(above)}`;

  return below ? `nad ${name(below)}` : '';
}

// The note an octave above (+1) or below (-1) `current` among `notes` (in any spelling);
// stays on the matching note when the octave is not in the list (end of the range),
// undefined when no note has the pitch of `current`.
export function octaveNote(notes, current, direction) {
  const match = findSamePitch(notes, current);
  if (!match) return undefined;
  const pitch = notePitchMidi(match.name, match.octave) + 12 * direction;

  return notes.find((n) => notePitchMidi(n.name, n.octave) === pitch) ?? match;
}

// The lowest (end = -1) or highest (end = +1) note of `notes` by pitch, undefined for none.
export function rangeEndNote(notes, end) {
  const sorted = [...notes].sort((a, b) => notePitchMidi(a.name, a.octave) - notePitchMidi(b.name, b.octave));

  return end < 0 ? sorted[0] : sorted.at(-1);
}

// Notes of a range (e.g. the alto sax range in a scale's spelling) whose pitch
// class belongs to the scale, in the range's order and spelling.
export function rangeScaleNotes(rangeNotes, scaleNotes) {
  const semitones = new Set(scaleNotes.map((n) => noteNameToSemitone(n.name)));

  return rangeNotes.filter((n) => semitones.has(noteNameToSemitone(n.name)));
}

// useFlats=true → flat names for chromatic accidentals (Des/Es/As/B)
// useFlats=false → sharp names (Cis/Dis/Gis/Ais)
export function buildAltSaxRange(useFlats = true) {
  const notes = [];
  let { semitone, octave } = ALTO_SAX_LOW;
  const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;
  while (true) {
    const midi = octave * 12 + semitone;
    if (midi > highMidi) break;
    const name = (useFlats && CHROMATIC_FLAT[semitone] !== CHROMATIC_SHARP[semitone])
      ? CHROMATIC_FLAT[semitone]
      : CHROMATIC_SHARP[semitone];
    notes.push({ name, semitone, octave, midi });
    semitone++;
    if (semitone === 12) { semitone = 0; octave++; }
  }
  return notes;
}

// Build all occurrences of scale note names within the playable alto sax range, sorted by pitch.
// Takes the first 7 unique note names from scaleNotes and finds every occurrence in the range.
export function buildScaleRange(scaleNotes) {
  const seen = new Set();
  const entries = [];
  for (const n of scaleNotes.slice(0, 7)) {
    if (!seen.has(n.name)) {
      seen.add(n.name);
      entries.push({ name: n.name, semitone: noteNameToSemitone(n.name) });
    }
  }
  const lowMidi  = ALTO_SAX_LOW.octave  * 12 + ALTO_SAX_LOW.semitone;
  const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;

  const result = [];
  for (const { name, semitone } of entries) {
    for (let oct = 3; oct <= 6; oct++) {
      const midi = notePitchMidi(name, oct);
      if (midi >= lowMidi && midi <= highMidi) result.push({ name, semitone, octave: oct });
    }
  }
  return result.sort((a, b) => notePitchMidi(a.name, a.octave) - notePitchMidi(b.name, b.octave));
}

// ─── Enharmonic spellings (tooltip) ──────────────────────────────────────────

// Order of alternative spellings: natural, sharp, flat, double-sharp.
const SPELLING_ORDER = { null: 0, sharp: 1, flat: 2, 'double-sharp': 3 };

// All note names known to the app that sound at the same pitch as name+octave.
// The given note comes first, the alternatives follow in SPELLING_ORDER.
// e.g. ('E', 4) → [E4, Fes4]; ('C', 5) → [C5, His4]; ('G', 4) → [G4, Fisis4]
export function enharmonicSpellings(name, octave) {
  const pitch = notePitchMidi(name, octave);
  const alternatives = [];
  for (const other of Object.keys(NOTE_SEMITONE)) {
    if (other === name) continue;
    for (const oct of [octave - 1, octave, octave + 1]) {
      if (notePitchMidi(other, oct) === pitch) alternatives.push({ name: other, octave: oct });
    }
  }
  alternatives.sort((a, b) => SPELLING_ORDER[accidentalType(a.name)] - SPELLING_ORDER[accidentalType(b.name)]);

  return [{ name, octave }, ...alternatives];
}

// Every name of a pitch (enharmonicSpellings) in display order: natural name first,
// then the sharp ones (♯, ×) above the flat ones — the order of the full range staves.
// e.g. ('Es', 4) → [Dis4, Es4]; ('H', 3) → [H3, Ces4]; ('G', 4) → [G4, Fisis4]
const DISPLAY_SPELLING_ORDER = { null: 0, sharp: 1, 'double-sharp': 2, flat: 3 };

export function pitchSpellings(name, octave) {
  return enharmonicSpellings(name, octave)
    .sort((a, b) => DISPLAY_SPELLING_ORDER[accidentalType(a.name)] - DISPLAY_SPELLING_ORDER[accidentalType(b.name)]);
}

// Short letter + accidental symbol form of a Czech note name:
// 'Fis' → 'F♯', 'Es' → 'E♭', 'Fisis' → 'F×', 'C' → 'C'.
// 'B' (H-flat) stays 'B' — the usual Czech short name; its long name is 'Hes'.
export function shortNoteName(name) {
  if (name === 'B') return 'B';
  const acc = accidentalType(name);
  const symbol = acc === 'double-sharp' ? '×' : acc === 'sharp' ? '♯' : acc === 'flat' ? '♭' : '';

  return diatonicLetter(name) + symbol;
}

// Long (spelled-out) form of a Czech note name: the name itself, only B (H-flat)
// becomes 'Hes' — its short name is 'B' (see shortNoteName).
export function longNoteName(name) {
  return name === 'B' ? 'Hes' : name;
}

// Splits a tooltip label into parts, marking octave numbers so they can be
// styled less prominently: 'F♯5 – Fis5' →
// [{text:'F♯'}, {text:'5', octave:true}, {text:' – Fis'}, {text:'5', octave:true}]
export function splitOctaveNumbers(label) {
  return label.split(/(\d+)/)
    .filter((part) => part !== '')
    .map((part) => (/^\d+$/.test(part) ? { text: part, octave: true } : { text: part }));
}

// Parts of the short label drawn under a note on the staff: the letter and the
// accidental sign, so the sign can be drawn less prominently.
// 'Fis' → {letter:'F', accidental:'♯'}, 'Es' → {'E','♭'}, 'Fisis' → {'F','×'},
// 'B' → {'B',''} (Czech B is shown as is). lowercase=true for minor scales.
export function noteLabelParts(name, lowercase = false) {
  const letter = lowercase ? name[0].toLowerCase() : name[0].toUpperCase();
  if (name === 'B') return { letter, accidental: '' };
  const acc = accidentalType(name);
  const accidental = acc === 'double-sharp' ? '×' : acc === 'sharp' ? '♯' : acc === 'flat' ? '♭' : '';

  return { letter, accidental };
}

// Tooltip lines for a note: one line per enharmonic spelling, "F♯5 – Fis5".
// Natural notes show only the long name (short form would be identical).
// lowercase=true is used for minor scales.
export function noteTooltipLines(name, octave, lowercase = false) {
  return enharmonicSpellings(name, octave).map((n) => {
    const long      = longNoteName(n.name);
    const longName  = (lowercase ? long.toLowerCase() : long) + n.octave;
    if (accidentalType(n.name) === null) return longName;
    const shortName = (lowercase ? shortNoteName(n.name).toLowerCase() : shortNoteName(n.name)) + n.octave;

    return `${shortName} – ${longName}`;
  });
}

// ─── Scale summary labels (range page subtitle, scale select) ───────────────

// Key signature order; sharps 8–10 (theoretical Gis, Dis, Ais major) are double sharps.
const KEY_SIG_SHARP_ORDER = ['Fis', 'Cis', 'Gis', 'Dis', 'Ais', 'Eis', 'His', 'Fisis', 'Cisis', 'Gisis'];
const KEY_SIG_FLAT_ORDER  = ['B', 'Es', 'As', 'Des', 'Ges', 'Ces', 'Fes'];

const shortNames = (names) => names.map(shortNoteName).join(' ');

// "2 ♯ : F♯ C♯" / "3 ♭ : B E♭ A♭"; '' for no key signature.
export function keySignatureLabel(keySig) {
  if (keySig === 0) return '';
  if (keySig > 0) return `${keySig} ♯ : ${shortNames(KEY_SIG_SHARP_ORDER.slice(0, keySig))}`;
  const n = Math.abs(keySig);

  return `${n} ♭ : ${shortNames(KEY_SIG_FLAT_ORDER.slice(0, n))}`;
}

// Count and list of sharps and flats of a scale. Keyed scales (dur/moll) use
// their key signature; scales without one (whole-tone) list the accidentals of
// their own notes in scale order. '' when the scale has none.
export function scaleAccidentalsLabel(entry) {
  if (entry.keySig !== 0) return keySignatureLabel(entry.keySig);
  const unique = [...new Set(entry.notes)];
  const sharps = unique.filter((n) => ['sharp', 'double-sharp'].includes(accidentalType(n)));
  const flats  = unique.filter((n) => accidentalType(n) === 'flat');
  const groups = [];
  if (sharps.length) groups.push(`${sharps.length} ♯ : ${shortNames(sharps)}`);
  if (flats.length)  groups.push(`${flats.length} ♭ : ${shortNames(flats)}`);

  return groups.join('; ');
}

// Short scale name: 'F♯ dur', 'B dur', 'f♯ moll', 'C celotónová'.
// typeLabel is the Czech type word ('dur', 'moll', ...); minor roots stay lowercase.
export function shortScaleName(entry, typeLabel) {
  const root = shortNoteName(entry.root[0].toUpperCase() + entry.root.slice(1));

  return `${entry.type === 'minor' ? root.toLowerCase() : root} ${typeLabel}`;
}

// Short note names without octaves, separated by a middle dot:
// "B · C · D · E♭ · F · G · A · B" (lowercase for minor).
export function scaleNotesText(notes, lowercase = false) {
  return scaleNoteLabels(notes, lowercase).map((n) => n.label).join(' · ');
}

// The notes of scaleNotesText one by one, each with its pitch class, so they can be
// drawn (and clicked) separately: [{ label: 'F♯', semitone: 6 }, …].
export function scaleNoteLabels(notes, lowercase = false) {
  return notes.map((n) => ({
    label: lowercase ? shortNoteName(n.name).toLowerCase() : shortNoteName(n.name),
    semitone: noteNameToSemitone(n.name),
  }));
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

// ─── Inline accidentals (harmonic/melodic minor) ─────────────────────────────

const KEY_SIG_SHARP_LETTERS = ['F','C','G','D','A','E','H'];
const KEY_SIG_SHARP_NAMES   = ['Fis','Cis','Gis','Dis','Ais','Eis','His'];
const KEY_SIG_FLAT_LETTERS  = ['H','E','A','D','G','C','F'];
const KEY_SIG_FLAT_NAMES    = ['B','Es','As','Des','Ges','Ces','Fes'];

function buildKeySigMap(keySig) {
  const map = { C:'C', D:'D', E:'E', F:'F', G:'G', A:'A', H:'H' };
  if (keySig > 0) {
    for (let i = 0; i < keySig; i++) map[KEY_SIG_SHARP_LETTERS[i]] = KEY_SIG_SHARP_NAMES[i];
  } else {
    for (let i = 0; i < -keySig; i++) map[KEY_SIG_FLAT_LETTERS[i]] = KEY_SIG_FLAT_NAMES[i];
  }
  return map;
}

// Returns 'sharp' | 'flat' | 'natural' | null for each note — the inline
// accidental that must be shown before the note head on the staff.
// Tracks state within the sequence so that a ♮ on A forces an explicit ♯ on
// a following Ais (since the ♮ cancelled the key-signature sharp).
export function computeInlineAccidentals(noteNames, keySig) {
  const state = buildKeySigMap(keySig);
  return noteNames.map((name) => {
    const letter = diatonicLetter(name);
    const expected = state[letter];
    if (name === expected) return null;
    const acc = accidentalType(name);
    state[letter] = name;
    return acc ?? 'natural';
  });
}

// ─── Legacy constants (kept for notation.js compatibility) ───────────────────
export const DIATONIC_LETTERS = DIATONIC_NAMES;
