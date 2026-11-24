import { renderStavesWhenFontReady } from './notation.js';
import { initSitePage } from './site-layout.js';
import { initScaleNavigation, savedLastScaleId } from './scale-nav.js';
import { syncFilterChips, applySavedFilters, initFilterChips } from './scale-filters.js';
import { scaleIdToHash, applyHashToState } from './scale-view.js';
import { createScalesPage, FILTER_STORAGE_KEY, ALL_FILTERS } from './scales-page.js';

const page = createScalesPage();
const { state } = page;

// All three minor variants are on the page at once — no variant switching here
function initScaleSwitching() {
  initScaleNavigation({
    heading: page.scaleNavHeading(),
    stickyRow: document.querySelector('.scale-nav-row'),
    swipeArea: document.querySelector('main'),
    onScaleStep: page.switchScale,
    onEnableAllFilters: page.enableAllScaleFilters,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSitePage({ currentSectionId: 'scales', onProfileChange: () => page.update(), analytics: true });
  // Remembered filters, before the URL's (or last) scale, which switches its own filters on
  applySavedFilters(state, FILTER_STORAGE_KEY, ALL_FILTERS);
  if (!location.hash) {
    const saved = savedLastScaleId();
    if (saved) applyHashToState(state, '#' + scaleIdToHash(saved));
  }
  applyHashToState(state, location.hash);
  syncFilterChips(state);
  initFilterChips(state, page.applyFilterChange);

  document.getElementById('scale-select').addEventListener('change', (e) => page.selectScale(e.target.value));
  window.addEventListener('hashchange', () => page.showHashScale(location.hash));

  page.repopulateSelect();
  page.initNoteHighlight();
  initScaleSwitching();

  renderStavesWhenFontReady(page.update, document.querySelectorAll('.staff-container'));
});
