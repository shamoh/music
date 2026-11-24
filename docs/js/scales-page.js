// State and rendering of the scales page without page side effects: everything the page
// touches (document, location, storage, staff rendering, analytics, animation) is injected,
// so it can be tested with a fake DOM. app.js wires it to the real page.

import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  filteredScales,
  scaleStartOctave,
  adjacentScales,
  shortScaleName,
  keySigLabel,
  variantChangeText,
} from './music.js';
import { setVariantHeader, makeOption, renderNoteRow, scaleIdToHash, applyHashToState } from './scale-view.js';
import { renderScaleStaff } from './notation.js';
import { DEFAULT_SCALE_ID } from './defaults.js';
import { trackScaleView } from './analytics.js';
import { toggledSemitone, markHighlightedNote, elementSemitone, staffLabelSemitone } from './note-highlight.js';
import { initPageKeys, blurFocused } from './page-keys.js';
import { playSlideIn } from './swipe-gesture.js';
import { renderScaleNavHeading, saveLastScaleId, appendScaleOptionGroup } from './scale-nav.js';
import { saveFilters, syncFilterChips, enableAllFilters } from './scale-filters.js';

// Filters remembered between visits (scale-filters.js: the type filter per page, sharp /
// flat shared with the saxophone range page); this page offers dur and moll only
export const FILTER_STORAGE_KEY = 'scales-filters';
export const ALL_FILTERS = { type: ['major', 'minor'], acc: ['sharp', 'flat'] };

// Groups of the scale select, in its order
const SCALE_TYPE_ORDER = ['major', 'minor'];
const SCALE_TYPE_LABEL = { major: 'dur', minor: 'moll' };
const SCALE_TYPE_GROUP_LABEL = { major: 'Dur', minor: 'Moll' };

const ALTO_RANGE_PATH = '/scales/instrument/saxophone/alto/#';

export function createScalesPage({
  doc = globalThis.document,
  location = globalThis.location,
  history = globalThis.history,
  storage = globalThis.localStorage,
  renderStaff = renderScaleStaff,
  trackView = trackScaleView,
  renderHeading = renderScaleNavHeading,
  slideIn = playSlideIn,
} = {}) {
  const state = {
    scaleId: DEFAULT_SCALE_ID,
    filterType: new Set(['major', 'minor']),
    filterAcc:  new Set(['sharp', 'flat']),
    highlight:  null,   // semitone (0–11) of the note highlighted in every octave
  };

  const $ = (id) => doc.getElementById(id);
  const offeredScales = () => filteredScales(state.filterType, state.filterAcc);
  const scaleNavHeading = () => ({ root: $('scale-heading'), prev: $('scale-nav-prev'), title: $('scale-nav-title'), next: $('scale-nav-next') });

  // ─── Scale select ───────────────────────────────────────────────────────────

  function repopulateSelect() {
    const select = $('scale-select');
    select.replaceChildren();

    const scales = offeredScales();
    const bothTypes = state.filterType.has('major') && state.filterType.has('minor');
    const option = (scale) => makeOption(scale, doc);

    if (bothTypes) {
      appendScaleOptionGroup(select, 'Dur',  scales.filter((s) => s.type === 'major'), option, doc);
      appendScaleOptionGroup(select, 'Moll', scales.filter((s) => s.type === 'minor'), option, doc);
    } else {
      scales.forEach((s) => select.appendChild(option(s)));
    }

    select.value = state.scaleId;
  }

  // ─── Filters ────────────────────────────────────────────────────────────────

  // After the user changed the filters: remember them, redraw the chips and keep the shown
  // scale, else the first scale offered.
  function applyFilterChange() {
    saveFilters(FILTER_STORAGE_KEY, state, storage);
    syncFilterChips(state, doc);
    const visible = offeredScales();
    if (!visible.find((s) => s.id === state.scaleId)) {
      state.scaleId = visible[0]?.id ?? DEFAULT_SCALE_ID;
    }
    repopulateSelect();
    update();
  }

  // "Vše zapnout" in the sticky row's filters
  function enableAllScaleFilters() {
    enableAllFilters(state, ALL_FILTERS);
    applyFilterChange();
  }

  // ─── Highlighted note (every octave) ────────────────────────────────────────

  function toggleHighlight(semitone) {
    state.highlight = toggledSemitone(state.highlight, semitone);
    markHighlight();
  }

  // A note chip or the name label under a staff note highlights that note in every
  // octave; a second click (or Escape) turns it off — like the saxophone range page.
  function initNoteHighlight() {
    doc.querySelectorAll('.note-row').forEach((row) => row.addEventListener('click', (e) => {
      const chip = e.target.closest('.note-chip');
      if (chip) toggleHighlight(elementSemitone(chip));
    }));
    doc.querySelectorAll('.staff-container').forEach((staff) => staff.addEventListener('click', (e) => {
      const semitone = staffLabelSemitone(e);
      if (semitone !== null) toggleHighlight(semitone);
    }));
    initPageKeys((e) => {
      if (e.key !== 'Escape' || state.highlight === null) return;
      toggleHighlight(state.highlight);
      blurFocused('.note-chip', doc);
    }, doc);
  }

  function markHighlight() {
    markHighlightedNote(doc.querySelectorAll('.note-chip'), state.highlight, { pressable: true });
    markHighlightedNote(doc.querySelectorAll('.staff-container [data-note]'), state.highlight);
  }

  // ─── Previous / next scale ──────────────────────────────────────────────────

  function updateScaleHeading(entry) {
    renderHeading(scaleNavHeading(), {
      current: entry,
      scales: offeredScales(),
      typeOrder: SCALE_TYPE_ORDER,
      scaleLabel: (s) => shortScaleName(s, SCALE_TYPE_LABEL[s.type]),
      groupLabel: (type) => SCALE_TYPE_GROUP_LABEL[type],
      href: (target) => '#' + scaleIdToHash(target.id),
    });
  }

  // Switches to the previous (step −1) / next (+1) scale in the order of the scale select
  // (keys, swipe, the ‹ / › links), like picking it in the select. The scale slides in
  // from the side it came from. Nothing at the ends of the list.
  function switchScale(step) {
    const { prev, next } = adjacentScales(offeredScales(), state.scaleId, SCALE_TYPE_ORDER);
    const target = step < 0 ? prev : next;
    if (!target) return;

    state.scaleId = target.id;
    saveLastScaleId(state.scaleId, storage);
    $('scale-select').value = state.scaleId;
    update();
    slideIn([$(target.type === 'major' ? 'major-view' : 'minor-view'), $('scale-nav-title')], step);
  }

  // The scale picked in the select
  function selectScale(scaleId) {
    state.scaleId = scaleId;
    saveLastScaleId(state.scaleId, storage);
    update();
  }

  // The URL hash changed: show its scale (switching on the filters it needs)
  function showHashScale(hash) {
    applyHashToState(state, hash);
    syncFilterChips(state, doc);
    repopulateSelect();
    update();
  }

  // ─── Main update ────────────────────────────────────────────────────────────

  function pushHash() {
    const hash = '#' + scaleIdToHash(state.scaleId);
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  function update() {
    const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
    if (!entry) return;
    pushHash();
    trackView(state.scaleId);

    if (entry.type === 'major') {
      $('major-view').hidden = false;
      $('minor-view').hidden = true;
      renderMajorView(entry);
    } else {
      $('major-view').hidden = true;
      $('minor-view').hidden = false;
      renderMinorView(entry);
    }
    updateScaleHeading(entry);
    markHighlight();
  }

  function renderMajorView(entry) {
    const scale = generateScale(entry.id, scaleStartOctave(entry.id));
    const chordNames = getChordNotes(scale).map((n) => n.name);

    $('major-title').textContent = `${entry.root} dur${keySigLabel(entry.keySig)}`;
    $('major-chord').textContent = `Akord: ${chordNames.join(' – ')}`;
    renderNoteRow($('major-note-row'), scale, chordNames, doc);
    renderStaff($('major-staff'), scale, chordNames, entry.keySig, false);

    $('major-range-link').href = ALTO_RANGE_PATH + scaleIdToHash(entry.id);
  }

  function renderMinorView(entry) {
    const octave = scaleStartOctave(entry.id);
    const naturalScale = generateScale(entry.id, octave, 'natural');
    const chordNames = getChordNotes(naturalScale).map((n) => n.name);

    $('minor-chord').textContent = `Akord: ${chordNames.join(' – ')}`;
    setVariantHeader($('minor-natural'), `Aiolská ${entry.root} moll`, entry.notes, null, undefined, doc);
    renderVariant('minor-natural', entry, 'natural', chordNames, octave);

    setVariantHeader($('minor-harmonic'), `Harmonická ${entry.root} moll`, entry.harmonicNotes, null, variantChangeText(entry, 'harmonic'), doc);
    renderVariant('minor-harmonic', entry, 'harmonic', chordNames, octave);

    setVariantHeader($('minor-melodic'), `Melodická ${entry.root} moll`, entry.melodicNotes, '(vzestupná)', variantChangeText(entry, 'melodic'), doc);
    renderVariant('minor-melodic', entry, 'melodic', chordNames, octave);

    const code = scaleIdToHash(entry.id);
    doc.querySelectorAll('#minor-view .range-link[data-range-type]').forEach((a) => {
      const type = a.dataset.rangeType;
      a.href = ALTO_RANGE_PATH + code + (type !== 'natural' ? '?type=' + type : '');
    });
  }

  function renderVariant(sectionId, entry, variant, chordNames, octave) {
    const section = $(sectionId);
    const scale = generateScale(entry.id, octave, variant);
    renderNoteRow(section.querySelector('.note-row'), scale, chordNames, doc);
    renderStaff(section.querySelector('.staff-container'), scale, chordNames, entry.keySig, true);
  }

  return {
    state,
    scaleNavHeading,
    repopulateSelect,
    applyFilterChange,
    enableAllScaleFilters,
    toggleHighlight,
    initNoteHighlight,
    switchScale,
    selectScale,
    showHashScale,
    update,
  };
}
