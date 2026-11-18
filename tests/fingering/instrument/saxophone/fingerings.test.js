// Saxophone fingering rules shared by the whole family (generic checks live in tests/fingering/instruments.test.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { notePitchMidi } from '../../../../docs/js/music.js';
import { FINGERINGS } from '../../../../prototypes/fingering/instrument/saxophone/fingerings.js';

describe('saxophone fingerings', () => {
  it('cover the written range B3..F6', () => {
    assert.equal(notePitchMidi(FINGERINGS[0].note, FINGERINGS[0].octave), notePitchMidi('B', 3));
    assert.equal(notePitchMidi(FINGERINGS.at(-1).note, FINGERINGS.at(-1).octave), notePitchMidi('F', 6));
  });

  it('use the octave key exactly from D5 upwards', () => {
    const d5 = notePitchMidi('D', 5);
    for (const f of FINGERINGS) {
      const needsOctave = notePitchMidi(f.note, f.octave) >= d5;
      for (const v of f.variants) assert.equal(v.keys.includes('octave'), needsOctave, `${f.note}${f.octave}/${v.id}`);
    }
  });

  it('use palm keys only from D6 upwards', () => {
    const d6 = notePitchMidi('D', 6);
    for (const f of FINGERINGS) {
      if (notePitchMidi(f.note, f.octave) >= d6) continue;
      for (const v of f.variants) assert.ok(!v.keys.some(k => k.startsWith('palm')), `${f.note}${f.octave}/${v.id}`);
    }
  });

  it('play side B as the A fingering (LH 1 + 2) plus the side B key, in both octaves', () => {
    const side = (note, octave) => FINGERINGS.find(f => f.note === note && f.octave === octave)
      .variants.find(v => v.id === 'side').keys;
    assert.deepEqual(side('B', 4), ['lh1', 'lh2', 'sideBb']);
    assert.deepEqual(side('B', 5), ['octave', 'lh1', 'lh2', 'sideBb']);
  });

  it('offer five variants of B in both octaves, side B as the basic one', () => {
    for (const octave of [4, 5]) {
      const b = FINGERINGS.find(f => f.note === 'B' && f.octave === octave);
      assert.deepEqual(b.variants.map(v => v.id), ['side', 'bis', 'oneAndOne', 'oneAndTwo', 'oneAndThree']);
      assert.deepEqual(b.variants.find(v => v.id === 'oneAndThree').keys.filter(k => k !== 'octave'), ['lh1', 'rh3']);
    }
  });
});
