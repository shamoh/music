import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateScale,
  getChordNotes,
  noteToStaffSlot,
  buildAltSaxRange,
  accidentalType,
  filteredScales,
  noteNameToSemitone,
  computeInlineAccidentals,
  scaleStartOctave,
  SCALE_CATALOG,
  ALTO_SAX_LOW,
  ALTO_SAX_HIGH,
} from '../js/music.js';

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

describe('getChordNotes', () => {
  it('C major chord is C E G', () => {
    const scale = generateScale('C-major', 4);
    assert.deepEqual(getChordNotes(scale).map((n) => n.name), ['C','E','G']);
  });

  it('a minor chord is A C E', () => {
    const scale = generateScale('a-minor', 4);
    assert.deepEqual(getChordNotes(scale).map((n) => n.name), ['A','C','E']);
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
  it('all types + all acc returns all 30 scales', () => {
    const result = filteredScales(new Set(['major','minor']), new Set(['sharp','flat']));
    assert.equal(result.length, SCALE_CATALOG.length);
    assert.equal(result.length, 30);
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
