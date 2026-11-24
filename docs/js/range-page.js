// State and rendering of the saxophone range page without page side effects: everything the
// page touches (document, location, storage, staff rendering, analytics, animation) is
// injected, so it can be tested with a fake DOM. alto/app.js wires it to the real page. The
// fingerings, the selected note, the start scales and the tooltip live in range-*.js modules.

import { SCALE_CATALOG, filteredScales, adjacentScales, scalePair, dedupePairs } from './music.js';
import { renderRangeStaff } from './notation.js';
import { playSlideIn } from './swipe-gesture.js';
import { renderScaleNavHeading, initScaleNavigation, saveLastScaleId, appendScaleOptionGroup } from './scale-nav.js';
import { saveFilters, syncFilterChips, enableAllFilters } from './scale-filters.js';
import { DEFAULT_SCALE_ID } from './defaults.js';
import { trackScaleView } from './analytics.js';
import { ALL_FILTERS, FILTER_STORAGE_KEY, FULL_RANGE_ID, FULL_RANGE_LABEL, SCALE_TYPE_GROUP_LABEL, SCALE_TYPE_ORDER, VALID_TYPES, codeToScaleId, makeHash, pairName, scaleIdToCode, scaleName, scaleNameWithAccidentals } from './range-names.js';
import { createRangeFingerings } from './range-fingerings.js';
import { createRangeHeader } from './range-header.js';
import { createRangeView } from './range-view.js';
import { createRangeSelection } from './range-selection.js';
import { createRangeStartScales } from './range-start-scales.js';
import { initTooltip } from './range-tooltip.js';

export { scaleName, pairName, scaleNameWithAccidentals, scaleIdToCode, codeToScaleId, makeHash, FILTER_STORAGE_KEY, ALL_FILTERS, FULL_RANGE_ID } from './range-names.js';

export function createRangePage({
  doc = globalThis.document,
  location = globalThis.location,
  history = globalThis.history,
  storage = globalThis.localStorage,
  renderStaff = renderRangeStaff,
  trackView = trackScaleView,
  renderHeading = renderScaleNavHeading,
  slideIn = playSlideIn,
  initNavigation = initScaleNavigation,
} = {}) {
  function visibleScales() {
    return dedupePairs(filteredScales(state.filterType, state.filterAcc));
  }

  const $ = (id) => doc.getElementById(id);


  // ─── State ────────────────────────────────────────────────────────────────────

  const state = {
    scaleId:     DEFAULT_SCALE_ID,
    variantType: 'natural',
    startNote:   null,   // { name, octave } clicked in the full range
    scaleNote:   null,   // { name, octave } scale note or fingering clicked on a scale page
    scaleNoteKey: null,  // scale (id/variant) the scaleNote belongs to
    scaleNotes:  [],     // notes of the shown scale within the range (arrow-key navigation)
    rangeNotes:  [],     // all range notes in the staff's spelling (scale page)
    columnNote:  null,   // semitone (0–11) of the fingering column whose note is highlighted
    filterType:  new Set(['major', 'minor', 'whole-tone', 'major-from']),
    filterAcc:   new Set(['sharp', 'flat']),
  };

  // The note details are rendered by modules that share the state; the selection tells them
  // which note is selected, they tell it what to redraw (lazy references: set up below)
  const fingerings = createRangeFingerings({ doc, $, state, selectedNote: () => selection.selectedNote() });
  const startScales = createRangeStartScales({ doc, $, state });
  const selection = createRangeSelection({ doc, $, state, onNoteChange: renderNoteDetails, onColumnChange: fingerings.markSelectedNote });
  const { renderFingeringChart, renderNoteFingerings, markSelectedNote } = fingerings;
  const { initStartScales, initSelectionKeys, initColumnHighlight } = selection;
  const header = createRangeHeader({ doc, $, visibleScales, renderHeading });
  const view = createRangeView({ doc, $, state, renderStaff, trackView, header, fingerings, renderNoteDetails, pushHash, clearHash });

  function update() {
    view.update();
  }

  function applyHashToState() {
    const raw = location.hash.startsWith('#') ? location.hash.slice(1) : '';
    if (!raw) {
      state.scaleId     = FULL_RANGE_ID;
      state.variantType = 'natural';
      return true;
    }
    const [fragment, query] = raw.split('?');
    const entry = SCALE_CATALOG.find((s) => s.id === codeToScaleId(fragment));
    if (!entry) return false;
    const rawType = new URLSearchParams(query || '').get('type') || 'natural';
    const type = (entry.type === 'minor' && VALID_TYPES.includes(rawType)) ? rawType : 'natural';
    if (!state.filterType.has(entry.type)) state.filterType.add(entry.type);
    if (entry.accidental !== 'natural' && !state.filterAcc.has(entry.accidental)) {
      state.filterAcc.add(entry.accidental);
    }
    // Both scales of an enharmonic pair show the same page — use the one the select offers
    const shown = visibleScales().find((s) => scalePair(s).includes(entry));
    state.scaleId     = shown?.id ?? entry.id;
    state.variantType = type;
    return true;
  }

  function pushHash(entry, type) {
    const hash = makeHash(entry, type);
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  // The full range has no hash — drop it from the URL.
  function clearHash() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  // ─── Filter chips ─────────────────────────────────────────────────────────────


  // "Vše zapnout" in the sticky row's filters
  function enableAllScaleFilters() {
    enableAllFilters(state, ALL_FILTERS);
    applyFilterChange();
  }

  // After the user changed the filters: remember them, redraw the chips and keep the shown
  // scale (or the one offered for its enharmonic pair), else the first scale offered.
  function applyFilterChange() {
    saveFilters(FILTER_STORAGE_KEY, state, storage);
    syncFilterChips(state, doc);
    if (state.scaleId !== FULL_RANGE_ID) {
      const visible = visibleScales();
      const shown = visible.find((s) => scalePair(s).some((p) => p.id === state.scaleId));
      state.scaleId = shown?.id ?? visible[0]?.id ?? DEFAULT_SCALE_ID;
    }
    repopulateSelect();
    update();
  }

  // ─── Scale select ─────────────────────────────────────────────────────────────

  function repopulateSelect() {
    const sel = $('scale-select');
    sel.replaceChildren();
    const scales = visibleScales();
    // "Celý rozsah" on top; scales grouped by type so they stay visually apart from it
    sel.appendChild(Object.assign(doc.createElement('option'), { value: FULL_RANGE_ID, textContent: FULL_RANGE_LABEL }));
    SCALE_TYPE_ORDER.forEach((t) => appendScaleOptionGroup(sel, SCALE_TYPE_GROUP_LABEL[t], scales.filter((s) => s.type === t), makeOption, doc));
    sel.value = state.scaleId;
  }

  function makeOption(s) {
    const opt = doc.createElement('option');
    opt.value = s.id;
    opt.textContent = scalePair(s).map(scaleNameWithAccidentals).join(' | ');
    return opt;
  }

  // Switches to the previous (step −1) / next (+1) scale in the order of the scale
  // select (scale-nav.js: keys, swipe, the ‹ / › links). The page slides in from the side
  // it came from. Nothing on the full range and at the ends of the list.
  function switchScale(step) {
    if (state.scaleId === FULL_RANGE_ID) return;
    const { prev, next } = adjacentScales(visibleScales(), state.scaleId, SCALE_TYPE_ORDER);
    const target = step < 0 ? prev : next;
    if (!target) return;

    saveLastScaleId(target.id, storage);
    pendingSlideStep = step;
    location.hash = makeHash(target, 'natural');
  }

  // Switches a minor scale by `step` variants (aiolská → harmonická → melodická; −1 / +1
  // from keys and swipes, also ±2 from the variant switcher). Nothing for other scales
  // and beyond the ends.
  function switchVariant(step) {
    const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
    if (entry?.type !== 'minor') return;
    const type = VALID_TYPES[VALID_TYPES.indexOf(state.variantType) + step];
    if (!type) return;

    pendingSlideStep = step;
    location.hash = makeHash(entry, type);
  }

  // Step of the switch whose page is being rendered (hashchange), for its slide animation
  let pendingSlideStep = 0;

  // Everything in the scale box below the (sticky) heading slides in, and the title
  function playScaleSlide() {
    if (pendingSlideStep === 0) return;
    const step = pendingSlideStep;
    pendingSlideStep = 0;
    slideIn([...doc.querySelectorAll('.range-section > :not(.title-row)'), $('range-title')], step);
  }

  function initScaleSwitching() {
    // A variant picked in the switcher (or its ‹ / › buttons) slides in like a variant switched by a key
    $('type-nav').addEventListener('click', (event) => {
      const control = event.target.closest('[data-variant-step]');
      if (!control || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      switchVariant(Number(control.dataset.variantStep));
    });
    initNavigation({
      heading: header.scaleNavHeading(),
      stickyRow: doc.querySelector('.range-section > .scale-nav-row'),
      swipeArea: doc.querySelector('.range-section'),
      variantSwipeArea: $('type-nav'),
      onScaleStep: switchScale,
      onVariantStep: switchVariant,
      onEnableAllFilters: enableAllScaleFilters,
      doc,
    });
  }

  function renderNoteDetails() {
    if (state.scaleId === FULL_RANGE_ID) startScales.renderStartScales();
    renderNoteFingerings();
    markSelectedNote();
  }

  // The scale (or "Celý rozsah") picked in the select
  function selectScale(scaleId) {
    state.scaleId     = scaleId;
    state.variantType = 'natural';
    if (state.scaleId !== FULL_RANGE_ID) saveLastScaleId(state.scaleId, storage);
    update();
  }

  // The URL hash changed: show its scale and slide it in when a switch caused the change
  function handleHashChange() {
    applyHashToState();
    syncFilterChips(state, doc);
    repopulateSelect();
    update();
    playScaleSlide();
  }

  return {
    state,
    repopulateSelect,
    applyFilterChange,
    applyHashToState,
    selectScale,
    handleHashChange,
    switchScale,
    switchVariant,
    update,
    initTooltip: () => initTooltip(doc),
    initStartScales,
    initSelectionKeys,
    initColumnHighlight,
    initScaleSwitching,
  };
}
