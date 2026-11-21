import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickFilterValues, parseSavedJson, loadSavedFilters, saveFilters, syncFilterChips, ACC_STORAGE_KEY,
  toggleFilterValue, enableAllFilters, applySavedFilters, initFilterChips,
} from '../docs/js/scale-filters.js';
import { memoryStorage, fakeEventTarget } from './helpers/fake-dom.js';

const ALLOWED = { type: ['major', 'minor', 'whole-tone'], acc: ['sharp', 'flat'] };

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

describe('toggleFilterValue', () => {
  it('switches a value on and off', () => {
    const filter = new Set(['major', 'minor']);

    assert.equal(toggleFilterValue(filter, 'minor'), true);
    assert.deepEqual([...filter], ['major']);
    assert.equal(toggleFilterValue(filter, 'whole-tone'), true);
    assert.deepEqual([...filter], ['major', 'whole-tone']);
  });

  it('keeps the last active value on', () => {
    const filter = new Set(['sharp']);

    assert.equal(toggleFilterValue(filter, 'sharp'), false);
    assert.deepEqual([...filter], ['sharp']);
  });
});

describe('enableAllFilters', () => {
  it('switches on everything the page offers', () => {
    const state = { filterType: new Set(['major']), filterAcc: new Set(['flat']) };
    enableAllFilters(state, ALLOWED);

    assert.deepEqual([...state.filterType], ALLOWED.type);
    assert.deepEqual([...state.filterAcc], ALLOWED.acc);
  });

  it('does not share the arrays of the offered filters', () => {
    const state = { filterType: new Set(), filterAcc: new Set() };
    enableAllFilters(state, ALLOWED);
    state.filterType.delete('major');

    assert.ok(ALLOWED.type.includes('major'));
  });
});

describe('applySavedFilters', () => {
  it('puts the stored filters into the state', () => {
    const state = { filterType: new Set(ALLOWED.type), filterAcc: new Set(ALLOWED.acc) };
    const storage = memoryStorage({ 'page-filters': JSON.stringify({ type: ['minor'] }), [ACC_STORAGE_KEY]: JSON.stringify({ acc: ['flat'] }) });
    applySavedFilters(state, 'page-filters', ALLOWED, storage);

    assert.deepEqual([...state.filterType], ['minor']);
    assert.deepEqual([...state.filterAcc], ['flat']);
  });

  it('keeps the current values of a group with nothing valid stored', () => {
    const state = { filterType: new Set(['major']), filterAcc: new Set(['sharp']) };
    const storage = memoryStorage({ 'page-filters': JSON.stringify({ type: ['major-from'] }) });
    applySavedFilters(state, 'page-filters', ALLOWED, storage);

    assert.deepEqual([...state.filterType], ['major']);
    assert.deepEqual([...state.filterAcc], ['sharp']);
  });
});

describe('initFilterChips', () => {
  // Filter chips with click listeners, found by the selectors of initFilterChips
  function fakeChipRoot() {
    const chip = (dataset) => fakeEventTarget({ dataset });
    const chips = { minor: chip({ filterType: 'minor' }), major: chip({ filterType: 'major' }), flat: chip({ filterAcc: 'flat' }) };

    return {
      chips,
      querySelectorAll: (selector) => (selector === '[data-filter-type]' ? [chips.major, chips.minor] : selector === '[data-filter-acc]' ? [chips.flat] : []),
    };
  }

  it('toggles the clicked value and reports the change', () => {
    const state = { filterType: new Set(['major', 'minor']), filterAcc: new Set(['sharp', 'flat']) };
    const root = fakeChipRoot();
    let changes = 0;
    initFilterChips(state, () => { changes += 1; }, root);

    root.chips.minor.click();
    root.chips.flat.click();
    assert.deepEqual([...state.filterType], ['major']);
    assert.deepEqual([...state.filterAcc], ['sharp']);
    assert.equal(changes, 2);
  });

  it('reports nothing when the last active value is clicked', () => {
    const state = { filterType: new Set(['major']), filterAcc: new Set(['sharp']) };
    const root = fakeChipRoot();
    let changes = 0;
    initFilterChips(state, () => { changes += 1; }, root);

    root.chips.major.click();
    assert.deepEqual([...state.filterType], ['major']);
    assert.equal(changes, 0);
  });
});
