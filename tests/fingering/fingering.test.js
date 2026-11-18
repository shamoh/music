import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { noteSpellingLabels } from '../../prototypes/fingering/fingering.js';

describe('noteSpellingLabels', () => {
  it('puts the main spelling first, followed by its enharmonic', () => {
    assert.deepEqual(noteSpellingLabels('Fis', 4), ['Fis4', 'Ges4']);
    assert.deepEqual(noteSpellingLabels('B', 3), ['B3', 'Ais3']);
  });

  it('shifts the octave for Ces and His', () => {
    assert.deepEqual(noteSpellingLabels('H', 3), ['H3', 'Ces4']);
    assert.deepEqual(noteSpellingLabels('C', 4), ['C4', 'His3']);
  });

  it('leaves out double sharps', () => {
    assert.deepEqual(noteSpellingLabels('G', 4), ['G4']);
    assert.deepEqual(noteSpellingLabels('D', 5), ['D5']);
  });
});
