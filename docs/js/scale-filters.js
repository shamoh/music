// Scale filters of the scale pages (type: dur / moll / …, accidentals: sharp / flat):
// remembered between visits (localStorage) and drawn on the filter chips
// ([data-filter-type] / [data-filter-acc] buttons). The type filter is stored per page
// (the pages offer different types), the sharp / flat filter is shared by all pages.

export const ACC_STORAGE_KEY = 'scales-filters-acc';

// Filters stored for the page: { filterType, filterAcc }, each a Set, or null when
// nothing (valid) is stored for that group. Values the page doesn't offer are dropped;
// a group left empty is not valid (at least one chip of each group stays on).
// typeStorageKey: the page's key; allowed: { type: [...], acc: [...] } — what the page
// offers.
export function loadSavedFilters(typeStorageKey, allowed, storage = globalThis.localStorage) {
  const savedType = parseSavedJson(readItem(storage, typeStorageKey));
  const savedAcc = parseSavedJson(readItem(storage, ACC_STORAGE_KEY));

  return {
    filterType: pickFilterValues(savedType?.type, allowed.type),
    filterAcc: pickFilterValues(savedAcc?.acc, allowed.acc),
  };
}

// The stored values the page offers as a Set, or null when none is left.
export function pickFilterValues(values, offered) {
  if (!Array.isArray(values)) return null;
  const picked = values.filter((v) => offered.includes(v));

  return picked.length > 0 ? new Set(picked) : null;
}

export function parseSavedJson(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function readItem(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch (_) {
    return null;
  }
}

export function saveFilters(typeStorageKey, { filterType, filterAcc }, storage = globalThis.localStorage) {
  try {
    storage?.setItem(typeStorageKey, JSON.stringify({ type: [...filterType] }));
    storage?.setItem(ACC_STORAGE_KEY, JSON.stringify({ acc: [...filterAcc] }));
  } catch (_) {}
}

// Draws the filter state on the chips (also after a scale from the URL switched a filter on).
export function syncFilterChips({ filterType, filterAcc }, root = document) {
  root.querySelectorAll('[data-filter-type]').forEach((chip) => setChipActive(chip, filterType.has(chip.dataset.filterType)));
  root.querySelectorAll('[data-filter-acc]').forEach((chip) => setChipActive(chip, filterAcc.has(chip.dataset.filterAcc)));
}

function setChipActive(chip, active) {
  chip.classList.toggle('active', active);
  chip.setAttribute('aria-pressed', String(active));
}
