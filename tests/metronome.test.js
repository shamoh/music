import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bpmToInterval,
  validateBpm,
  validateBeatCount,
  isAccentedBeat,
  savedRhythmPatternLabel,
  upsertSavedRhythm,
  deleteSavedRhythm,
  RHYTHM_PATTERNS,
} from '../docs/js/metronome.js';

describe('bpmToInterval', () => {
  it('60 BPM → 1000 ms', () => assert.equal(bpmToInterval(60), 1000));
  it('120 BPM → 500 ms', () => assert.equal(bpmToInterval(120), 500));
  it('240 BPM → 250 ms', () => assert.equal(bpmToInterval(240), 250));
});

describe('validateBpm', () => {
  it('clamps below minimum to 40', () => assert.equal(validateBpm(30), 40));
  it('clamps above maximum to 240', () => assert.equal(validateBpm(300), 240));
  it('passes valid value through', () => assert.equal(validateBpm(120), 120));
  it('rounds fractional value up', () => assert.equal(validateBpm(120.6), 121));
  it('rounds fractional value down', () => assert.equal(validateBpm(120.4), 120));
  it('handles non-numeric string', () => assert.equal(validateBpm('abc'), 120));
  it('handles NaN', () => assert.equal(validateBpm(NaN), 120));
  it('accepts boundary minimum 40', () => assert.equal(validateBpm(40), 40));
  it('accepts boundary maximum 240', () => assert.equal(validateBpm(240), 240));
});

describe('validateBeatCount', () => {
  it('clamps below minimum to 2', () => assert.equal(validateBeatCount(1), 2));
  it('clamps above maximum to 8', () => assert.equal(validateBeatCount(9), 8));
  it('passes valid value through', () => assert.equal(validateBeatCount(4), 4));
  it('rounds fractional value', () => assert.equal(validateBeatCount(3.7), 4));
  it('handles non-numeric string', () => assert.equal(validateBeatCount('x'), 4));
  it('accepts boundary minimum 2', () => assert.equal(validateBeatCount(2), 2));
  it('accepts boundary maximum 8', () => assert.equal(validateBeatCount(8), 8));
});

describe('isAccentedBeat', () => {
  const p44 = RHYTHM_PATTERNS.find(p => p.id === '4/4');
  const p34 = RHYTHM_PATTERNS.find(p => p.id === '3/4');
  const p68 = RHYTHM_PATTERNS.find(p => p.id === '6/8');
  const p54 = RHYTHM_PATTERNS.find(p => p.id === '5/4');

  it('4/4: beat 0 is accented', () => assert.equal(isAccentedBeat(0, p44), true));
  it('4/4: beat 1 is not accented', () => assert.equal(isAccentedBeat(1, p44), false));
  it('4/4: beat 3 is not accented', () => assert.equal(isAccentedBeat(3, p44), false));

  it('3/4: beat 0 is accented', () => assert.equal(isAccentedBeat(0, p34), true));
  it('3/4: beat 2 is not accented', () => assert.equal(isAccentedBeat(2, p34), false));

  it('6/8: beat 0 is accented', () => assert.equal(isAccentedBeat(0, p68), true));
  it('6/8: beat 3 is accented', () => assert.equal(isAccentedBeat(3, p68), true));
  it('6/8: beat 1 is not accented', () => assert.equal(isAccentedBeat(1, p68), false));
  it('6/8: beat 5 is not accented', () => assert.equal(isAccentedBeat(5, p68), false));

  it('5/4: beat 0 is accented', () => assert.equal(isAccentedBeat(0, p54), true));
  it('5/4: beat 3 is accented', () => assert.equal(isAccentedBeat(3, p54), true));
  it('5/4: beat 2 is not accented', () => assert.equal(isAccentedBeat(2, p54), false));

  it('null pattern falls back to beat 0 accented', () => assert.equal(isAccentedBeat(0, null), true));
  it('null pattern: beat 1 not accented', () => assert.equal(isAccentedBeat(1, null), false));
  it('empty accents array: beat 0 not accented', () => assert.equal(isAccentedBeat(0, { accents: [] }), false));
  it('empty accents array: beat 1 not accented', () => assert.equal(isAccentedBeat(1, { accents: [] }), false));
  it('custom pattern with explicit accents works', () => {
    const custom = { beats: 5, accents: [0, 2, 4] };
    assert.equal(isAccentedBeat(0, custom), true);
    assert.equal(isAccentedBeat(2, custom), true);
    assert.equal(isAccentedBeat(1, custom), false);
  });
  it('custom pattern with no accents: all beats unaccented', () => {
    const custom = { beats: 4, accents: [] };
    for (let i = 0; i < 4; i++) assert.equal(isAccentedBeat(i, custom), false);
  });
});

describe('RHYTHM_PATTERNS', () => {
  it('has 6 patterns', () => assert.equal(RHYTHM_PATTERNS.length, 6));
  it('last pattern is custom', () => assert.equal(RHYTHM_PATTERNS.at(-1).id, 'custom'));
  it('custom pattern has null beats', () => assert.equal(RHYTHM_PATTERNS.find(p => p.id === 'custom').beats, null));
  it('custom pattern has null accents', () => assert.equal(RHYTHM_PATTERNS.find(p => p.id === 'custom').accents, null));
  it('4/4 has 4 beats', () => assert.equal(RHYTHM_PATTERNS.find(p => p.id === '4/4').beats, 4));
  it('3/4 has 3 beats', () => assert.equal(RHYTHM_PATTERNS.find(p => p.id === '3/4').beats, 3));
  it('6/8 has 6 beats', () => assert.equal(RHYTHM_PATTERNS.find(p => p.id === '6/8').beats, 6));
  it('5/4 has 5 beats', () => assert.equal(RHYTHM_PATTERNS.find(p => p.id === '5/4').beats, 5));
});

describe('savedRhythmPatternLabel', () => {
  it('predefined pattern returns id', () => assert.equal(savedRhythmPatternLabel({ patternId: '4/4' }), '4/4'));
  it('3/4 pattern returns id', () => assert.equal(savedRhythmPatternLabel({ patternId: '3/4' }), '3/4'));
  it('custom with accents shows beat numbers', () => {
    assert.equal(savedRhythmPatternLabel({ patternId: 'custom', customBeats: 4, customAccents: [0, 2] }), 'Vlastní 4 [1 3]');
  });
  it('custom without accents omits brackets', () => {
    assert.equal(savedRhythmPatternLabel({ patternId: 'custom', customBeats: 5, customAccents: [] }), 'Vlastní 5');
  });
  it('custom with null accents falls back gracefully', () => {
    assert.equal(savedRhythmPatternLabel({ patternId: 'custom', customBeats: 3, customAccents: null }), 'Vlastní 3');
  });
});

describe('upsertSavedRhythm', () => {
  const r1 = { name: 'Valčík', patternId: '3/4', bpm: 120, customBeats: null, customAccents: null };
  const r2 = { name: 'Pochod', patternId: '2/4', bpm: 100, customBeats: null, customAccents: null };

  it('inserts into empty list', () => {
    const result = upsertSavedRhythm([], r1);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Valčík');
  });

  it('appends new item and sorts by name', () => {
    const result = upsertSavedRhythm([r1], r2);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Pochod');
    assert.equal(result[1].name, 'Valčík');
  });

  it('overwrites existing item by name', () => {
    const updated = { ...r1, bpm: 140 };
    const result = upsertSavedRhythm([r1, r2], updated);
    assert.equal(result.length, 2);
    const v = result.find(r => r.name === 'Valčík');
    assert.equal(v.bpm, 140);
  });
});

describe('deleteSavedRhythm', () => {
  const r1 = { name: 'Valčík', patternId: '3/4', bpm: 120 };
  const r2 = { name: 'Pochod', patternId: '2/4', bpm: 100 };

  it('removes matching item', () => {
    const result = deleteSavedRhythm([r1, r2], 'Valčík');
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Pochod');
  });

  it('leaves list unchanged when name not found', () => {
    const result = deleteSavedRhythm([r1, r2], 'Neexistující');
    assert.equal(result.length, 2);
  });

  it('returns empty list when only item is deleted', () => {
    assert.equal(deleteSavedRhythm([r1], 'Valčík').length, 0);
  });
});
