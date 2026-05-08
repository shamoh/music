import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateScale,
  getChordNotes,
  noteToStaffSlot,
  buildAltSaxRange,
  preferFlats,
  accidentalType,
  ALTO_SAX_LOW,
  ALTO_SAX_HIGH,
} from '../js/music.js';

describe('generateScale', () => {
  it('C major produces correct 8 notes', () => {
    const scale = generateScale(0, 'major', 4);
    const names = scale.map((n) => n.name);
    assert.deepEqual(names, ['C','D','E','F','G','A','H','C']);
  });

  it('C major last note is octave 5', () => {
    const scale = generateScale(0, 'major', 4);
    assert.equal(scale[7].octave, 5);
    assert.equal(scale[0].octave, 4);
  });

  it('A natural minor produces correct notes', () => {
    const scale = generateScale(9, 'naturalMinor', 4);
    const names = scale.map((n) => n.name);
    assert.deepEqual(names, ['A','H','C','D','E','F','G','A']);
  });

  it('A harmonic minor raises 7th (Gis)', () => {
    const scale = generateScale(9, 'harmonicMinor', 4);
    assert.equal(scale[6].name, 'Gis');
  });

  it('A melodic minor ascending raises 6th and 7th', () => {
    const scale = generateScale(9, 'melodicMinor', 4);
    assert.equal(scale[5].name, 'Fis');
    assert.equal(scale[6].name, 'Gis');
  });

  it('Fis major uses sharps (7th shown as F, enharmonic to Eis)', () => {
    const scale = generateScale(6, 'major', 4);
    const names = scale.map((n) => n.name);
    assert.deepEqual(names, ['Fis','Gis','Ais','H','Cis','Dis','F','Fis']);
  });

  it('throws on unknown scale type', () => {
    assert.throws(() => generateScale(0, 'unknown'), /Unknown scale type/);
  });
});

describe('getChordNotes', () => {
  it('C major chord is C E G', () => {
    const scale = generateScale(0, 'major', 4);
    const chord = getChordNotes(scale);
    assert.deepEqual(chord.map((n) => n.name), ['C','E','G']);
  });

  it('A minor chord is A C E', () => {
    const scale = generateScale(9, 'naturalMinor', 4);
    const chord = getChordNotes(scale);
    assert.deepEqual(chord.map((n) => n.name), ['A','C','E']);
  });
});

describe('noteToStaffSlot', () => {
  it('G4 = slot 0', () => {
    assert.equal(noteToStaffSlot('G', 4), 0);
  });

  it('E4 = slot -2 (first line)', () => {
    assert.equal(noteToStaffSlot('E', 4), -2);
  });

  it('C4 = slot -4 (middle C ledger line)', () => {
    assert.equal(noteToStaffSlot('C', 4), -4);
  });

  it('F5 = slot 6 (top line)', () => {
    assert.equal(noteToStaffSlot('F', 5), 6);
  });

  it('H3 = slot -5', () => {
    assert.equal(noteToStaffSlot('H', 3), -5);
  });

  it('B (Bb) maps to H diatonic slot', () => {
    // B in Czech = Bb, diatonic letter = H
    assert.equal(noteToStaffSlot('B', 3), -5);
  });

  it('A5 = slot 8', () => {
    assert.equal(noteToStaffSlot('A', 5), 8);
  });
});

describe('buildAltSaxRange', () => {
  it('starts at B3 (Bb3)', () => {
    const range = buildAltSaxRange();
    assert.equal(range[0].name, 'B');
    assert.equal(range[0].octave, 3);
  });

  it('ends at Fis5', () => {
    const range = buildAltSaxRange();
    const last = range[range.length - 1];
    assert.equal(last.name, 'Fis');
    assert.equal(last.octave, 5);
  });

  it('contains 21 notes (Bb3 to F#5 inclusive)', () => {
    const range = buildAltSaxRange();
    // internal midi: Bb3=46, F#5=66 → 66-46+1 = 21 semitones
    assert.equal(range.length, 21);
  });
});

describe('preferFlats', () => {
  it('C major does not prefer flats', () => {
    assert.equal(preferFlats(0), false);
  });

  it('Es (Eb) prefers flats', () => {
    assert.equal(preferFlats(3), true);
  });
});

describe('accidentalType', () => {
  it('C is natural', () => {
    assert.equal(accidentalType('C'), null);
  });

  it('Fis is sharp', () => {
    assert.equal(accidentalType('Fis'), 'sharp');
  });

  it('Es is flat', () => {
    assert.equal(accidentalType('Es'), 'flat');
  });
});
