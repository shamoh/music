import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateScale,
  getChordNotes,
  noteToStaffSlot,
  buildAltSaxRange,
  altSaxRangeSection,
  rangeScaleNotes,
  findSamePitch,
  adjacentNote,
  scaleNeighborsLabel,
  octaveNote,
  rangeEndNote,
  buildScaleRange,
  accidentalType,
  filteredScales,
  noteNameToSemitone,
  computeInlineAccidentals,
  scaleStartOctave,
  enharmonicEquivalent,
  enharmonicSpellings,
  pitchSpellings,
  notePitchMidi,
  scaleFocusRange,
  adjacentScales,
  scalePair,
  dedupePairs,
  shortNoteName,
  noteTooltipLines,
  longNoteName,
  splitOctaveNumbers,
  noteLabelParts,
  keySignatureLabel,
  scaleAccidentalsLabel,
  scaleNotesText,
  scaleNoteLabels,
  scalesStartingAt,
  shortScaleName,
  SCALE_CATALOG,
  ALTO_SAX_LOW,
  ALTO_SAX_HIGH,
} from '../docs/js/music.js';
import { whenMusicFontReady, SMUFL } from '../docs/js/notation.js';
import { sectionTintVars, SECTION_TINTS, DEFAULT_SECTION_TINT_ID } from '../docs/js/themes.js';
import { readFileSync } from 'node:fs';
import { VISUAL_PROFILES, autoProfileId, resolveProfileId, migrateProfileChoice, AUTO_PROFILE_ID } from '../docs/js/themes.js';

describe('generateScale — major', () => {
  it('C major returns correct 8 note names', () => {
    const scale = generateScale('C-major', 4);
    assert.deepEqual(scale.map((n) => n.name), ['C','D','E','F','G','A','H','C']);
  });

  it('C major octaves: starts 4, ends 5', () => {
    const scale = generateScale('C-major', 4);
    assert.equal(scale[0].octave, 4);
    assert.equal(scale[7].octave, 5);
  });

  it('G major has Fis as 7th note', () => {
    const scale = generateScale('G-major', 4);
    assert.equal(scale[6].name, 'Fis');
  });

  it('Fis major uses Eis as 7th note (not F)', () => {
    const scale = generateScale('Fis-major', 4);
    assert.equal(scale[6].name, 'Eis');
  });

  it('Des major: correct flat note names', () => {
    const scale = generateScale('Des-major', 4);
    assert.deepEqual(scale.map((n) => n.name), ['Des','Es','F','Ges','As','B','C','Des']);
  });

  it('Ges major: includes Ces', () => {
    const scale = generateScale('Ges-major', 4);
    assert.deepEqual(scale.map((n) => n.name), ['Ges','As','B','Ces','Des','Es','F','Ges']);
  });

  it('throws on unknown scale id', () => {
    assert.throws(() => generateScale('X-major'), /Unknown scale id/);
  });
});

describe('generateScale — minor variants', () => {
  it('a minor natural', () => {
    const scale = generateScale('a-minor', 4);
    assert.deepEqual(scale.map((n) => n.name), ['A','H','C','D','E','F','G','A']);
  });

  it('a minor harmonic raises 7th to Gis', () => {
    const scale = generateScale('a-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'Gis');
  });

  it('a minor melodic raises 6th Fis and 7th Gis', () => {
    const scale = generateScale('a-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'Fis');
    assert.equal(scale[6].name, 'Gis');
  });

  it('d minor harmonic: C→Cis (7th)', () => {
    const scale = generateScale('d-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'Cis');
  });

  it('d minor melodic: B→H, C→Cis', () => {
    const scale = generateScale('d-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'H');
    assert.equal(scale[6].name, 'Cis');
  });

  it('c minor harmonic: B→H', () => {
    const scale = generateScale('c-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'H');
  });

  it('fis minor harmonic: E→Eis', () => {
    const scale = generateScale('fis-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'Eis');
  });

  it('cis minor harmonic: H→His', () => {
    const scale = generateScale('cis-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'His');
  });

  it('es minor has Ces in natural', () => {
    const scale = generateScale('es-minor', 4);
    assert.deepEqual(scale.map((n) => n.name), ['Es','F','Ges','As','B','Ces','Des','Es']);
  });

  it('es minor melodic raises Ces→C and Des→D', () => {
    const scale = generateScale('es-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'C');
    assert.equal(scale[6].name, 'D');
  });
});

describe('generateScale — new scales', () => {
  it('Cis major: correct 7-sharp note names', () => {
    const scale = generateScale('Cis-major', 4);
    assert.deepEqual(scale.map((n) => n.name), ['Cis','Dis','Eis','Fis','Gis','Ais','His','Cis']);
  });

  it('Ces major: correct 7-flat note names including Fes', () => {
    const scale = generateScale('Ces-major', 4);
    assert.deepEqual(scale.map((n) => n.name), ['Ces','Des','Es','Fes','Ges','As','B','Ces']);
  });

  it('gis minor harmonic: 7th is Fisis (double-sharp, same F-line as Fis)', () => {
    const scale = generateScale('gis-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'Fisis');
  });

  it('gis minor melodic: 6th is Eis, 7th is Fisis', () => {
    const scale = generateScale('gis-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'Eis');
    assert.equal(scale[6].name, 'Fisis');
  });

  it('dis minor harmonic: 7th is Cisis (double-sharp, same C-line as Cis)', () => {
    const scale = generateScale('dis-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'Cisis');
  });

  it('dis minor melodic: 6th is His, 7th is Cisis', () => {
    const scale = generateScale('dis-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'His');
    assert.equal(scale[6].name, 'Cisis');
  });

  it('ais minor harmonic: 7th is Gisis (double-sharp, same G-line as Gis)', () => {
    const scale = generateScale('ais-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'Gisis');
  });

  it('ais minor melodic: 6th is Fisis, 7th is Gisis', () => {
    const scale = generateScale('ais-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'Fisis');
    assert.equal(scale[6].name, 'Gisis');
  });

  it('as minor natural: includes Ces and Fes', () => {
    const scale = generateScale('as-minor', 4);
    assert.deepEqual(scale.map((n) => n.name), ['As','B','Ces','Des','Es','Fes','Ges','As']);
  });

  it('as minor harmonic: 7th is G (raised from Ges)', () => {
    const scale = generateScale('as-minor', 4, 'harmonic');
    assert.equal(scale[6].name, 'G');
  });

  it('as minor melodic: 6th is F, 7th is G', () => {
    const scale = generateScale('as-minor', 4, 'melodic');
    assert.equal(scale[5].name, 'F');
    assert.equal(scale[6].name, 'G');
  });
});

describe('generateScale — octave assignment', () => {
  it('G major: G4…G5', () => {
    const scale = generateScale('G-major', 4);
    assert.equal(scale[0].octave, 4);
    assert.equal(scale[7].octave, 5);
    assert.equal(scale[2].name, 'H');  // H4 (third note)
    assert.equal(scale[2].octave, 4);
    assert.equal(scale[3].name, 'C');  // C5 (octave jump)
    assert.equal(scale[3].octave, 5);
  });

  it('a minor: A4…A5', () => {
    const scale = generateScale('a-minor', 4);
    assert.equal(scale[0].octave, 4);
    assert.equal(scale[7].octave, 5);
    assert.equal(scale[1].name, 'H');   // H4
    assert.equal(scale[1].octave, 4);
    assert.equal(scale[2].name, 'C');   // C5
    assert.equal(scale[2].octave, 5);
  });
});

describe('generateScale — whole-tone', () => {
  it('C whole-tone: C D E Fis Gis Ais C', () => {
    const scale = generateScale('C-whole-tone', 4);
    assert.deepEqual(scale.map((n) => n.name), ['C','D','E','Fis','Gis','Ais','C']);
    assert.equal(scale[0].octave, 4);
    assert.equal(scale[6].octave, 5); // octave repeat of the root
  });

  it('Des whole-tone: Des Es F G A H Des', () => {
    const scale = generateScale('Des-whole-tone', 4);
    assert.deepEqual(scale.map((n) => n.name), ['Des','Es','F','G','A','H','Des']);
    assert.equal(scale[0].octave, 4);
    assert.equal(scale[6].octave, 5);
  });

  it('variant param is ignored (no harmonic/melodic variants)', () => {
    const scale = generateScale('C-whole-tone', 4, 'harmonic');
    assert.deepEqual(scale.map((n) => n.name), ['C','D','E','Fis','Gis','Ais','C']);
  });
});

describe('getChordNotes', () => {
  it('C major chord is C E G', () => {
    const scale = generateScale('C-major', 4);
    assert.deepEqual(getChordNotes(scale).map((n) => n.name), ['C','E','G']);
  });

  it('a minor chord is A C E', () => {
    const scale = generateScale('a-minor', 4);
    assert.deepEqual(getChordNotes(scale).map((n) => n.name), ['A','C','E']);
  });

  it('C whole-tone chord is the augmented triad C E Gis', () => {
    const scale = generateScale('C-whole-tone', 4);
    assert.deepEqual(getChordNotes(scale).map((n) => n.name), ['C','E','Gis']);
  });
});

describe('noteToStaffSlot', () => {
  it('G4 = slot 0',                () => assert.equal(noteToStaffSlot('G', 4), 0));
  it('E4 = slot -2 (1st line)',    () => assert.equal(noteToStaffSlot('E', 4), -2));
  it('C4 = slot -4 (middle C)',    () => assert.equal(noteToStaffSlot('C', 4), -4));
  it('F5 = slot 6 (top line)',     () => assert.equal(noteToStaffSlot('F', 5), 6));
  it('H3 = slot -5',               () => assert.equal(noteToStaffSlot('H', 3), -5));
  it('B maps to H diatonic slot',  () => assert.equal(noteToStaffSlot('B', 3), -5));
  it('A5 = slot 8',                () => assert.equal(noteToStaffSlot('A', 5), 8));
  it('Eis slot = E slot (same diatonic step)', () => {
    assert.equal(noteToStaffSlot('Eis', 4), noteToStaffSlot('E', 4));
  });
  it('Ces slot = C slot (same diatonic step)', () => {
    assert.equal(noteToStaffSlot('Ces', 5), noteToStaffSlot('C', 5));
  });
});

describe('buildAltSaxRange', () => {
  it('useFlats=true: starts at B3 (Bb3)',  () => { const r = buildAltSaxRange(true);  assert.equal(r[0].name, 'B');   assert.equal(r[0].octave, 3); });
  it('useFlats=false: starts at Ais3',     () => { const r = buildAltSaxRange(false); assert.equal(r[0].name, 'Ais'); assert.equal(r[0].octave, 3); });
  it('ends at F6',                         () => { const r = buildAltSaxRange(true);  const l = r[r.length-1]; assert.equal(l.name, 'F'); assert.equal(l.octave, 6); });
  it('contains 32 semitones',              () => assert.equal(buildAltSaxRange(true).length, 32));
});

describe('altSaxRangeSection', () => {
  it('puts B3 and H3 into section 0', () => {
    assert.equal(altSaxRangeSection('B', 3), 0);
    assert.equal(altSaxRangeSection('H', 3), 0);
  });
  it('splits sections at C4, D5 and D6', () => {
    assert.equal(altSaxRangeSection('C', 4), 1);
    assert.equal(altSaxRangeSection('Cis', 5), 1);
    assert.equal(altSaxRangeSection('D', 5), 2);
    assert.equal(altSaxRangeSection('Des', 6), 2);
    assert.equal(altSaxRangeSection('D', 6), 3);
    assert.equal(altSaxRangeSection('F', 6), 3);
  });
  it('uses the pitch, not the spelling (Ces4 = H3, His3 = C4)', () => {
    assert.equal(altSaxRangeSection('Ces', 4), 0);
    assert.equal(altSaxRangeSection('His', 3), 1);
  });
  it('divides the full range into 2 + 14 + 12 + 4 notes', () => {
    const counts = [0, 0, 0, 0];
    for (const n of buildAltSaxRange(true)) counts[altSaxRangeSection(n.name, n.octave)]++;
    assert.deepEqual(counts, [2, 14, 12, 4]);
  });
});

describe('accidentalType', () => {
  it('C → null',              () => assert.equal(accidentalType('C'), null));
  it('H → null',              () => assert.equal(accidentalType('H'), null));
  it('Fis → sharp',           () => assert.equal(accidentalType('Fis'), 'sharp'));
  it('Es → flat',             () => assert.equal(accidentalType('Es'), 'flat'));
  it('B → flat',              () => assert.equal(accidentalType('B'), 'flat'));
  it('Ces → flat',            () => assert.equal(accidentalType('Ces'), 'flat'));
  it('Eis → sharp',           () => assert.equal(accidentalType('Eis'), 'sharp'));
  it('His → sharp',           () => assert.equal(accidentalType('His'), 'sharp'));
  it('As → flat',             () => assert.equal(accidentalType('As'), 'flat'));
  it('Ais → sharp',           () => assert.equal(accidentalType('Ais'), 'sharp'));
  it('Fisis → double-sharp',  () => assert.equal(accidentalType('Fisis'), 'double-sharp'));
  it('Cisis → double-sharp',  () => assert.equal(accidentalType('Cisis'), 'double-sharp'));
  it('Gisis → double-sharp',  () => assert.equal(accidentalType('Gisis'), 'double-sharp'));
});

describe('noteNameToSemitone', () => {
  it('C = 0',      () => assert.equal(noteNameToSemitone('C'), 0));
  it('Ces = 11',   () => assert.equal(noteNameToSemitone('Ces'), 11));
  it('Eis = 5',    () => assert.equal(noteNameToSemitone('Eis'), 5));
  it('His = 0',    () => assert.equal(noteNameToSemitone('His'), 0));
  it('B = 10',     () => assert.equal(noteNameToSemitone('B'), 10));
  it('Ges = 6',    () => assert.equal(noteNameToSemitone('Ges'), 6));
  it('Fisis = 7',  () => assert.equal(noteNameToSemitone('Fisis'), 7));
  it('Cisis = 2',  () => assert.equal(noteNameToSemitone('Cisis'), 2));
  it('Gisis = 9',  () => assert.equal(noteNameToSemitone('Gisis'), 9));
});

describe('filteredScales', () => {
  it('major + minor returns all 30 dur/moll scales', () => {
    const result = filteredScales(new Set(['major','minor']), new Set(['sharp','flat']));
    assert.equal(result.length, 30);
  });

  it('whole-tone returns both whole-tone scales regardless of acc filter', () => {
    const result = filteredScales(new Set(['whole-tone']), new Set());
    assert.equal(result.length, 2);
    const ids = result.map((s) => s.id);
    assert.ok(ids.includes('C-whole-tone'));
    assert.ok(ids.includes('Des-whole-tone'));
  });

  it('major + minor + whole-tone + major-from returns the full catalog', () => {
    const result = filteredScales(new Set(['major','minor','whole-tone','major-from']), new Set(['sharp','flat']));
    assert.equal(result.length, SCALE_CATALOG.length);
    assert.equal(result.length, 50);
  });

  it('major-from returns all 18 scales with both acc filters', () => {
    const result = filteredScales(new Set(['major-from']), new Set(['sharp','flat']));
    assert.equal(result.length, 18);
  });

  it('major-from respects the acc filter (flat → B, Ces, C, Des, Es, F, Ges, As)', () => {
    const result = filteredScales(new Set(['major-from']), new Set(['flat']));
    assert.deepEqual(result.map((s) => s.root).sort(), ['As','B','C','Ces','Des','Es','F','Ges']);
  });

  it('major only returns 15 scales', () => {
    const result = filteredScales(new Set(['major']), new Set(['sharp','flat']));
    assert.equal(result.length, 15);
    assert.ok(result.every((s) => s.type === 'major'));
  });

  it('minor only returns 15 scales', () => {
    const result = filteredScales(new Set(['minor']), new Set(['sharp','flat']));
    assert.equal(result.length, 15);
    assert.ok(result.every((s) => s.type === 'minor'));
  });

  it('sharp filter includes natural scales', () => {
    const result = filteredScales(new Set(['major','minor']), new Set(['sharp']));
    const ids = result.map((s) => s.id);
    assert.ok(ids.includes('C-major'));  // natural → included
    assert.ok(ids.includes('a-minor'));  // natural → included
    assert.ok(ids.includes('G-major'));  // sharp → included
    assert.ok(!ids.includes('F-major')); // flat → excluded
    assert.ok(!ids.includes('d-minor')); // flat → excluded
  });

  it('flat filter excludes sharp scales', () => {
    const result = filteredScales(new Set(['major']), new Set(['flat']));
    assert.ok(result.every((s) => s.accidental !== 'sharp'));
  });

  it('minor + sharp returns 8 scales (natural + 7 sharp minors)', () => {
    const result = filteredScales(new Set(['minor']), new Set(['sharp']));
    assert.equal(result.length, 8);
    const ids = result.map((s) => s.id);
    assert.ok(ids.includes('a-minor'));
    assert.ok(ids.includes('cis-minor'));
    assert.ok(ids.includes('gis-minor'));
    assert.ok(ids.includes('dis-minor'));
    assert.ok(ids.includes('ais-minor'));
    assert.ok(!ids.includes('d-minor'));
    assert.ok(!ids.includes('as-minor'));
  });
});

describe('computeInlineAccidentals', () => {
  it('C major: all null', () => {
    assert.deepEqual(
      computeInlineAccidentals(['C','D','E','F','G','A','H','C'], 0),
      Array(8).fill(null)
    );
  });

  it('G major: all null (Fis already in key sig)', () => {
    assert.deepEqual(
      computeInlineAccidentals(['G','A','H','C','D','E','Fis','G'], 1),
      Array(8).fill(null)
    );
  });

  it('a minor natural: all null', () => {
    assert.deepEqual(
      computeInlineAccidentals(['A','H','C','D','E','F','G','A'], 0),
      Array(8).fill(null)
    );
  });

  it('a minor harmonic: Gis gets sharp', () => {
    const r = computeInlineAccidentals(['A','H','C','D','E','F','Gis','A'], 0);
    assert.equal(r[6], 'sharp');
    assert.deepEqual(r.filter(Boolean), ['sharp']);
  });

  it('a minor melodic: Fis sharp, Gis sharp', () => {
    const r = computeInlineAccidentals(['A','H','C','D','E','Fis','Gis','A'], 0);
    assert.equal(r[5], 'sharp');
    assert.equal(r[6], 'sharp');
  });

  it('c minor harmonic: H gets natural (cancels key-sig B)', () => {
    const r = computeInlineAccidentals(['C','D','Es','F','G','As','H','C'], -3);
    assert.equal(r[6], 'natural');
    assert.deepEqual(r.filter(Boolean), ['natural']);
  });

  it('d minor harmonic: Cis gets sharp', () => {
    const r = computeInlineAccidentals(['D','E','F','G','A','B','Cis','D'], -1);
    assert.equal(r[6], 'sharp');
  });

  it('ais minor harmonic: Gisis gets double-sharp (no conflict with root Ais)', () => {
    const r = computeInlineAccidentals(['Ais','His','Cis','Dis','Eis','Fis','Gisis','Ais'], 7);
    assert.equal(r[6], 'double-sharp');
    assert.deepEqual(r.filter(Boolean), ['double-sharp']);
  });

  it('gis minor harmonic: Fisis gets double-sharp (no conflict with root Gis)', () => {
    const r = computeInlineAccidentals(['Gis','Ais','H','Cis','Dis','E','Fisis','Gis'], 5);
    assert.equal(r[6], 'double-sharp');
    assert.deepEqual(r.filter(Boolean), ['double-sharp']);
  });

  it('dis minor harmonic: Cisis gets double-sharp (no conflict with root Dis)', () => {
    const r = computeInlineAccidentals(['Dis','Eis','Fis','Gis','Ais','H','Cisis','Dis'], 6);
    assert.equal(r[6], 'double-sharp');
    assert.deepEqual(r.filter(Boolean), ['double-sharp']);
  });

  it('gis minor melodic: Eis sharp, Fisis double-sharp', () => {
    const r = computeInlineAccidentals(['Gis','Ais','H','Cis','Dis','Eis','Fisis','Gis'], 5);
    assert.equal(r[5], 'sharp');
    assert.equal(r[6], 'double-sharp');
    assert.equal(r[7], null);
  });

  it('dis minor melodic: His sharp, Cisis double-sharp', () => {
    const r = computeInlineAccidentals(['Dis','Eis','Fis','Gis','Ais','His','Cisis','Dis'], 6);
    assert.equal(r[5], 'sharp');
    assert.equal(r[6], 'double-sharp');
    assert.equal(r[7], null);
  });

  it('ais minor melodic: Fisis double-sharp, Gisis double-sharp', () => {
    const r = computeInlineAccidentals(['Ais','His','Cis','Dis','Eis','Fisis','Gisis','Ais'], 7);
    assert.equal(r[5], 'double-sharp');
    assert.equal(r[6], 'double-sharp');
    assert.equal(r[7], null);
  });

  it('es minor melodic: C natural, D natural', () => {
    const r = computeInlineAccidentals(['Es','F','Ges','As','B','C','D','Es'], -6);
    assert.equal(r[5], 'natural');
    assert.equal(r[6], 'natural');
  });

  it('C whole-tone: only Fis, Gis, Ais get an inline sharp', () => {
    const r = computeInlineAccidentals(['C','D','E','Fis','Gis','Ais','C'], 0);
    assert.deepEqual(r, [null, null, null, 'sharp', 'sharp', 'sharp', null]);
  });

  it('Des whole-tone: only Des, Es get an inline flat', () => {
    const r = computeInlineAccidentals(['Des','Es','F','G','A','H','Des'], 0);
    assert.deepEqual(r, ['flat', 'flat', null, null, null, null, null]);
  });
});

describe('enharmonicEquivalent', () => {
  it('Cis4 → Des4',       () => assert.deepEqual(enharmonicEquivalent('Cis', 4), { name: 'Des', octave: 4 }));
  it('Des4 → Cis4',       () => assert.deepEqual(enharmonicEquivalent('Des', 4), { name: 'Cis', octave: 4 }));
  it('Fis4 → Ges4',       () => assert.deepEqual(enharmonicEquivalent('Fis', 4), { name: 'Ges', octave: 4 }));
  it('Ges4 → Fis4',       () => assert.deepEqual(enharmonicEquivalent('Ges', 4), { name: 'Fis', octave: 4 }));
  it('Ais4 → B4',         () => assert.deepEqual(enharmonicEquivalent('Ais', 4), { name: 'B',   octave: 4 }));
  it('B4 → Ais4',         () => assert.deepEqual(enharmonicEquivalent('B',   4), { name: 'Ais', octave: 4 }));
  it('Eis4 → F4',         () => assert.deepEqual(enharmonicEquivalent('Eis', 4), { name: 'F',   octave: 4 }));
  it('Fes4 → E4',         () => assert.deepEqual(enharmonicEquivalent('Fes', 4), { name: 'E',   octave: 4 }));
  it('His4 → C5',         () => assert.deepEqual(enharmonicEquivalent('His', 4), { name: 'C',   octave: 5 }));
  it('Ces4 → H3',         () => assert.deepEqual(enharmonicEquivalent('Ces', 4), { name: 'H',   octave: 3 }));
  it('Fisis4 → G4',       () => assert.deepEqual(enharmonicEquivalent('Fisis', 4), { name: 'G', octave: 4 }));
  it('Cisis4 → D4',       () => assert.deepEqual(enharmonicEquivalent('Cisis', 4), { name: 'D', octave: 4 }));
  it('Gisis4 → A4',       () => assert.deepEqual(enharmonicEquivalent('Gisis', 4), { name: 'A', octave: 4 }));
  it('natural C → null',  () => assert.equal(enharmonicEquivalent('C', 4), null));
  it('natural G → null',  () => assert.equal(enharmonicEquivalent('G', 4), null));
  it('natural H → null',  () => assert.equal(enharmonicEquivalent('H', 4), null));
});

describe('buildScaleRange', () => {
  it('C major: 7 unique names, sorted ascending by pitch', () => {
    const scale = generateScale('C-major', 4);
    const range = buildScaleRange(scale);
    const names = range.map((n) => n.name);
    assert.ok(names.every((n) => ['C','D','E','F','G','A','H'].includes(n)));
    for (let i = 1; i < range.length; i++) {
      const prev = range[i - 1];
      const curr = range[i];
      const midiOf = (n) => n.octave * 12 + n.semitone;
      assert.ok(midiOf(curr) > midiOf(prev), `should be ascending at index ${i}`);
    }
  });

  it('C major: all notes within alto sax range', () => {
    const scale = generateScale('C-major', 4);
    const range = buildScaleRange(scale);
    const lowMidi  = ALTO_SAX_LOW.octave  * 12 + ALTO_SAX_LOW.semitone;
    const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;
    range.forEach((n) => {
      const midi = n.octave * 12 + n.semitone;
      assert.ok(midi >= lowMidi && midi <= highMidi, `${n.name}${n.octave} midi=${midi} out of range`);
    });
  });

  it('C major: C appears in octaves 4, 5, 6', () => {
    const scale = generateScale('C-major', 4);
    const range = buildScaleRange(scale);
    const cOctaves = range.filter((n) => n.name === 'C').map((n) => n.octave);
    assert.deepEqual(cOctaves, [4, 5, 6]);
  });

  it('a minor natural: A appears in octaves 4, 5, 6', () => {
    const scale = generateScale('a-minor', 4, 'natural');
    const range = buildScaleRange(scale);
    const aOctaves = range.filter((n) => n.name === 'A').map((n) => n.octave);
    assert.ok(aOctaves.includes(4) && aOctaves.includes(5));
  });

  it('Fis major: Fis in result (semitone 6)', () => {
    const scale = generateScale('Fis-major', 4);
    const range = buildScaleRange(scale);
    assert.ok(range.some((n) => n.name === 'Fis'));
  });

  it('Ces major: Ces pitch-MIDI correction keeps notes in range', () => {
    const scale = generateScale('Ces-major', 4);
    const range = buildScaleRange(scale);
    const cesNotes = range.filter((n) => n.name === 'Ces');
    const lowMidi  = ALTO_SAX_LOW.octave  * 12 + ALTO_SAX_LOW.semitone;
    const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;
    cesNotes.forEach((n) => {
      const pitchMidi = (n.octave - 1) * 12 + 11;
      assert.ok(pitchMidi >= lowMidi && pitchMidi <= highMidi);
    });
  });

  it('fis minor harmonic: Eis in result', () => {
    const scale = generateScale('fis-minor', 4, 'harmonic');
    const range = buildScaleRange(scale);
    assert.ok(range.some((n) => n.name === 'Eis'));
  });

  it('C whole-tone: only the 6 scale names, all within alto sax range', () => {
    const scale = generateScale('C-whole-tone', 4);
    const range = buildScaleRange(scale);
    const lowMidi  = ALTO_SAX_LOW.octave  * 12 + ALTO_SAX_LOW.semitone;
    const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;
    assert.ok(range.every((n) => ['C','D','E','Fis','Gis','Ais'].includes(n.name)));
    range.forEach((n) => {
      const midi = n.octave * 12 + n.semitone;
      assert.ok(midi >= lowMidi && midi <= highMidi);
    });
  });
});

describe('scaleStartOctave', () => {
  // Scales that shift to octave 3 (avoids upper ledger lines, root >= Ais3/B3 sax minimum)
  it('H major → octave 3 (H5=slot9, H3=MIDI47≥46)', () => assert.equal(scaleStartOctave('H-major'), 3));
  it('B major → octave 3 (B5=slot9, B3=MIDI46=sax low)', () => assert.equal(scaleStartOctave('B-major'), 3));
  it('h minor → octave 3 (H5=slot9, H3=MIDI47≥46)', () => assert.equal(scaleStartOctave('h-minor'), 3));
  it('ais minor → octave 3 (Ais5=slot8, Ais3=MIDI46=sax low)', () => assert.equal(scaleStartOctave('ais-minor'), 3));
  it('b minor → octave 3 (B5=slot9, B3=MIDI46=sax low)', () => assert.equal(scaleStartOctave('b-minor'), 3));

  // Scales that stay at octave 4: root at octave 3 would be below sax range (A3/As3 < Ais3)
  it('A major → octave 4 (A3=MIDI45 < sax low 46)', () => assert.equal(scaleStartOctave('A-major'), 4));
  it('As major → octave 4 (As3=MIDI44 < sax low 46)', () => assert.equal(scaleStartOctave('As-major'), 4));
  it('a minor → octave 4 (A3=MIDI45 < sax low 46)', () => assert.equal(scaleStartOctave('a-minor'), 4));
  it('as minor → octave 4 (As3=MIDI44 < sax low 46)', () => assert.equal(scaleStartOctave('as-minor'), 4));

  // Scales that fit within the staff or reach only the space above → use octave 4
  it('C major → octave 4',   () => assert.equal(scaleStartOctave('C-major'), 4));
  it('G major → octave 4 (G5 = slot 7, space, no ledger)', () => assert.equal(scaleStartOctave('G-major'), 4));
  it('gis minor → octave 4 (Gis5 = slot 7)', () => assert.equal(scaleStartOctave('gis-minor'), 4));
  it('e minor → octave 4',   () => assert.equal(scaleStartOctave('e-minor'), 4));
  it('d minor → octave 4',   () => assert.equal(scaleStartOctave('d-minor'), 4));
  it('Ces major → octave 4', () => assert.equal(scaleStartOctave('Ces-major'), 4));
});

describe('major-from catalog entries', () => {
  const entries = SCALE_CATALOG.filter((s) => s.type === 'major-from');

  it('has 18 entries Ais3/B3 … A4 including both spellings of every black key and H/Ces', () => {
    assert.deepEqual(entries.map((e) => `${e.root}${e.startOctave}`), [
      'Ais3', 'B3', 'H3', 'Ces4', 'C4', 'Cis4', 'Des4', 'D4', 'Dis4', 'Es4', 'E4', 'F4',
      'Fis4', 'Ges4', 'G4', 'Gis4', 'As4', 'A4',
    ]);
  });

  it('ids carry no start octave and are unique', () => {
    assert.equal(entries[1].id, 'B-major-from');
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
  });

  it('start pitches rise by semitone from the alto sax low note to A4', () => {
    const pitches = entries.map((e) => scaleFocusRange(e).lowMidi);
    assert.deepEqual(pitches, [46, 46, 47, 47, 48, 49, 49, 50, 51, 51, 52, 53, 54, 54, 55, 56, 56, 57]);
    assert.equal(pitches[0], ALTO_SAX_LOW.octave * 12 + ALTO_SAX_LOW.semitone);
  });

  it('copies notes and key data from the base major scale', () => {
    for (const e of entries.filter((x) => x.baseId)) {
      const base = SCALE_CATALOG.find((s) => s.id === e.baseId);
      assert.ok(base, e.baseId);
      assert.equal(base.type, 'major');
      assert.deepEqual(e.notes, base.notes);
      assert.equal(e.keySig, base.keySig);
      assert.equal(e.accidental, base.accidental);
      assert.equal(e.root, base.root);
    }
  });

  it('theoretical keys Ais, Dis, Gis have no base entry and use double sharps', () => {
    const byRoot = Object.fromEntries(entries.map((e) => [e.root, e]));
    assert.deepEqual(byRoot.Gis.notes, ['Gis','Ais','His','Cis','Dis','Eis','Fisis','Gis']);
    assert.deepEqual(byRoot.Dis.notes, ['Dis','Eis','Fisis','Gis','Ais','His','Cisis','Dis']);
    assert.deepEqual(byRoot.Ais.notes, ['Ais','His','Cisis','Dis','Eis','Fisis','Gisis','Ais']);
    for (const root of ['Gis', 'Dis', 'Ais']) {
      assert.equal(byRoot[root].baseId, undefined);
      assert.equal(byRoot[root].accidental, 'sharp');
    }
    assert.deepEqual([byRoot.Gis.keySig, byRoot.Dis.keySig, byRoot.Ais.keySig], [8, 9, 10]);
    assert.equal(SCALE_CATALOG.find((s) => s.id === 'Dis-major'), undefined);
  });

  it('every major-from scale follows the major pattern 2-2-1-2-2-2-1', () => {
    for (const e of entries) {
      const scale = generateScale(e.id, scaleStartOctave(e.id));
      const pitches = scale.map((n) => notePitchMidi(n.name, n.octave));
      const steps = pitches.slice(1).map((p, i) => p - pitches[i]);
      assert.deepEqual(steps, [2, 2, 1, 2, 2, 2, 1], e.id);
    }
  });

  it('enharmonic pairs start on the same pitch (Ais/B, Dis/Es, Gis/As)', () => {
    const lowMidi = (id) => scaleFocusRange(SCALE_CATALOG.find((s) => s.id === id)).lowMidi;
    assert.equal(lowMidi('Ais-major-from'), lowMidi('B-major-from'));
    assert.equal(lowMidi('Dis-major-from'), lowMidi('Es-major-from'));
    assert.equal(lowMidi('Gis-major-from'), lowMidi('As-major-from'));
  });

  it('scaleStartOctave returns the fixed start octave', () => {
    assert.equal(scaleStartOctave('B-major-from'), 3);
    assert.equal(scaleStartOctave('A-major-from'), 4);
  });

  it('generateScale B-major-from: B3 … B4', () => {
    const scale = generateScale('B-major-from', scaleStartOctave('B-major-from'));
    assert.deepEqual(scale.map((n) => n.name + n.octave), ['B3','C4','D4','Es4','F4','G4','A4','B4']);
  });

  it('generateScale Ces-major-from starts at the pitch of H3', () => {
    const scale = generateScale('Ces-major-from', scaleStartOctave('Ces-major-from'));
    assert.equal(notePitchMidi(scale[0].name, scale[0].octave), 47);
    assert.equal(notePitchMidi(scale[7].name, scale[7].octave), 59);
  });
});

describe('scaleFocusRange', () => {
  it('B3 → one octave 46..58', () => {
    const entry = SCALE_CATALOG.find((s) => s.id === 'B-major-from');
    assert.deepEqual(scaleFocusRange(entry), { lowMidi: 46, highMidi: 58 });
  });

  it('Ces4 → 47..59 (Ces4 sounds as H3)', () => {
    const entry = SCALE_CATALOG.find((s) => s.id === 'Ces-major-from');
    assert.deepEqual(scaleFocusRange(entry), { lowMidi: 47, highMidi: 59 });
  });

  it('regular scales have no focus range', () => {
    assert.equal(scaleFocusRange(SCALE_CATALOG.find((s) => s.id === 'B-major')), null);
    assert.equal(scaleFocusRange(undefined), null);
  });
});

describe('notePitchMidi', () => {
  it('regular note', () => assert.equal(notePitchMidi('Fis', 4), 54));
  it('Ces4 = H3',     () => assert.equal(notePitchMidi('Ces', 4), notePitchMidi('H', 3)));
  it('His3 = C4',     () => assert.equal(notePitchMidi('His', 3), notePitchMidi('C', 4)));
  it('Fes4 = E4',     () => assert.equal(notePitchMidi('Fes', 4), notePitchMidi('E', 4)));
});

describe('enharmonicSpellings', () => {
  const fmt = (list) => list.map((n) => n.name + n.octave);

  it('E4 → E4, Fes4',     () => assert.deepEqual(fmt(enharmonicSpellings('E', 4)), ['E4','Fes4']));
  it('F4 → F4, Eis4',     () => assert.deepEqual(fmt(enharmonicSpellings('F', 4)), ['F4','Eis4']));
  it('C5 → C5, His4',     () => assert.deepEqual(fmt(enharmonicSpellings('C', 5)), ['C5','His4']));
  it('H3 → H3, Ces4',     () => assert.deepEqual(fmt(enharmonicSpellings('H', 3)), ['H3','Ces4']));
  it('G4 → G4, Fisis4',   () => assert.deepEqual(fmt(enharmonicSpellings('G', 4)), ['G4','Fisis4']));
  it('D4 → D4, Cisis4',   () => assert.deepEqual(fmt(enharmonicSpellings('D', 4)), ['D4','Cisis4']));
  it('A4 → A4, Gisis4',   () => assert.deepEqual(fmt(enharmonicSpellings('A', 4)), ['A4','Gisis4']));
  it('Fis5 → Fis5, Ges5', () => assert.deepEqual(fmt(enharmonicSpellings('Fis', 5)), ['Fis5','Ges5']));
  it('given name comes first (Ges5 → Ges5, Fis5)', () => {
    assert.deepEqual(fmt(enharmonicSpellings('Ges', 5)), ['Ges5','Fis5']);
  });
  it('Fisis4 → Fisis4, G4', () => assert.deepEqual(fmt(enharmonicSpellings('Fisis', 4)), ['Fisis4','G4']));
  it('Ces4 → Ces4, H3',     () => assert.deepEqual(fmt(enharmonicSpellings('Ces', 4)), ['Ces4','H3']));
});

describe('shortNoteName', () => {
  it('sharp',        () => assert.equal(shortNoteName('Fis'), 'F♯'));
  it('flat',         () => assert.equal(shortNoteName('Es'), 'E♭'));
  it('B stays B (Czech short name of H♭)', () => assert.equal(shortNoteName('B'), 'B'));
  it('double-sharp', () => assert.equal(shortNoteName('Fisis'), 'F×'));
  it('natural',      () => assert.equal(shortNoteName('C'), 'C'));
});

describe('noteTooltipLines', () => {
  it('accidental notes get "short – long" lines', () => {
    assert.deepEqual(noteTooltipLines('Fis', 5), ['F♯5 – Fis5', 'G♭5 – Ges5']);
  });

  it('natural note shows only its long name', () => {
    assert.deepEqual(noteTooltipLines('E', 4), ['E4', 'F♭4 – Fes4']);
  });

  it('lowercase for minor scales', () => {
    assert.deepEqual(noteTooltipLines('Fis', 5, true), ['f♯5 – fis5', 'g♭5 – ges5']);
  });

  it('writes B as "B3 – Hes3" (short B, long Hes)', () => {
    assert.deepEqual(noteTooltipLines('Ais', 3), ['A♯3 – Ais3', 'B3 – Hes3']);
    assert.deepEqual(noteTooltipLines('B', 3, true), ['b3 – hes3', 'a♯3 – ais3']);
  });
});

describe('longNoteName', () => {
  it('spells B out as Hes', () => assert.equal(longNoteName('B'), 'Hes'));
  it('keeps the other names', () => {
    for (const name of ['H', 'Ais', 'Es', 'Ces', 'Fisis']) assert.equal(longNoteName(name), name);
  });
});

describe('filteredScales — major-from order', () => {
  it('sorted by start pitch (B3 first, A4 last), not by key signature', () => {
    const result = filteredScales(new Set(['major-from']), new Set(['sharp','flat']));
    assert.equal(result[0].id, 'Ais-major-from');
    assert.equal(result[result.length - 1].id, 'A-major-from');
    const pitches = result.map((e) => scaleFocusRange(e).lowMidi);
    assert.deepEqual(pitches, [...pitches].sort((a, b) => a - b));
  });
});

describe('adjacentScales', () => {
  const RANGE_ORDER = ['major', 'minor', 'whole-tone', 'major-from'];
  const all = filteredScales(new Set(RANGE_ORDER), new Set(['sharp','flat']));

  it('major: neighbours by key signature (G dur → D dur / C dur)', () => {
    const { prev, next } = adjacentScales(all, 'G-major', RANGE_ORDER);
    assert.equal(prev.id, 'D-major');
    assert.equal(next.id, 'C-major');
  });

  it('within a group it skips the other types (C dur next is F dur, not a minor)', () => {
    const { next } = adjacentScales(all, 'C-major', RANGE_ORDER);
    assert.equal(next.id, 'F-major');
  });

  it('the end of a group continues with the next group in typeOrder', () => {
    assert.equal(adjacentScales(all, 'Ces-major', RANGE_ORDER).next.id, 'ais-minor');
    assert.equal(adjacentScales(all, 'ais-minor', RANGE_ORDER).prev.id, 'Ces-major');
    assert.equal(adjacentScales(all, 'as-minor', RANGE_ORDER).next.type, 'whole-tone');
    assert.equal(adjacentScales(all, 'Ais-major-from', RANGE_ORDER).prev.type, 'whole-tone');
  });

  it('the ends of the list have no neighbour (the link is greyed out)', () => {
    assert.equal(adjacentScales(all, 'Cis-major', RANGE_ORDER).prev, null);
    assert.equal(adjacentScales(all, 'A-major-from', RANGE_ORDER).next, null);
  });

  it('major-from: neighbours by start pitch (C → H/Ces before, Cis after)', () => {
    const { prev, next } = adjacentScales(all, 'C-major-from', RANGE_ORDER);
    assert.equal(prev.id, 'Ces-major-from');
    assert.equal(next.id, 'Cis-major-from');
  });

  it('whole-tone: C ↔ Des', () => {
    assert.equal(adjacentScales(all, 'C-whole-tone', RANGE_ORDER).next.id, 'Des-whole-tone');
    assert.equal(adjacentScales(all, 'Des-whole-tone', RANGE_ORDER).prev.id, 'C-whole-tone');
  });

  it('respects filters — scale missing from the list has no neighbours', () => {
    const sharpsOnly = filteredScales(new Set(['major']), new Set(['sharp']));
    assert.deepEqual(adjacentScales(sharpsOnly, 'F-major', RANGE_ORDER), { prev: null, next: null });
    assert.equal(adjacentScales(sharpsOnly, 'C-major', RANGE_ORDER).prev.id, 'G-major');
    assert.equal(adjacentScales(sharpsOnly, 'C-major', RANGE_ORDER).next, null);
  });

  it('types missing from typeOrder are left out (scales page: dur and moll only)', () => {
    const { next } = adjacentScales(all, 'Ces-major', ['major', 'minor']);
    assert.equal(next.id, 'ais-minor');
    assert.equal(adjacentScales(all, 'as-minor', ['major', 'minor']).next, null);
    assert.deepEqual(adjacentScales(all, 'C-whole-tone', ['major', 'minor']), { prev: null, next: null });
  });

  it('a single scale has no neighbours', () => {
    assert.deepEqual(adjacentScales([SCALE_CATALOG.find((s) => s.id === 'C-major')], 'C-major', RANGE_ORDER), { prev: null, next: null });
  });
});

describe('scalePair / dedupePairs', () => {
  const byId = (id) => SCALE_CATALOG.find((s) => s.id === id);
  const ids = (list) => list.map((s) => s.id);

  it('enharmonic major-from pair, sharp spelling first (from either member)', () => {
    assert.deepEqual(ids(scalePair(byId('B-major-from'))), ['Ais-major-from', 'B-major-from']);
    assert.deepEqual(ids(scalePair(byId('Ais-major-from'))), ['Ais-major-from', 'B-major-from']);
    assert.deepEqual(ids(scalePair(byId('Ces-major-from'))), ['H-major-from', 'Ces-major-from']);
  });

  it('single major-from and regular scales are alone', () => {
    assert.deepEqual(ids(scalePair(byId('C-major-from'))), ['C-major-from']);
    assert.deepEqual(ids(scalePair(byId('B-major'))), ['B-major']);
  });

  it('dedupePairs keeps one scale per pitch: 12 major-from scales', () => {
    const all = filteredScales(new Set(['major-from']), new Set(['sharp','flat']));
    const deduped = dedupePairs(all);
    assert.equal(deduped.length, 12);
    assert.ok(deduped.includes(byId('Ais-major-from')));
    assert.ok(!deduped.includes(byId('B-major-from')));
  });

  it('dedupePairs keeps the flat spelling when the sharp one is filtered out', () => {
    const flatsOnly = dedupePairs(filteredScales(new Set(['major-from']), new Set(['flat'])));
    assert.ok(flatsOnly.includes(byId('B-major-from')));
  });

  it('adjacentScales on deduped list steps by pitch (Ais/B → H/Ces)', () => {
    const list = dedupePairs(filteredScales(new Set(['major-from']), new Set(['sharp','flat'])));
    assert.equal(adjacentScales(list, 'Ais-major-from', ['major-from']).next.id, 'H-major-from');
    assert.equal(adjacentScales(list, 'C-major-from', ['major-from']).prev.id, 'H-major-from');
  });

  it('dedupePairs leaves regular scales untouched', () => {
    const majors = filteredScales(new Set(['major']), new Set(['sharp','flat']));
    assert.equal(dedupePairs(majors).length, majors.length);
  });
});

describe('splitOctaveNumbers', () => {
  it('marks octave numbers in a two-name line', () => {
    assert.deepEqual(splitOctaveNumbers('F♯5 – Fis5'), [
      { text: 'F♯' }, { text: '5', octave: true }, { text: ' – Fis' }, { text: '5', octave: true },
    ]);
  });

  it('keeps line breaks in text parts', () => {
    assert.deepEqual(splitOctaveNumbers('E4\nF♭4 – Fes4').map((p) => p.text), ['E', '4', '\nF♭', '4', ' – Fes', '4']);
  });

  it('label without numbers is a single text part', () => {
    assert.deepEqual(splitOctaveNumbers('C'), [{ text: 'C' }]);
  });
});

describe('noteLabelParts', () => {
  it('sharp',          () => assert.deepEqual(noteLabelParts('Fis'), { letter: 'F', accidental: '♯' }));
  it('flat',           () => assert.deepEqual(noteLabelParts('Es'), { letter: 'E', accidental: '♭' }));
  it('double-sharp',   () => assert.deepEqual(noteLabelParts('Fisis'), { letter: 'F', accidental: '×' }));
  it('natural',        () => assert.deepEqual(noteLabelParts('C'), { letter: 'C', accidental: '' }));
  it('Czech B as is',  () => assert.deepEqual(noteLabelParts('B'), { letter: 'B', accidental: '' }));
  it('lowercase minor', () => {
    assert.deepEqual(noteLabelParts('Gis', true), { letter: 'g', accidental: '♯' });
    assert.deepEqual(noteLabelParts('B', true), { letter: 'b', accidental: '' });
  });
});

describe('whenMusicFontReady', () => {
  it('resolves after the font loads and asks for ScalesMusic', async () => {
    const calls = [];
    const fonts = { load: (font, text) => { calls.push([font, text]); return Promise.resolve([]); } };
    await whenMusicFontReady(fonts, 1000);
    assert.equal(calls.length, 1);
    assert.match(calls[0][0], /ScalesMusic/);
  });

  it('resolves when loading fails', async () => {
    const fonts = { load: () => Promise.reject(new Error('offline')) };
    await whenMusicFontReady(fonts, 1000);
  });

  it('resolves when load throws synchronously', async () => {
    const fonts = { load: () => { throw new Error('bad font'); } };
    await whenMusicFontReady(fonts, 1000);
  });

  it('resolves after the timeout when loading hangs', async () => {
    const fonts = { load: () => new Promise(() => {}) };
    const start = Date.now();
    await whenMusicFontReady(fonts, 30);
    assert.ok(Date.now() - start >= 25);
  });

  it('resolves immediately without the FontFaceSet API', async () => {
    await whenMusicFontReady(undefined, 1000);
    await whenMusicFontReady({}, 1000);
  });
});

describe('visual profiles', () => {
  it('only the two light profiles remain, named by size', () => {
    assert.deepEqual(VISUAL_PROFILES.map((p) => p.id), ['compact', 'large']);
    assert.deepEqual(VISUAL_PROFILES.map((p) => p.name), ['Kompaktní', 'Větší']);
  });

  it('auto: phone (short side < 600) → Kompaktní, larger screens → Větší', () => {
    assert.equal(autoProfileId(390), 'compact');
    assert.equal(autoProfileId(599), 'compact');
    assert.equal(autoProfileId(600), 'large');
    assert.equal(autoProfileId(1080), 'large');
  });

  it('resolveProfileId: manual choice wins, auto and unknown ids resolve by screen', () => {
    assert.equal(resolveProfileId('large', 390), 'large');
    assert.equal(resolveProfileId(AUTO_PROFILE_ID, 390), 'compact');
    assert.equal(resolveProfileId('dark', 1440), 'large');
    assert.equal(resolveProfileId(null, 390), 'compact');
  });

  it('migrateProfileChoice: legacy ids renamed, current kept, unknown → auto', () => {
    assert.equal(migrateProfileChoice('light'), 'compact');
    assert.equal(migrateProfileChoice('light-large'), 'large');
    assert.equal(migrateProfileChoice('compact'), 'compact');
    assert.equal(migrateProfileChoice('large'), 'large');
    assert.equal(migrateProfileChoice(AUTO_PROFILE_ID), AUTO_PROFILE_ID);
    assert.equal(migrateProfileChoice('dark'), AUTO_PROFILE_ID);
    assert.equal(migrateProfileChoice('dark-large'), AUTO_PROFILE_ID);
    assert.equal(migrateProfileChoice(null), AUTO_PROFILE_ID);
  });
});

describe('music font subset', () => {
  it('every SMuFL glyph used by notation.js is in the font subset script', () => {
    const script = readFileSync(new URL('../tools/subset-music-font.py', import.meta.url), 'utf8');
    const subsetCodePoints = [...script.matchAll(/0x(E[0-9A-F]{3}):/g)].map((m) => parseInt(m[1], 16)).sort();
    const usedCodePoints = Object.values(SMUFL).map((ch) => ch.codePointAt(0)).sort();
    assert.deepEqual(usedCodePoints, subsetCodePoints);
  });
});

// ─── Scale summary labels ───────────────────────────────────────────────────

const catalogEntry = (id) => SCALE_CATALOG.find((s) => s.id === id);

describe('keySignatureLabel', () => {
  it('is empty without a key signature', () => {
    assert.equal(keySignatureLabel(0), '');
  });
  it('lists sharps in key signature order', () => {
    assert.equal(keySignatureLabel(2), '2 ♯ : F♯ C♯');
  });
  it('lists flats in key signature order', () => {
    assert.equal(keySignatureLabel(-3), '3 ♭ : B E♭ A♭');
  });
  it('uses double sharps for theoretical keys (Ais dur, 10 sharps)', () => {
    assert.equal(keySignatureLabel(10), '10 ♯ : F♯ C♯ G♯ D♯ A♯ E♯ H♯ F× C× G×');
  });
});

describe('scaleAccidentalsLabel', () => {
  it('uses the key signature for dur / moll', () => {
    assert.equal(scaleAccidentalsLabel(catalogEntry('B-major')), '2 ♭ : B E♭');
    assert.equal(scaleAccidentalsLabel(catalogEntry('e-minor')), '1 ♯ : F♯');
  });
  it('is empty for C dur', () => {
    assert.equal(scaleAccidentalsLabel(catalogEntry('C-major')), '');
  });
  it('uses the key signature for a major-from scale', () => {
    assert.equal(scaleAccidentalsLabel(catalogEntry('Ais-major-from')), keySignatureLabel(10));
  });
  it('lists the notes\' own accidentals for whole-tone scales', () => {
    assert.equal(scaleAccidentalsLabel(catalogEntry('C-whole-tone')), '3 ♯ : F♯ G♯ A♯');
    assert.equal(scaleAccidentalsLabel(catalogEntry('Des-whole-tone')), '2 ♭ : D♭ E♭');
  });
});

describe('scaleNotesText', () => {
  it('joins short names without octaves with a middle dot', () => {
    assert.equal(scaleNotesText(generateScale('Fis-major', 4)), 'F♯ · G♯ · A♯ · H · C♯ · D♯ · E♯ · F♯');
  });
  it('writes B as B', () => {
    assert.equal(scaleNotesText(generateScale('B-major', 3)), 'B · C · D · E♭ · F · G · A · B');
  });
  it('lowercases minor scales', () => {
    assert.equal(scaleNotesText(generateScale('a-minor', 4, 'harmonic'), true), 'a · h · c · d · e · f · g♯ · a');
  });
  it('uses × for double sharps', () => {
    assert.equal(scaleNotesText(generateScale('Gis-major-from', 4)), 'G♯ · A♯ · H♯ · C♯ · D♯ · E♯ · F× · G♯');
  });
});

describe('scalesStartingAt', () => {
  const ids = (name, octave) => scalesStartingAt(name, octave).map((s) => s.id);

  it('finds dur, moll and major-from scales of a pitch incl. enharmonic roots', () => {
    assert.deepEqual(ids('B', 3).sort(), ['Ais-major-from', 'B-major', 'B-major-from', 'ais-minor', 'b-minor'].sort());
  });
  it('gives the same result for an enharmonic spelling', () => {
    assert.deepEqual(ids('Ais', 3).sort(), ids('B', 3).sort());
  });
  it('matches major-from only at its exact start octave', () => {
    assert.ok(ids('B', 4).includes('B-major'));
    assert.ok(!ids('B', 4).includes('B-major-from'));
  });
  it('includes whole-tone scales by root', () => {
    assert.ok(ids('C', 5).includes('C-whole-tone'));
    assert.ok(ids('Cis', 4).includes('Des-whole-tone'));
    assert.ok(!ids('D', 4).some((id) => id.endsWith('whole-tone')));
  });
  it('maps Ces4 / H3 to the same pitch (Ces dur from H3)', () => {
    assert.ok(ids('H', 3).includes('Ces-major'));
    assert.ok(ids('H', 3).includes('Ces-major-from'));
  });
});

describe('shortScaleName', () => {
  it('uses the short root name', () => {
    assert.equal(shortScaleName(catalogEntry('Fis-major'), 'dur'), 'F♯ dur');
    assert.equal(shortScaleName(catalogEntry('B-major'), 'dur'), 'B dur');
    assert.equal(shortScaleName(catalogEntry('C-whole-tone'), 'celotónová'), 'C celotónová');
  });
  it('keeps minor roots lowercase', () => {
    assert.equal(shortScaleName(catalogEntry('fis-minor'), 'moll'), 'f♯ moll');
    assert.equal(shortScaleName(catalogEntry('b-minor'), 'moll'), 'b moll');
  });
  it('works for theoretical keys (Gis dur)', () => {
    assert.equal(shortScaleName(catalogEntry('Gis-major-from'), 'dur'), 'G♯ dur');
  });
});

describe('sectionTintVars', () => {
  it('keeps the original colors for the default (normal) level', () => {
    const vars = sectionTintVars('normal');
    assert.equal(vars['--section-bg-1'], 'rgba(80,110,220,0.1)');
    assert.equal(vars['--section-chord-bg-4'], 'rgba(215,105,90,0.24)');
  });
  it('defines all 8 variables for every level', () => {
    for (const t of SECTION_TINTS) assert.equal(Object.keys(sectionTintVars(t.id)).length, 8);
  });
  it('orders levels from strongest to none', () => {
    const alphas = SECTION_TINTS.map((t) => t.alpha);
    assert.deepEqual([...alphas].sort((a, b) => b - a), alphas);
    assert.ok(SECTION_TINTS.every((t) => t.chordAlpha >= t.alpha));
  });
  it('makes every band transparent for none', () => {
    assert.ok(Object.values(sectionTintVars('none')).every((v) => v === 'transparent'));
  });
  it('falls back to the default level for an unknown id', () => {
    assert.deepEqual(sectionTintVars('bogus'), sectionTintVars(DEFAULT_SECTION_TINT_ID));
  });
});

describe('rangeScaleNotes', () => {
  it('keeps the range notes whose pitch class is in the scale, in range order', () => {
    const scale = generateScale('G-major', 4, 'natural');
    const notes = rangeScaleNotes(buildAltSaxRange(false), scale);
    assert.deepEqual(notes.slice(0, 5).map((n) => n.name + n.octave), ['H3', 'C4', 'D4', 'E4', 'Fis4']);
    assert.ok(notes.every((n) => scale.some((s) => noteNameToSemitone(s.name) === noteNameToSemitone(n.name))));
  });

  it('matches enharmonic spellings by pitch class', () => {
    const range = [{ name: 'Ais', octave: 3 }, { name: 'H', octave: 3 }, { name: 'C', octave: 4 }];
    assert.deepEqual(rangeScaleNotes(range, [{ name: 'B' }, { name: 'His' }]).map((n) => n.name), ['Ais', 'C']);
  });

  it('gives 7 notes per octave of a diatonic scale (19 in the 32-note range of C dur)', () => {
    assert.equal(rangeScaleNotes(buildAltSaxRange(true), generateScale('C-major', 4, 'natural')).length, 19);
  });
});

describe('findSamePitch', () => {
  const notes = [{ name: 'Ges', octave: 4 }, { name: 'H', octave: 4 }, { name: 'C', octave: 5 }];

  it('finds a note by the same spelling', () => {
    assert.equal(findSamePitch(notes, { name: 'H', octave: 4 }), notes[1]);
  });
  it('finds a note by an enharmonic spelling, across octave boundaries', () => {
    assert.equal(findSamePitch(notes, { name: 'Fis', octave: 4 }), notes[0]);
    assert.equal(findSamePitch(notes, { name: 'Ces', octave: 5 }), notes[1]);
    assert.equal(findSamePitch(notes, { name: 'His', octave: 4 }), notes[2]);
  });
  it('returns undefined for another pitch or octave', () => {
    assert.equal(findSamePitch(notes, { name: 'H', octave: 5 }), undefined);
    assert.equal(findSamePitch(notes, { name: 'G', octave: 4 }), undefined);
    assert.equal(findSamePitch([], { name: 'G', octave: 4 }), undefined);
  });
});

describe('adjacentNote', () => {
  // Not sorted on purpose, like the melodic minor union (descending notes first)
  const notes = [{ name: 'G', octave: 4 }, { name: 'Fis', octave: 4 }, { name: 'A', octave: 4 }, { name: 'E', octave: 4 }];

  it('moves to the next and previous note by pitch', () => {
    assert.deepEqual(adjacentNote(notes, { name: 'Fis', octave: 4 }, 1), { name: 'G', octave: 4 });
    assert.deepEqual(adjacentNote(notes, { name: 'Fis', octave: 4 }, -1), { name: 'E', octave: 4 });
  });
  it('finds the current note in another spelling', () => {
    assert.deepEqual(adjacentNote(notes, { name: 'Ges', octave: 4 }, 1), { name: 'G', octave: 4 });
  });
  it('stays at either end', () => {
    assert.deepEqual(adjacentNote(notes, { name: 'A', octave: 4 }, 1), { name: 'A', octave: 4 });
    assert.deepEqual(adjacentNote(notes, { name: 'E', octave: 4 }, -1), { name: 'E', octave: 4 });
  });
  it('moves from a note outside the list to the nearest one in the step\'s direction', () => {
    assert.deepEqual(adjacentNote(notes, { name: 'F', octave: 4 }, 1), { name: 'Fis', octave: 4 });
    assert.deepEqual(adjacentNote(notes, { name: 'F', octave: 4 }, -1), { name: 'E', octave: 4 });
    assert.deepEqual(adjacentNote(notes, { name: 'Gis', octave: 4 }, 1), { name: 'A', octave: 4 });
  });
  it('gives undefined from outside the list when no note lies in that direction', () => {
    assert.equal(adjacentNote(notes, { name: 'H', octave: 4 }, 1), undefined);
    assert.equal(adjacentNote(notes, { name: 'D', octave: 4 }, -1), undefined);
  });
  it('walks the full alto sax range chromatically', () => {
    const range = buildAltSaxRange(false);
    assert.deepEqual(adjacentNote(range, { name: 'H', octave: 3 }, 1), { name: 'C', semitone: 0, octave: 4, midi: 48 });
    assert.equal(adjacentNote(range, { name: 'F', octave: 6 }, 1).name, 'F');
  });
});

describe('octaveNote', () => {
  const scale = rangeScaleNotes(buildAltSaxRange(false), generateScale('G-major', 4, 'natural'));

  it('moves an octave up and down', () => {
    assert.deepEqual(pick(octaveNote(scale, { name: 'Fis', octave: 4 }, 1)), 'Fis5');
    assert.deepEqual(pick(octaveNote(scale, { name: 'Fis', octave: 5 }, -1)), 'Fis4');
  });
  it('finds the current note in another spelling', () => {
    assert.equal(pick(octaveNote(scale, { name: 'Ges', octave: 4 }, 1)), 'Fis5');
  });
  it('stays when the octave is outside the list', () => {
    assert.equal(pick(octaveNote(scale, { name: 'E', octave: 6 }, 1)), 'E6');
    assert.equal(pick(octaveNote(scale, { name: 'H', octave: 3 }, -1)), 'H3');
  });
  it('returns undefined for a note that is not in the list', () => {
    assert.equal(octaveNote(scale, { name: 'F', octave: 4 }, 1), undefined);
  });
  it('moves a note outside the scale by an octave among all range notes', () => {
    const range = buildAltSaxRange(false);
    assert.equal(pick(octaveNote(range, { name: 'F', octave: 4 }, 1)), 'F5');
    assert.equal(pick(octaveNote(range, { name: 'Es', octave: 5 }, -1)), 'Dis4');
    assert.equal(pick(octaveNote(range, { name: 'F', octave: 6 }, 1)), 'F6');
  });
});

describe('rangeEndNote', () => {
  const notes = [{ name: 'G', octave: 4 }, { name: 'H', octave: 3 }, { name: 'C', octave: 6 }, { name: 'D', octave: 5 }];

  it('gives the lowest and the highest note by pitch', () => {
    assert.equal(pick(rangeEndNote(notes, -1)), 'H3');
    assert.equal(pick(rangeEndNote(notes, 1)), 'C6');
  });
  it('orders by pitch, not by octave number (Ces5 is below C5)', () => {
    const tricky = [{ name: 'C', octave: 5 }, { name: 'Ces', octave: 5 }];
    assert.equal(pick(rangeEndNote(tricky, -1)), 'Ces5');
  });
  it('covers the alto sax range B3–F6', () => {
    assert.equal(pick(rangeEndNote(buildAltSaxRange(true), -1)), 'B3');
    assert.equal(pick(rangeEndNote(buildAltSaxRange(true), 1)), 'F6');
  });
  it('returns undefined for no notes', () => {
    assert.equal(rangeEndNote([], 1), undefined);
  });
});

function pick(note) {
  return note && `${note.name}${note.octave}`;
}

describe('scaleNoteLabels', () => {
  it('gives each note its short name and pitch class', () => {
    assert.deepEqual(scaleNoteLabels(generateScale('Fis-major', 4)).slice(0, 3),
      [{ label: 'F♯', semitone: 6 }, { label: 'G♯', semitone: 8 }, { label: 'A♯', semitone: 10 }]);
  });
  it('uses the pitch class of special spellings (E♯ = F, H♯ = C, F× = G)', () => {
    const labels = scaleNoteLabels(generateScale('Gis-major-from', 4));
    assert.deepEqual(labels.map((l) => l.semitone), [8, 10, 0, 1, 3, 5, 7, 8]);
  });
  it('lowercases minor scales and matches scaleNotesText', () => {
    const scale = generateScale('a-minor', 4, 'harmonic');
    assert.deepEqual(scaleNoteLabels(scale, true).map((l) => l.label), ['a', 'h', 'c', 'd', 'e', 'f', 'g♯', 'a']);
    assert.equal(scaleNoteLabels(scale, true).map((l) => l.label).join(' · '), scaleNotesText(scale, true));
  });
});

describe('scaleNeighborsLabel', () => {
  const eMinor = rangeScaleNotes(buildAltSaxRange(false), generateScale('e-minor', 4, 'natural'));
  const gMajor = rangeScaleNotes(buildAltSaxRange(false), generateScale('G-major', 4, 'natural'));

  it('names the nearest scale notes below and above', () => {
    assert.equal(scaleNeighborsLabel(gMajor, { name: 'F', octave: 4 }), 'mezi E a F♯');
    assert.equal(scaleNeighborsLabel(gMajor, { name: 'Gis', octave: 5 }), 'mezi G a A');
  });
  it('lowercases minor scales', () => {
    assert.equal(scaleNeighborsLabel(eMinor, { name: 'F', octave: 4 }, true), 'mezi e a f♯');
  });
  it('says "pod" / "nad" at the ends of the range', () => {
    assert.equal(scaleNeighborsLabel(eMinor, { name: 'Ais', octave: 3 }), 'pod H');
    assert.equal(scaleNeighborsLabel(gMajor, { name: 'F', octave: 6 }), 'nad E');
  });
  it('writes B with the short name', () => {
    const fMajor = rangeScaleNotes(buildAltSaxRange(true), generateScale('F-major', 4, 'natural'));
    assert.equal(scaleNeighborsLabel(fMajor, { name: 'H', octave: 4 }), 'mezi B a C');
  });
  it('gives an empty label for no notes', () => {
    assert.equal(scaleNeighborsLabel([], { name: 'F', octave: 4 }), '');
  });
});

describe('pitchSpellings', () => {
  const names = (name, octave) => pitchSpellings(name, octave).map((n) => n.name + n.octave);

  it('puts the natural name first, then its other names', () => {
    assert.deepEqual(names('H', 3), ['H3', 'Ces4']);
    assert.deepEqual(names('C', 4), ['C4', 'His3']);
    assert.deepEqual(names('E', 4), ['E4', 'Fes4']);
    assert.deepEqual(names('F', 4), ['F4', 'Eis4']);
    assert.deepEqual(names('G', 4), ['G4', 'Fisis4']);
  });
  it('puts the sharp name above the flat one, whichever is given', () => {
    assert.deepEqual(names('Es', 4), ['Dis4', 'Es4']);
    assert.deepEqual(names('Dis', 4), ['Dis4', 'Es4']);
    assert.deepEqual(names('B', 3), ['Ais3', 'B3']);
  });
  it('gives the same names for every spelling of a pitch', () => {
    assert.deepEqual(names('Ces', 4), names('H', 3));
  });
});
