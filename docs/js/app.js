import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  filteredScales,
  accidentalType,
  scaleStartOctave,
  noteNameToSemitone,
  longNoteName,
  adjacentScales,
  shortScaleName,
} from './music.js';
import { renderScaleStaff, renderStavesWhenFontReady } from './notation.js';
import { DEFAULT_SCALE_ID } from './defaults.js';
import { initSitePage } from './site-layout.js';
import { trackScaleView } from './analytics.js';
import { toggledSemitone, elementSemitone, markHighlightedNote, staffLabelSemitone } from './note-highlight.js';
import { initPageKeys, blurFocused } from './page-keys.js';
import { playSlideIn } from './swipe-gesture.js';
import { renderScaleNavHeading, initScaleNavigation, savedLastScaleId, saveLastScaleId, appendScaleOptionGroup } from './scale-nav.js';
import { saveFilters, syncFilterChips, applySavedFilters, enableAllFilters, initFilterChips } from './scale-filters.js';

const state = {
  scaleId: DEFAULT_SCALE_ID,
  filterType: new Set(['major', 'minor']),
  filterAcc:  new Set(['sharp', 'flat']),
  highlight:  null,   // semitone (0–11) of the note highlighted in every octave
};


function $(id) { return document.getElementById(id); }


// ─── Key signature labels and variant helpers ─────────────────────────────────

const SHARP_NAMES = ['fis', 'cis', 'gis', 'dis', 'ais', 'eis', 'his'];
const FLAT_NAMES  = ['hes', 'es',  'as',  'des', 'ges', 'ces', 'fes'];

// Main scale title label: "(2♯ fis, cis)" or "(3♭ hes, es, as)" — long names, B is "hes"
function keySigLabel(keySig) {
  if (keySig === 0) return '';
  if (keySig > 0) {
    return ` (${keySig}♯ : ${SHARP_NAMES.slice(0, keySig).join(', ')})`;
  }
  const n = Math.abs(keySig);
  return ` (${n}♭ : ${FLAT_NAMES.slice(0, n).join(', ')})`;
}

function noteDisplayName(name) {
  return longNoteName(name).toLowerCase();
}

const DOUBLE_SHARP_ENHARMONIC = { Fisis: 'G', Cisis: 'D', Gisis: 'A' };

function noteChipLabel(name) {
  const enh = DOUBLE_SHARP_ENHARMONIC[name];
  return enh ? `${name} (=${enh})` : name;
}

// Compute label like "(2♭ es, as)" or "(1♭ hes, 1♯ cis)" from actual variant notes
function scaleAccidentalLabel(notes) {
  const flatNames = [], sharpNames = [];
  const seen = new Set();
  for (const name of notes.slice(0, 7)) {
    const letter = name === 'B' ? 'H' : name[0].toUpperCase();
    if (seen.has(letter)) continue;
    seen.add(letter);
    const acc = accidentalType(name);
    if (acc === 'flat') flatNames.push(noteDisplayName(name));
    else if (acc === 'sharp') sharpNames.push(noteDisplayName(name));
  }
  const parts = [];
  if (flatNames.length > 0)  parts.push(`${flatNames.length}♭ : ${flatNames.join(', ')}`);
  if (sharpNames.length > 0) parts.push(`${sharpNames.length}♯ : ${sharpNames.join(', ')}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

// "G → Gis, F → Fis" — notes that differ in a variant vs natural
function variantChangeText(entry, variant) {
  const natural = entry.notes;
  const varied  = variant === 'harmonic' ? entry.harmonicNotes : entry.melodicNotes;
  if (!varied) return '';
  const changes = [];
  for (let i = 0; i < natural.length - 1; i++) {
    if (natural[i] !== varied[i]) changes.push(`${natural[i]} → ${noteChipLabel(varied[i])}`);
  }
  return changes.join(', ');
}

// Rebuild h3 content: "baseTitle (keySig) [hint] [· changes]"
function setVariantHeader(sectionId, baseTitle, variantNotes, hintText, changesText) {
  const h3 = $(sectionId).querySelector('h3');
  h3.replaceChildren();
  h3.appendChild(document.createTextNode(baseTitle + scaleAccidentalLabel(variantNotes)));
  if (hintText) {
    const span = document.createElement('span');
    span.className = 'variant-hint';
    span.textContent = ' ' + hintText;
    h3.appendChild(span);
  }
  if (changesText) {
    const span = document.createElement('span');
    span.className = 'variant-changes-inline';
    span.textContent = ' · ' + changesText;
    h3.appendChild(span);
  }
}

// ─── Filter chips ────────────────────────────────────────────────────────────

// Filters remembered between visits (scale-filters.js: the type filter per page, sharp /
// flat shared with the saxophone range page); this page offers dur and moll only
const FILTER_STORAGE_KEY = 'scales-filters';
const ALL_FILTERS = { type: ['major', 'minor'], acc: ['sharp', 'flat'] };

// "Vše zapnout" in the sticky row's filters
function enableAllScaleFilters() {
  enableAllFilters(state, ALL_FILTERS);
  applyFilterChange();
}

// After the user changed the filters: remember them, redraw the chips and keep the shown
// scale, else the first scale offered.
function applyFilterChange() {
  saveFilters(FILTER_STORAGE_KEY, state);
  syncFilterChips(state);
  const visible = filteredScales(state.filterType, state.filterAcc);
  if (!visible.find((s) => s.id === state.scaleId)) {
    state.scaleId = visible[0]?.id ?? DEFAULT_SCALE_ID;
  }
  repopulateSelect();
  update();
}

// ─── Scale select ─────────────────────────────────────────────────────────────

function repopulateSelect() {
  const sel = $('scale-select');
  sel.replaceChildren();

  const scales = filteredScales(state.filterType, state.filterAcc);
  const bothTypes = state.filterType.has('major') && state.filterType.has('minor');

  if (bothTypes) {
    appendScaleOptionGroup(sel, 'Dur',  scales.filter((s) => s.type === 'major'), makeOption);
    appendScaleOptionGroup(sel, 'Moll', scales.filter((s) => s.type === 'minor'), makeOption);
  } else {
    scales.forEach((s) => sel.appendChild(makeOption(s)));
  }

  sel.value = state.scaleId;
}

function makeOption(s) {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = `${s.root} ${s.type === 'major' ? 'dur' : 'moll'}${keySigLabel(s.keySig)}`;
  return opt;
}

// ─── Rendering helpers ────────────────────────────────────────────────────────

function renderNoteRow(containerEl, scaleNotes, chordNoteNames) {
  const chordSet = new Set(chordNoteNames);
  const tonicName = scaleNotes[0]?.name;
  containerEl.replaceChildren();
  scaleNotes.forEach((note) => {
    // A chip is a button: a click highlights the note in every octave (chips, staves)
    const chip = Object.assign(document.createElement('button'), { type: 'button', textContent: noteChipLabel(note.name) });
    let cls = 'note-chip';
    if (note.name === tonicName)       cls += ' tonic';
    else if (chordSet.has(note.name))  cls += ' chord';
    chip.className = cls;
    chip.dataset.semitone = noteNameToSemitone(note.name);
    containerEl.appendChild(chip);
  });
}

// ─── Highlighted note (every octave) ─────────────────────────────────────────

// A note chip or the name label under a staff note highlights that note in every
// octave; a second click (or Escape) turns it off — like the saxophone range page.
function initNoteHighlight() {
  document.querySelectorAll('.note-row').forEach((row) => row.addEventListener('click', (e) => {
    const chip = e.target.closest('.note-chip');
    if (chip) toggleHighlight(elementSemitone(chip));
  }));
  document.querySelectorAll('.staff-container').forEach((staff) => staff.addEventListener('click', (e) => {
    const semitone = staffLabelSemitone(e);
    if (semitone !== null) toggleHighlight(semitone);
  }));
  initPageKeys((e) => {
    if (e.key !== 'Escape' || state.highlight === null) return;
    toggleHighlight(state.highlight);
    blurFocused('.note-chip');
  });
}

function toggleHighlight(semitone) {
  state.highlight = toggledSemitone(state.highlight, semitone);
  markHighlight();
}

function markHighlight() {
  markHighlightedNote(document.querySelectorAll('.note-chip'), state.highlight, { pressable: true });
  markHighlightedNote(document.querySelectorAll('.staff-container [data-note]'), state.highlight);
}

// ─── Previous / next scale (scale-nav.js) ────────────────────────────────────

// Groups of the scale select, in its order
const SCALE_TYPE_ORDER = ['major', 'minor'];
const SCALE_TYPE_LABEL = { major: 'dur', minor: 'moll' };
const SCALE_TYPE_GROUP_LABEL = { major: 'Dur', minor: 'Moll' };

const SCALE_NAV_HEADING = () => ({ root: $('scale-heading'), prev: $('scale-nav-prev'), title: $('scale-nav-title'), next: $('scale-nav-next') });

function updateScaleHeading(entry) {
  renderScaleNavHeading(SCALE_NAV_HEADING(), {
    current: entry,
    scales: filteredScales(state.filterType, state.filterAcc),
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
  const { prev, next } = adjacentScales(filteredScales(state.filterType, state.filterAcc), state.scaleId, SCALE_TYPE_ORDER);
  const target = step < 0 ? prev : next;
  if (!target) return;

  state.scaleId = target.id;
  saveLastScaleId(state.scaleId);
  $('scale-select').value = state.scaleId;
  update();
  playSlideIn([$(target.type === 'major' ? 'major-view' : 'minor-view'), $('scale-nav-title')], step);
}

// All three minor variants are on the page at once — no variant switching here
function initScaleSwitching() {
  initScaleNavigation({
    heading: SCALE_NAV_HEADING(),
    stickyRow: document.querySelector('.scale-nav-row'),
    swipeArea: document.querySelector('main'),
    onScaleStep: switchScale,
    onEnableAllFilters: enableAllScaleFilters,
  });
}

// ─── Main update ──────────────────────────────────────────────────────────────

function update() {
  const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
  if (!entry) return;
  pushHash();
  trackScaleView(state.scaleId);

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
  const octave = scaleStartOctave(entry.id);
  const scale = generateScale(entry.id, octave);
  const chord = getChordNotes(scale);
  const chordNames = chord.map((n) => n.name);

  $('major-title').textContent = `${entry.root} dur${keySigLabel(entry.keySig)}`;
  $('major-chord').textContent = `Akord: ${chordNames.join(' – ')}`;
  renderNoteRow($('major-note-row'), scale, chordNames);
  renderScaleStaff($('major-staff'), scale, chordNames, entry.keySig, false);

  $('major-range-link').href = '/scales/instrument/saxophone/alto/#' + scaleIdToHash(entry.id);
}

function renderMinorView(entry) {
  const octave = scaleStartOctave(entry.id);
  const naturalScale = generateScale(entry.id, octave, 'natural');
  const chord = getChordNotes(naturalScale);
  const chordNames = chord.map((n) => n.name);

  $('minor-chord').textContent = `Akord: ${chordNames.join(' – ')}`;
  setVariantHeader('minor-natural', `Aiolská ${entry.root} moll`, entry.notes, null);
  renderVariant('minor-natural', entry.id, 'natural', chordNames, entry.keySig, true, octave);

  setVariantHeader('minor-harmonic', `Harmonická ${entry.root} moll`, entry.harmonicNotes, null, variantChangeText(entry, 'harmonic'));
  renderVariant('minor-harmonic', entry.id, 'harmonic', chordNames, entry.keySig, true, octave);

  setVariantHeader('minor-melodic', `Melodická ${entry.root} moll`, entry.melodicNotes, '(vzestupná)', variantChangeText(entry, 'melodic'));
  renderVariant('minor-melodic', entry.id, 'melodic', chordNames, entry.keySig, true, octave);

  const code = scaleIdToHash(entry.id);
  const basePath = '/scales/instrument/saxophone/alto/#';
  document.querySelectorAll('#minor-view .range-link[data-range-type]').forEach((a) => {
    const t = a.dataset.rangeType;
    a.href = basePath + code + (t !== 'natural' ? '?type=' + t : '');
  });
}

function renderVariant(sectionId, scaleId, variant, chordNames, keySig = 0, isMinor = false, octave = 4) {
  const section = $(sectionId);
  const scale = generateScale(scaleId, octave, variant);
  renderNoteRow(section.querySelector('.note-row'), scale, chordNames);
  renderScaleStaff(section.querySelector('.staff-container'), scale, chordNames, keySig, isMinor);
}

// ─── URL hash sync ───────────────────────────────────────────────────────────

function scaleIdToHash(id) {
  return id.replace('-major', '-dur').replace('-minor', '-moll');
}

function hashToScaleId(hash) {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  return fragment.replace('-dur', '-major').replace('-moll', '-minor');
}

function applyHash(hash) {
  if (!hash) return;
  const found = SCALE_CATALOG.find((s) => s.id === hashToScaleId(hash));
  // The last scale id is shared with the range page, which also offers types this
  // page cannot show: 'major-from' falls back to its base major scale, others are ignored.
  const entry = found?.baseId ? SCALE_CATALOG.find((s) => s.id === found.baseId) : found;
  if (!entry || (entry.type !== 'major' && entry.type !== 'minor')) return;
  const id = entry.id;
  // Ensure the required filters are active so the scale is visible
  if (!state.filterType.has(entry.type)) state.filterType.add(entry.type);
  if (entry.accidental !== 'natural' && !state.filterAcc.has(entry.accidental)) {
    state.filterAcc.add(entry.accidental);
  }
  state.scaleId = id;
}

function pushHash() {
  const hash = '#' + scaleIdToHash(state.scaleId);
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initSitePage({ currentSectionId: 'scales', onProfileChange: () => update(), analytics: true });
  // Remembered filters, before the URL's (or last) scale, which switches its own filters on
  applySavedFilters(state, FILTER_STORAGE_KEY, ALL_FILTERS);
  if (!location.hash) {
    const saved = savedLastScaleId();
    if (saved) applyHash('#' + scaleIdToHash(saved));
  }
  applyHash(location.hash);
  syncFilterChips(state);
  initFilterChips(state, applyFilterChange);

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId = e.target.value;
    saveLastScaleId(state.scaleId);
    update();
  });

  window.addEventListener('hashchange', () => {
    applyHash(location.hash);
    syncFilterChips(state);
    repopulateSelect();
    update();
  });

  repopulateSelect();
  initNoteHighlight();
  initScaleSwitching();


  renderStavesWhenFontReady(update, document.querySelectorAll('.staff-container'));
});
