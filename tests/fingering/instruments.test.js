// Consistency checks every instrument descriptor must pass.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { notePitchMidi } from '../../docs/js/music.js';
import { SAXOPHONE_ALTO } from '../../docs/js/instrument/saxophone/alto/instrument.js';

const INSTRUMENTS = [SAXOPHONE_ALTO];

for (const instrument of INSTRUMENTS) {
  describe(`instrument ${instrument.id}`, () => {
    const keyIds = new Set(instrument.keys.map(k => k.id));

    it('has unique key ids', () => {
      assert.equal(keyIds.size, instrument.keys.length);
    });

    it('assigns every key to a known group and every group has a key', () => {
      const groups = new Set(instrument.keyGroups.map(g => g.id));
      for (const k of instrument.keys) assert.ok(groups.has(k.group), `${k.id}: unknown group ${k.group}`);
      for (const g of groups) assert.ok(instrument.keys.some(k => k.group === g), `empty group ${g}`);
    });

    it('has keys with a supported shape inside the viewBox', () => {
      const { width, height } = instrument.viewBox;
      for (const k of instrument.keys) {
        assert.ok(['circle', 'pill'].includes(k.shape), k.id);
        assert.ok(k.w > 0 && k.h > 0, k.id);
        assert.ok(k.x - k.w / 2 >= 0 && k.x + k.w / 2 <= width, `${k.id} x out of viewBox`);
        assert.ok(k.y - k.h / 2 >= 0 && k.y + k.h / 2 <= height, `${k.id} y out of viewBox`);
      }
    });

    it('has fingerings in ascending chromatic order without gaps', () => {
      const pitches = instrument.fingerings.map(f => notePitchMidi(f.note, f.octave));
      pitches.slice(1).forEach((p, i) => assert.equal(p, pitches[i] + 1, `gap after ${instrument.fingerings[i].note}${instrument.fingerings[i].octave}`));
    });

    it('has at least one variant per note with unique ids', () => {
      for (const f of instrument.fingerings) {
        assert.ok(f.variants.length >= 1, `${f.note}${f.octave}`);
        assert.equal(new Set(f.variants.map(v => v.id)).size, f.variants.length, `${f.note}${f.octave}`);
      }
    });

    it('references only existing keys, each at most once per variant', () => {
      for (const f of instrument.fingerings) {
        for (const v of f.variants) {
          for (const id of v.keys) assert.ok(keyIds.has(id), `${f.note}${f.octave}/${v.id}: unknown key ${id}`);
          assert.equal(new Set(v.keys).size, v.keys.length, `${f.note}${f.octave}/${v.id}: duplicate key`);
        }
      }
    });
  });
}
