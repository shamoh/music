import { renderStavesWhenFontReady } from '/js/notation.js';
import { syncFilterChips, applySavedFilters, initFilterChips } from '/js/scale-filters.js';
import { initSectionTintSelect } from '/js/themes.js';
import { SECTION_TINT_ROW } from '/js/settings-menu.js';
import { initSitePage } from '/js/site-layout.js';
import { createRangePage, FILTER_STORAGE_KEY, ALL_FILTERS } from '/js/range-page.js';

const page = createRangePage();
const { state } = page;

document.addEventListener('DOMContentLoaded', () => {
  initSitePage({ settingsRows: [SECTION_TINT_ROW], analytics: true });
  // Remembered filters, before the URL's scale (which switches its own filters on)
  applySavedFilters(state, FILTER_STORAGE_KEY, ALL_FILTERS);
  page.applyHashToState();
  syncFilterChips(state);
  initFilterChips(state, page.applyFilterChange);
  initSectionTintSelect(document.getElementById('section-tint-select'));
  page.repopulateSelect();
  page.initTooltip();
  page.initStartScales();
  page.initSelectionKeys();
  page.initColumnHighlight();
  page.initScaleSwitching();

  document.getElementById('scale-select').addEventListener('change', (e) => page.selectScale(e.target.value));
  window.addEventListener('hashchange', page.handleHashChange);

  renderStavesWhenFontReady(page.update, [document.getElementById('range-staff')]);
});
