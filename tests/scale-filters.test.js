import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickFilterValues, parseSavedJson, loadSavedFilters, saveFilters, syncFilterChips, ACC_STORAGE_KEY } from '../docs/js/scale-filters.js';

const ALLOWED = { type: ['major', 'minor', 'whole-tone'], acc: ['sharp', 'flat'] };

// In-memory stand-in for localStorage
function memoryStorage(initial = {}) {
  const items = { ...initial };

  return {
    items,
    getItem: (key) => items[key] ?? null,
    setItem: (key, value) => { items[key] = value; },
  };
}

describe('pickFilterValues', () => {
  it('keeps the values the page offers', () => {
    assert.deepEqual([...pickFilterValues(['minor', 'major-from'], ALLOWED.type)], ['minor']);
  });
  it('no values left, or not a list, is no saved state', () => {
    assert.equal(pickFilterValues(['major-from'], ALLOWED.type), null);
    assert.equal(pickFilterValues([], ALLOWED.type), null);
    assert.equal(pickFilterValues('major', ALLOWED.type), null);
    assert.equal(pickFilterValues(undefined, ALLOWED.type), null);
  });
});

describe('parseSavedJson', () => {
  it('nothing stored or broken JSON is null', () => {
    assert.equal(parseSavedJson(null), null);
    assert.equal(parseSavedJson('{oops'), null);
    assert.deepEqual(parseSavedJson('{"acc":["flat"]}'), { acc: ['flat'] });
  });
});

describe('saveFilters / loadSavedFilters', () => {
  const RANGE_ALLOWED = { type: ['major', 'minor', 'whole-tone', 'major-from'], acc: ['sharp', 'flat'] };
  const SCALES_ALLOWED = { type: ['major', 'minor'], acc: ['sharp', 'flat'] };

  it('the type filter is stored per page, the sharp / flat filter is shared', () => {
    const storage = memoryStorage();
    saveFilters('range-filters', { filterType: new Set(['major', 'whole-tone']), filterAcc: new Set(['sharp']) }, storage);
    const range = loadSavedFilters('range-filters', RANGE_ALLOWED, storage);
    assert.deepEqual([...range.filterType], ['major', 'whole-tone']);
    assert.deepEqual([...range.filterAcc], ['sharp']);

    // The other page: its own type filter (nothing saved yet), the shared sharp / flat filter
    const scales = loadSavedFilters('scales-filters', SCALES_ALLOWED, storage);
    assert.equal(scales.filterType, null);
    assert.deepEqual([...scales.filterAcc], ['sharp']);
    assert.ok(storage.items[ACC_STORAGE_KEY]);
  });
  it('the last saved sharp / flat filter wins on both pages', () => {
    const storage = memoryStorage();
    saveFilters('range-filters', { filterType: new Set(['major']), filterAcc: new Set(['sharp']) }, storage);
    saveFilters('scales-filters', { filterType: new Set(['minor']), filterAcc: new Set(['flat']) }, storage);
    assert.deepEqual([...loadSavedFilters('range-filters', RANGE_ALLOWED, storage).filterAcc], ['flat']);
    assert.deepEqual([...loadSavedFilters('range-filters', RANGE_ALLOWED, storage).filterType], ['major']);
  });
  it('a type filter the page doesn\'t offer is dropped', () => {
    const storage = memoryStorage({ 'scales-filters': '{"type":["whole-tone"]}' });
    assert.equal(loadSavedFilters('scales-filters', SCALES_ALLOWED, storage).filterType, null);
  });
  it('unavailable storage is no saved state and saving is skipped', () => {
    const failing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    assert.deepEqual(loadSavedFilters('page-filters', ALLOWED, failing), { filterType: null, filterAcc: null });
    assert.doesNotThrow(() => saveFilters('page-filters', { filterType: new Set(['major']), filterAcc: new Set(['flat']) }, failing));
  });
});

describe('syncFilterChips', () => {
  const chip = (data) => {
    const classes = new Set();
    return {
      dataset: data,
      attributes: {},
      classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), has: (c) => classes.has(c) },
      setAttribute(name, value) { this.attributes[name] = value; },
    };
  };

  it('draws the filter state on the chips', () => {
    const major = chip({ filterType: 'major' });
    const minor = chip({ filterType: 'minor' });
    const sharp = chip({ filterAcc: 'sharp' });
    const root = { querySelectorAll: (sel) => (sel === '[data-filter-type]' ? [major, minor] : [sharp]) };
    syncFilterChips({ filterType: new Set(['minor']), filterAcc: new Set(['sharp']) }, root);
    assert.equal(major.classList.has('active'), false);
    assert.equal(major.attributes['aria-pressed'], 'false');
    assert.equal(minor.classList.has('active'), true);
    assert.equal(sharp.attributes['aria-pressed'], 'true');
  });
});
