import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  buildAltSaxRange,
  altSaxRangeSection,
  notePitchMidi,
  pitchSpellings,
  rangeScaleNotes,
  findSamePitch,
  adjacentNote,
  scaleNeighborsLabel,
  octaveNote,
  rangeEndNote,
  noteNameToSemitone,
  filteredScales,
  accidentalType,
  adjacentScales,
  scalePair,
  dedupePairs,
  splitOctaveNumbers,
  scaleStartOctave,
  scaleAccidentalsLabel,
  scaleNoteLabels,
  scalesStartingAt,
  shortNoteName,
  shortScaleName,
} from '/js/music.js';
import { renderRangeStaff, renderStavesWhenFontReady } from '/js/notation.js';
import { renderKeyDiagram } from '/js/fingering-diagram.js';
import { fingeringFor, fingeringRows, columnLabels } from '/js/fingering.js';
import { SAXOPHONE_ALTO } from '/js/instrument/saxophone/alto/instrument.js';
import { toggledSemitone, elementSemitone, markHighlightedNote, staffLabelSemitone } from '/js/note-highlight.js';
import { initPageKeys, blurFocused, isFormField, navigationKey } from '/js/page-keys.js';
import { playSlideIn } from '/js/swipe-gesture.js';
import { renderScaleNavHeading, initScaleNavigation, saveLastScaleId, appendScaleOptionGroup } from '/js/scale-nav.js';
import { saveFilters, syncFilterChips, applySavedFilters, enableAllFilters, initFilterChips } from '/js/scale-filters.js';
import { initSectionTintSelect } from '/js/themes.js';
import { DEFAULT_SCALE_ID } from '/js/defaults.js';
import { SECTION_TINT_ROW } from '/js/settings-menu.js';
import { initSitePage } from '/js/site-layout.js';
import { trackScaleView } from '/js/analytics.js';

const VALID_TYPES = ['natural', 'harmonic', 'melodic'];
const TYPE_LABELS = { natural: 'Aiolská', harmonic: 'Harmonická', melodic: 'Melodická' };

// Pseudo scale id for the whole instrument range (all notes, no scale).
// It is shown when the page has no hash.
const FULL_RANGE_ID = 'full-range';
const FULL_RANGE_LABEL = 'Celý rozsah';

const SCALE_HINT      = 'Noty stupnice zvýrazněny barevně, ostatní šedě. Klepnutím na notu nebo hmat zobrazíte název tónu a jeho základní i alternativní hmaty.';
const FULL_RANGE_HINT = 'Klepnutím na notu nebo hmat zobrazíte názvy tónu, stupnice, které jím začínají, a jeho základní i alternativní hmaty.';

// Scale-type label shown in the title and the combo box.
const SCALE_TYPE_LABEL = { major: 'dur', minor: 'moll', 'whole-tone': 'celotónová', 'major-from': 'dur' };
const SCALE_TYPE_GROUP_LABEL = { major: 'Dur', minor: 'Moll', 'whole-tone': 'Celotónové', 'major-from': 'Dur od tónu' };
const SCALE_TYPE_ORDER = ['major', 'minor', 'whole-tone', 'major-from'];

// "B dur", "a moll", "C celotónová"
function scaleName(entry) {
  return `${entry.root} ${SCALE_TYPE_LABEL[entry.type]}`;
}

// Short name for the heading, prev/next links and the start-scales panel:
// "A♯ dur | B dur" for enharmonic pairs, otherwise "F♯ dur".
function pairName(entry) {
  return scalePair(entry).map((s) => shortScaleName(s, SCALE_TYPE_LABEL[s.type])).join(' | ');
}

// "B dur (2♭ : be, es)"
function scaleNameWithAccidentals(entry) {
  const acc = scaleAccidentalsLabel(entry);

  return acc ? `${scaleName(entry)} (${acc})` : scaleName(entry);
}

// Scales offered in the select and the prev/next nav — one per enharmonic pair.
function visibleScales() {
  return dedupePairs(filteredScales(state.filterType, state.filterAcc));
}

function $(id) { return document.getElementById(id); }


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

// ─── URL helpers ──────────────────────────────────────────────────────────────

// Whole-tone ids already end in the English '-whole-tone' suffix, so no
// translation is needed for that type — only dur/moll get a Czech code.
// '-major-from' does not end with '-major', so the suffixes never collide.
const ID_CODE_SUFFIXES = [
  ['-major', '-dur'],
  ['-minor', '-moll'],
  ['-major-from', '-dur-od-tonu'],
];

function scaleIdToCode(id) {
  const found = ID_CODE_SUFFIXES.find(([suf]) => id.endsWith(suf));
  return found ? id.slice(0, -found[0].length) + found[1] : id;
}

function codeToScaleId(code) {
  const found = ID_CODE_SUFFIXES.find(([, cd]) => code.endsWith(cd));
  return found ? code.slice(0, -found[1].length) + found[0] : code;
}

function makeHash(entry, type) {
  const code = scaleIdToCode(entry.id);
  const suffix = (entry.type === 'minor' && type !== 'natural') ? '?type=' + type : '';
  return '#' + code + suffix;
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

// Filters remembered between visits (scale-filters.js: the type filter per page, sharp /
// flat shared with the Stupnice page); this page offers all scale types
const FILTER_STORAGE_KEY = 'scales-range-filters';
const ALL_FILTERS = { type: SCALE_TYPE_ORDER, acc: ['sharp', 'flat'] };

// "Vše zapnout" in the sticky row's filters
function enableAllScaleFilters() {
  enableAllFilters(state, ALL_FILTERS);
  applyFilterChange();
}

// After the user changed the filters: remember them, redraw the chips and keep the shown
// scale (or the one offered for its enharmonic pair), else the first scale offered.
function applyFilterChange() {
  saveFilters(FILTER_STORAGE_KEY, state);
  syncFilterChips(state);
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
  sel.appendChild(Object.assign(document.createElement('option'), { value: FULL_RANGE_ID, textContent: FULL_RANGE_LABEL }));
  SCALE_TYPE_ORDER.forEach((t) => appendScaleOptionGroup(sel, SCALE_TYPE_GROUP_LABEL[t], scales.filter((s) => s.type === t), makeOption));
  sel.value = state.scaleId;
}

function makeOption(s) {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = scalePair(s).map(scaleNameWithAccidentals).join(' | ');
  return opt;
}

// ─── Type sub-nav ─────────────────────────────────────────────────────────────

// Variant switcher: Aiolská | Harmonická | Melodická. On touch devices it has ‹ / ›
// buttons at its sides (CSS) — the previous / next variant, disabled at the ends —
// which also show that the switcher takes a swipe.
function updateTypeNav(entry, currentType) {
  const nav = $('type-nav');
  if (entry?.type !== 'minor') {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;
  nav.replaceChildren();
  const currentIndex = VALID_TYPES.indexOf(currentType);
  nav.appendChild(makeVariantArrow({ step: -1, disabled: currentIndex === 0 }));
  VALID_TYPES.forEach((type, i) => {
    if (i > 0) {
      nav.appendChild(Object.assign(document.createElement('span'), { className: 'type-nav-sep' }));
    }
    if (type === currentType) {
      nav.appendChild(Object.assign(document.createElement('strong'), { textContent: TYPE_LABELS[type] }));
    } else {
      const link = Object.assign(document.createElement('a'), { href: makeHash(entry, type), textContent: TYPE_LABELS[type] });
      link.dataset.variantStep = String(i - currentIndex);
      nav.appendChild(link);
    }
  });
  nav.appendChild(makeVariantArrow({ step: 1, disabled: currentIndex === VALID_TYPES.length - 1 }));
}

function makeVariantArrow({ step, disabled }) {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'type-nav-arrow',
    textContent: step < 0 ? '‹' : '›',
    disabled,
  });
  button.dataset.variantStep = String(step);
  button.setAttribute('aria-label', step < 0 ? 'Předchozí varianta' : 'Další varianta');

  return button;
}

// ─── Heading: ‹ previous | current | next › ──────────────────────────────────

// Previous / next scale in the order of the scale select (scale-nav.js); the full range
// has only its title. The hints about switching don't apply there.
function updateScaleHeading(entry) {
  renderScaleNavHeading(SCALE_NAV_HEADING(), {
    current: entry ?? null,
    scales: visibleScales(),
    typeOrder: SCALE_TYPE_ORDER,
    scaleLabel: pairName,
    groupLabel: (type) => SCALE_TYPE_GROUP_LABEL[type],
    href: (target) => makeHash(target, 'natural'),
    emptyTitle: FULL_RANGE_LABEL,
  });
  const isMinor = entry?.type === 'minor';
  $('touch-hint').hidden = !entry;
  $('touch-hint-variant').hidden = !isMinor;
  $('scale-switch-key-hint').hidden = !entry;
  $('variant-switch-key-hint').hidden = !isMinor;
}

const SCALE_NAV_HEADING = () => ({ root: $('scale-heading'), prev: $('scale-nav-prev'), title: $('range-title'), next: $('scale-nav-next') });

// ─── Subtitle: "B dur: B3 C4 … B4 (2♭ : be, es)" ─────────────────────────────

// "**Fis dur**: F♯ G♯ A♯ H C♯ D♯ E♯ F♯" — bold name, then the text.
// Octave numbers in the text (full range bounds) are drawn as a smaller subscript.
function setSubtitle(el, name, text, suffix = '') {
  el.replaceChildren();
  el.appendChild(Object.assign(document.createElement('strong'), { textContent: name }));
  el.appendChild(document.createTextNode(': '));
  for (const part of splitOctaveNumbers(text)) {
    el.appendChild(part.octave
      ? Object.assign(document.createElement('span'), { className: 'range-subtitle-octave', textContent: part.text })
      : document.createTextNode(part.text));
  }
  if (suffix) el.appendChild(document.createTextNode(suffix));
}

// "**Fis dur**: F♯ · G♯ · …" — every note is a button that highlights that note in
// every octave (staves, fingerings), like a fingering column name.
function setScaleSubtitle(el, entry, variant) {
  const notes = generateScale(entry.id, scaleStartOctave(entry.id), variant);
  el.replaceChildren();
  el.appendChild(Object.assign(document.createElement('strong'), { textContent: scaleName(entry) }));
  el.appendChild(document.createTextNode(': '));
  scaleNoteLabels(notes, entry.type === 'minor').forEach(({ label, semitone }, i) => {
    if (i > 0) el.appendChild(document.createTextNode(' · '));
    const note = Object.assign(document.createElement('button'), { type: 'button', className: 'subtitle-note', textContent: label });
    note.dataset.semitone = semitone;
    el.appendChild(note);
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

// Fills the tooltip with the multi-line label; octave numbers get a muted span
// (the note name matters more than its octave).
// One block per line; the "mimo stupnici …" line (annotateOutsideNotes) is a note about
// the tone, not one of its names — drawn smaller and muted.
const OUTSIDE_SCALE_PREFIX = 'mimo stupnici';

function setTooltipContent(el, label) {
  el.replaceChildren();
  for (const line of label.split('\n')) {
    const lineEl = document.createElement('div');
    if (line.startsWith(OUTSIDE_SCALE_PREFIX)) {
      lineEl.className = 'note-extra';
      lineEl.textContent = line;
    } else {
      for (const { text, octave } of splitOctaveNumbers(line)) {
        lineEl.appendChild(octave
          ? Object.assign(document.createElement('span'), { className: 'note-octave', textContent: text })
          : document.createTextNode(text));
      }
    }
    el.appendChild(lineEl);
  }
}

function initTooltip() {
  const rangeEl = document.querySelector('.range-section');
  if (!rangeEl) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'note-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  let timer = null;
  let activeHighlight = null;

  function clearHighlight() {
    if (activeHighlight) { activeHighlight.setAttribute('fill', 'none'); activeHighlight = null; }
  }

  function hide() { tooltip.hidden = true; clearHighlight(); }

  function show(e) {
    const g = e.target.closest('[data-tooltip]');
    const isTouch = e.pointerType === 'touch';
    if (g) {
      setTooltipContent(tooltip, g.dataset.tooltip);
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top  = (e.clientY - (isTouch ? 60 : 0)) + 'px';
      tooltip.hidden = false;
      clearHighlight();
      activeHighlight = g.querySelector('[data-highlight]');
      if (activeHighlight) activeHighlight.setAttribute('fill', 'rgba(255,255,255,0.22)');
      if (isTouch) { clearTimeout(timer); timer = setTimeout(hide, 5000); }
    } else if (e.type === 'pointermove') {
      hide();
    }
  }

  rangeEl.addEventListener('pointermove', show);
  rangeEl.addEventListener('pointerdown', show);
  rangeEl.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hide(); });
  rangeEl.addEventListener('pointerup',   (e) => { if (e.pointerType !== 'touch') setTimeout(hide, 1200); });
}

// ─── Full range: scales starting on the clicked note ─────────────────────────

const START_SCALE_GROUPS = [
  ['major', 'Dur'],
  ['minor', 'Moll'],
  ['whole-tone', 'Celotónová'],
  ['major-from', 'Dur od tónu'],
];

function renderStartScales() {
  const panel = $('start-scales');
  panel.replaceChildren();
  const note = state.startNote;
  panel.hidden = !note;
  if (!note) return;

  // "Stupnice od tónu C♯4" — written like the tooltip: full-size accidental,
  // smaller muted octave number
  const title = Object.assign(document.createElement('p'), {
    className: 'start-scales-title',
    textContent: `Stupnice od tónu ${shortNoteName(note.name)}`,
  });
  title.appendChild(Object.assign(document.createElement('span'), { className: 'note-octave', textContent: String(note.octave) }));
  panel.appendChild(title);
  const scales = dedupePairs(scalesStartingAt(note.name, note.octave));
  const list = document.createElement('dl');
  for (const [type, label] of START_SCALE_GROUPS) {
    const ofType = scales.filter((s) => s.type === type);
    if (ofType.length === 0) continue;
    list.appendChild(Object.assign(document.createElement('dt'), { textContent: label }));
    const dd = document.createElement('dd');
    ofType.forEach((s, i) => {
      if (i > 0) dd.appendChild(Object.assign(document.createElement('span'), { className: 'start-scales-sep', textContent: '•' }));
      dd.appendChild(Object.assign(document.createElement('a'), { href: makeHash(s, 'natural'), textContent: pairName(s) }));
    });
    list.appendChild(dd);
  }
  panel.appendChild(list);
}

// Clicking a note on either staff or a fingering in the chart selects the note.
// A note on any staff or a fingering selects the note (also on scale pages);
// clicking the selected note again (in any spelling or place) clears the selection.
// The name label under a staff note highlights that note in every octave instead,
// like a fingering column name. Grey notes outside the scale only show their tooltip.
function initStartScales() {
  for (const id of ['range-staff', 'range-staff-twin', 'range-staff-desc', 'fingering-chart']) {
    $(id).addEventListener('click', (e) => {
      const labelSemitone = staffLabelSemitone(e);
      if (labelSemitone !== null) {
        toggleColumnNote(labelSemitone);
        return;
      }
      const g = e.target.closest('[data-note]');
      if (!g || g.closest('[data-layer="muted-notes"]')) return;
      const clicked = { name: g.dataset.note, octave: Number(g.dataset.octave) };
      const current = selectedNote();
      setSelectedNote(current && findSamePitch([current], clicked) ? null : clicked);
    });
  }
}

// Keyboard on the selected note (scale notes on a scale page, every note in the full
// range): Escape clears it, ←/→ move it to the previous / next note, ↑/↓ an octave
// up / down, Home/End to the lowest / highest note. When the settings menu is open the
// keys belong to it — Escape only closes the menu (themes.js); the capture phase sees
// the menu before it closes. Form controls keep their own keys.
const SELECTION_MOVES = {
  ArrowLeft:  (notes, note) => adjacentNote(notes, note, -1),
  ArrowRight: (notes, note) => adjacentNote(notes, note, 1),
  ArrowDown:  (notes, note, octaveNotes) => octaveNote(octaveNotes, note, -1),
  ArrowUp:    (notes, note, octaveNotes) => octaveNote(octaveNotes, note, 1),
  Home:       (notes) => rangeEndNote(notes, -1),
  End:        (notes) => rangeEndNote(notes, 1),
};

function initSelectionKeys() {
  initPageKeys((e) => {
    // Shift+arrows switch the scale / variant (scale-nav.js)
    if (navigationKey(e)) return;
    const note = selectedNote();
    if (e.key === 'Escape') {
      // Clears the selected note and the highlighted column note
      if (!note && state.columnNote === null) return;
      state.columnNote = null;
      setSelectedNote(null);
      blurFingeringCell();
      return;
    }
    if (!note) return;
    const move = SELECTION_MOVES[e.key];
    if (!move || isFormField(e.target)) return;
    const notes = state.scaleId === FULL_RANGE_ID ? buildAltSaxRange(false) : state.scaleNotes;
    // A note outside the scale moves by an octave to the same note (also outside the
    // scale) — among all range notes
    const octaveNotes = findSamePitch(notes, note) ? notes : state.rangeNotes;
    const next = move(notes, note, octaveNotes);
    if (!next) return;
    e.preventDefault();   // the keys don't scroll the page or the staff
    setSelectedNote({ name: next.name, octave: next.octave });
    blurFingeringCell();
  });
}

// Switches to the previous (step −1) / next (+1) scale in the order of the scale
// select (scale-nav.js: keys, swipe, the ‹ / › links). The page slides in from the side
// it came from. Nothing on the full range and at the ends of the list.
function switchScale(step) {
  if (state.scaleId === FULL_RANGE_ID) return;
  const { prev, next } = adjacentScales(visibleScales(), state.scaleId, SCALE_TYPE_ORDER);
  const target = step < 0 ? prev : next;
  if (!target) return;

  saveLastScaleId(target.id);
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
  playSlideIn([...document.querySelectorAll('.range-section > :not(.title-row)'), $('range-title')], step);
}

function initScaleSwitching() {
  // A variant picked in the switcher (or its ‹ / › buttons) slides in like a variant switched by a key
  $('type-nav').addEventListener('click', (event) => {
    const control = event.target.closest('[data-variant-step]');
    if (!control || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    switchVariant(Number(control.dataset.variantStep));
  });
  initScaleNavigation({
    heading: SCALE_NAV_HEADING(),
    stickyRow: document.querySelector('.range-section > .scale-nav-row'),
    swipeArea: document.querySelector('.range-section'),
    variantSwipeArea: $('type-nav'),
    onScaleStep: switchScale,
    onVariantStep: switchVariant,
    onEnableAllFilters: enableAllScaleFilters,
  });
}

// Clickable note elements that may keep a stale focus ring after a key press
function blurFingeringCell() {
  blurFocused('.fingering-cell, .fingering-header-cell, .subtitle-note');
}

function setSelectedNote(note) {
  if (state.scaleId === FULL_RANGE_ID) state.startNote = note;
  else state.scaleNote = note;
  renderNoteDetails();
}

// The note whose fingerings are shown: clicked in the full range or on a scale page.
function selectedNote() {
  return state.scaleId === FULL_RANGE_ID ? state.startNote : state.scaleNote;
}

// A click on a column name highlights that note's fingerings in every octave;
// a second click (or Escape) turns it off.
function initColumnHighlight() {
  $('fingering-chart').addEventListener('click', (e) => {
    const head = e.target.closest('.fingering-header-cell');
    if (head) toggleColumnNote(elementSemitone(head));
  });
  // The notes in the scale summary above the staff ("Fis dur: F♯ · G♯ · …") do the same
  for (const id of ['range-subtitle', 'twin-subtitle']) {
    $(id).addEventListener('click', (e) => {
      const note = e.target.closest('.subtitle-note');
      if (note) toggleColumnNote(elementSemitone(note));
    });
  }
}

// Highlights the note (semitone 0–11) in every octave, or turns it off when it already is.
function toggleColumnNote(semitone) {
  state.columnNote = toggledSemitone(state.columnNote, semitone);
  markSelectedNote();
}

function renderNoteDetails() {
  if (state.scaleId === FULL_RANGE_ID) renderStartScales();
  renderNoteFingerings();
  markSelectedNote();
}

// ─── Full range: fingerings ──────────────────────────────────────────────────

const FINGERING_CELL_WIDTH  = 60;   // default size; CSS scales it with the cell
const FINGERING_PANEL_WIDTH = 56;

// All names of a fingering's note, as the staff tooltip lists them: natural first, sharps
// above flats, e.g. [Cis4, Des4], [H3, Ces4], [G4, Fisis4].
function rangeSpellings(f) {
  return pitchSpellings(f.note, f.octave);
}

// "C♯" + smaller muted octave number, like the tooltip
function noteNameElement(tag, className, { name, octave }) {
  const el = Object.assign(document.createElement(tag), { className, textContent: shortNoteName(name) });
  el.appendChild(Object.assign(document.createElement('span'), { className: 'note-octave', textContent: String(octave) }));

  return el;
}

// Basic fingerings in rows by range section (same colors as the staff bands); a column
// always holds the same note (C under C, F♯ under F♯). Positions without a fingering
// are slots: grey outside the instrument's range, empty for notes outside the scale.
// scaleNotes: notes of a scale within the range (in the scale's spelling) — only
// these are shown, the tonic's name is marked like on the staff; null = full range,
// every note in sharp and flat spelling. A click on a fingering selects its note.
// rangeNotes (scale page): all range notes in the staff's spelling — names the notes
// outside the scale, whose empty slots can be clicked to show their fingerings.
// allNames (scale page): name the columns with all names of their notes, like the full
// range (whole-tone and "dur od tónu" scales — an enharmonic pair's names are among
// them); otherwise with the scale's spelling only.
function renderFingeringChart(scaleNotes = null, tonicName = null, chordNames = [], lowercase = false, rangeNotes = [], allNames = false) {
  const chart = $('fingering-chart');
  chart.replaceChildren();
  chart.hidden = false;
  chart.appendChild(Object.assign(document.createElement('h3'), { textContent: scaleNotes ? 'Hmaty tónů stupnice' : 'Hmaty' }));

  const scaleByPitch = scaleNotes && new Map(scaleNotes.map((n) => [notePitchMidi(n.name, n.octave), n]));
  const rangeByPitch = new Map(rangeNotes.map((n) => [notePitchMidi(n.name, n.octave), n]));
  // Column names of the tonic and of the chord notes are boxed in the staff label colors
  const roles = { tonic: tonicName ? noteNameToSemitone(tonicName) : null, chord: new Set(chordNames.map(noteNameToSemitone)), lowercase };
  const grid = Object.assign(document.createElement('div'), { className: 'fingering-grid' });
  const { columns, rows } = fingeringRows(SAXOPHONE_ALTO.fingerings, (f) => altSaxRangeSection(f.note, f.octave));
  grid.style.setProperty('--fingering-columns', columns);
  // Spellings shown for a fingering: the scale's name, or sharp and flat in the full range;
  // null for a note outside the scale (not drawn)
  const spellingsOf = (f) => {
    if (!scaleByPitch) return rangeSpellings(f);
    const note = scaleByPitch.get(notePitchMidi(f.note, f.octave));
    if (!note) return null;

    return allNames ? rangeSpellings(f) : [note];
  };
  // Column names above and below the chart — only for columns with a fingering shown
  const labels = columnLabels(rows, spellingsOf);
  grid.appendChild(fingeringHeader(labels, 'top', roles));
  // Every row fills all columns: a fingering, an empty slot for a note outside the shown
  // scale, or a grey slot where the instrument has no note at all (outside its range)
  for (const row of rows) {
    const rowEl = Object.assign(document.createElement('div'), { className: 'fingering-row' });
    for (let column = 1; column <= columns; column++) {
      const f = row.entries[row.columns.indexOf(column)];
      const spellings = f && spellingsOf(f);
      const outside = f && !spellings
        ? rangeByPitch.get(notePitchMidi(f.note, f.octave)) ?? { name: f.note, octave: f.octave }
        : null;
      rowEl.appendChild(spellings
        ? fingeringCell(f, spellings, row.section, column)
        : fingeringSlot(outside ? 'unused' : 'missing', column, outside));
    }
    grid.appendChild(rowEl);
  }
  grid.appendChild(fingeringHeader(labels, 'bottom', roles));
  chart.appendChild(grid);
  markSelectedNote();
}

// Row above / below the chart (position 'top' | 'bottom') naming the note of each column
// (C, C♯ D♭, …) — without octaves, a column holds the same note in every octave. The
// fingerings themselves carry no names. The full range names a column with all names of
// its note (natural first, sharps above flats), a scale page in the scale's spelling — lowercase
// for minor scales, like the labels under the staff notes.
// roles: { tonic: semitone | null, chord: Set, lowercase } — on a scale page the tonic's
// name is boxed red, the chord notes' black (staff colors).
function fingeringHeader(labels, position, { tonic = null, chord = new Set(), lowercase = false } = {}) {
  const header = Object.assign(document.createElement('div'), { className: `fingering-row fingering-header ${position}` });
  for (const [column, spellings] of labels) {
    // A click highlights the fingerings of this note in every octave
    const semitone = noteNameToSemitone(spellings[0].name);
    const role = semitone === tonic ? ' tonic' : chord.has(semitone) ? ' chord' : '';
    const cell = Object.assign(document.createElement('button'), { type: 'button', className: `fingering-header-cell${role}` });
    cell.dataset.semitone = semitone;
    const names = spellings.map((sp) => (lowercase ? shortNoteName(sp.name).toLowerCase() : shortNoteName(sp.name)));
    cell.setAttribute('aria-label', `Zvýraznit hmaty tónu ${names.join(' / ')}`);
    // One grid row: the labels come in data order (the lowest row's columns first)
    cell.style.gridRow = '1';
    cell.style.gridColumnStart = column;
    for (const name of names) {
      cell.appendChild(Object.assign(document.createElement('span'), { className: 'fingering-header-name', textContent: name }));
    }
    header.appendChild(cell);
  }

  return header;
}

// Placeholder keeping a grid position as large as a fingering: kind 'missing' (grey —
// no such note on the instrument) or 'unused' (empty — `note` outside the shown scale;
// a click selects it and shows its fingerings, e.g. for chromatic passing notes).
// Holds an invisible diagram, so it has exactly the height of a fingering.
function fingeringSlot(kind, column, note = null) {
  const slot = note
    ? Object.assign(document.createElement('button'), { type: 'button', className: `fingering-slot ${kind}` })
    : Object.assign(document.createElement('div'), { className: `fingering-slot ${kind}` });
  if (note) {
    slot.dataset.note = note.name;
    slot.dataset.octave = note.octave;
    slot.setAttribute('aria-label', `Hmat ${note.name}${note.octave} (mimo stupnici)`);
  } else {
    slot.setAttribute('aria-hidden', 'true');
  }
  slot.style.gridColumnStart = column;
  slot.insertAdjacentHTML('beforeend', renderKeyDiagram(SAXOPHONE_ALTO, [], { width: FINGERING_CELL_WIDTH, crop: true }));

  return slot;
}

// A fingering without a written name — the column names above and below say the note
// (the octave follows from the row); screen readers get the full name.
function fingeringCell(f, spellings, section, column) {
  const cell = Object.assign(document.createElement('button'), { type: 'button', className: 'fingering-cell' });
  const [main] = spellings;
  cell.dataset.note = main.name;
  cell.dataset.octave = main.octave;
  cell.style.background = `var(--section-bg-${section + 1})`;
  cell.style.gridColumnStart = column;
  cell.setAttribute('aria-label', `Hmat ${spellings.map((s) => s.name + s.octave).join(' / ')}`);
  cell.insertAdjacentHTML('beforeend', renderKeyDiagram(SAXOPHONE_ALTO, f.variants[0].keys, { width: FINGERING_CELL_WIDTH, crop: true }));

  return cell;
}

// Marks the selected note (any spelling) in the fingering chart and on both staves.
// Also marks the highlighted column note: its fingerings, column names and staff notes.
function markSelectedNote() {
  const note = selectedNote();
  const pitch = note ? notePitchMidi(note.name, note.octave) : null;
  const isSelected = (el) => pitch !== null && notePitchMidi(el.dataset.note, Number(el.dataset.octave)) === pitch;
  const column = state.columnNote;
  const cells = $('fingering-chart').querySelectorAll('.fingering-cell');
  const staffNotes = ['range-staff', 'range-staff-twin', 'range-staff-desc'].flatMap((id) => [...$(id).querySelectorAll('[data-note]')]);
  for (const cell of [...cells, ...$('fingering-chart').querySelectorAll('.fingering-slot.unused')]) {
    const selected = isSelected(cell);
    cell.classList.toggle('selected', selected);
    cell.setAttribute('aria-pressed', String(selected));
  }
  for (const g of staffNotes) g.classList.toggle('selected', isSelected(g));

  markHighlightedNote(cells, column);
  markHighlightedNote(staffNotes, column);
  markHighlightedNote(document.querySelectorAll('.subtitle-note'), column, { className: 'active', pressable: true });
  markHighlightedNote($('fingering-chart').querySelectorAll('.fingering-header-cell'), column, { className: 'active', pressable: true });
}

// Basic and alternative fingerings of the selected note, next to its start scales.
function renderNoteFingerings() {
  const panel = $('note-fingerings');
  panel.replaceChildren();
  const note = selectedNote();
  const entry = note && fingeringFor(SAXOPHONE_ALTO.fingerings, note.name, note.octave);
  panel.hidden = !entry;
  if (!entry) return;

  const title = Object.assign(document.createElement('p'), { className: 'note-fingerings-title', textContent: 'Hmaty tónu ' });
  title.appendChild(noteNameElement('span', '', note));
  panel.appendChild(title);
  // A note picked on a scale page outside the scale (empty slot, ↑/↓ from such a note)
  // — with its place in the scale, below the title like in the staff tooltip
  if (state.scaleId !== FULL_RANGE_ID && !findSamePitch(state.scaleNotes, note)) {
    const isMinor = SCALE_CATALOG.find((s) => s.id === state.scaleId)?.type === 'minor';
    panel.appendChild(Object.assign(document.createElement('p'), {
      className: 'note-extra note-fingerings-outside',
      textContent: outsideScaleText(state.scaleNotes, note, isMinor),
    }));
  }

  // Basic and alternative fingerings side by side on one row (wraps on narrow screens)
  const groups = Object.assign(document.createElement('div'), { className: 'note-fingerings-groups' });
  const [basic, ...alternatives] = entry.variants;
  appendFingeringGroup(groups, 'Základní', [basic]);
  if (alternatives.length > 0) appendFingeringGroup(groups, 'Alternativní', alternatives);
  panel.appendChild(groups);
}

function appendFingeringGroup(groups, label, variants) {
  const group = Object.assign(document.createElement('div'), { className: 'note-fingerings-group' });
  group.appendChild(Object.assign(document.createElement('p'), { className: 'note-fingerings-label', textContent: label }));
  const list = Object.assign(document.createElement('div'), { className: 'note-fingerings-list' });
  for (const v of variants) {
    const figure = Object.assign(document.createElement('figure'), { className: 'fingering-variant' });
    figure.innerHTML = renderKeyDiagram(SAXOPHONE_ALTO, v.keys, { width: FINGERING_PANEL_WIDTH, crop: true });
    // The basic variant is often just named "Základní" — don't repeat the group label
    if (v.name !== label) figure.appendChild(Object.assign(document.createElement('figcaption'), { textContent: v.name }));
    list.appendChild(figure);
  }
  group.appendChild(list);
  groups.appendChild(group);
}

// ─── Main update ──────────────────────────────────────────────────────────────

// Replace flat/sharp names in the chromatic range with the scale's proper note names.
// useFlats controls whether non-scale notes use flat or sharp names.
// His and Ces cross octave boundaries (His3=C4 pitch, Ces5=H4 pitch), so octave
// must be adjusted when the scale renames a note to His or Ces.
function buildFullSaxRange(variantScale, useFlats) {
  const baseNotes = buildAltSaxRange(useFlats);
  const scaleNameBySemitone = new Map();
  for (const n of variantScale.slice(0, 7)) {
    if (!scaleNameBySemitone.has(n.semitone)) scaleNameBySemitone.set(n.semitone, n.name);
  }
  return baseNotes.map((note) => {
    const scaleName = scaleNameBySemitone.get(note.semitone);
    if (!scaleName) return note;
    let octave = note.octave;
    if (scaleName === 'His') octave--;
    else if (scaleName === 'Ces') octave++;
    return { ...note, name: scaleName, octave };
  });
}

// 'major-from' scale: full sax range, all scale notes highlighted.
// An enharmonic pair (e.g. Ais/B dur) is shown as two staves, sharp spelling first —
// same pitches, so the colors match; only the note names differ.
// Returns { scaleNotes, rangeNotes } of the first staff (for the fingering chart).
function renderMajorFromStaves(entry) {
  const [first, twin] = scalePair(entry);
  setScaleSubtitle($('range-subtitle'), first, 'natural');
  const notes = renderMajorFromStaff($('range-staff'), first);
  $('twin-block').hidden = !twin;
  if (twin) {
    setScaleSubtitle($('twin-subtitle'), twin, 'natural');
    renderMajorFromStaff($('range-staff-twin'), twin);
  }

  return notes;
}

// Returns { scaleNotes, rangeNotes }: the scale notes within the range and all range
// notes, in the staff's spelling.
function renderMajorFromStaff(staffEl, entry) {
  const scale      = generateScale(entry.id, 4, 'natural');
  const chordNames = getChordNotes(scale).map((n) => n.name);
  const useFlats   = entry.accidental === 'flat';
  const range      = buildFullSaxRange(scale, useFlats);
  renderRangeStaff(staffEl, range, scale, chordNames, 0, false);
  const scaleNotes = rangeScaleNotes(range, scale);
  annotateOutsideNotes(staffEl, scaleNotes, false);

  return { scaleNotes, rangeNotes: range };
}

// Grey staff notes outside the scale get one more tooltip line telling where they lie:
// "mimo stupnici · mezi E a F♯" (staffScaleNotes: the scale notes of this staff).
function annotateOutsideNotes(staffEl, staffScaleNotes, lowercase) {
  for (const g of staffEl.querySelectorAll('[data-layer="muted-notes"] [data-note]')) {
    const note = { name: g.dataset.note, octave: Number(g.dataset.octave) };
    g.dataset.tooltip += `\n${outsideScaleText(staffScaleNotes, note, lowercase)}`;
  }
}

// "mimo stupnici · mezi E a F♯" — staff tooltip and the fingerings panel
function outsideScaleText(scaleNotes, note, lowercase) {
  const where = scaleNeighborsLabel(scaleNotes, note, lowercase);

  return where ? `${OUTSIDE_SCALE_PREFIX} · ${where}` : OUTSIDE_SCALE_PREFIX;
}

// The whole instrument range: every note, none of them highlighted as a tonic.
function renderFullRange() {
  clearHash();
  $('nav-scales-link').href = '/scales/';
  updateScaleHeading(null);
  updateTypeNav(null);
  // Same pitches twice, like an enharmonic pair: sharp names first, then flat names.
  // The twin block must be visible before drawing — a hidden staff has no width.
  $('twin-block').hidden = false;
  renderFullRangeStaff($('range-staff'), $('range-subtitle'), 'Křížky', buildAltSaxRange(false));
  renderFullRangeStaff($('range-staff-twin'), $('twin-subtitle'), 'Béčka', buildAltSaxRange(true));
  $('asc-label').hidden = true;
  $('desc-block').hidden = true;
  $('range-hint').textContent = FULL_RANGE_HINT;
  $('note-details').appendChild($('note-fingerings'));
  renderFingeringChart();
  renderNoteDetails();
  trackScaleView(FULL_RANGE_ID, 'natural');
}

function renderFullRangeStaff(staffEl, subtitleEl, name, range) {
  const bounds = (n) => shortNoteName(n.name) + n.octave;
  setSubtitle(subtitleEl, name, `${bounds(range[0])} – ${bounds(range[range.length - 1])}`, ` · ${range.length} tónů`);
  renderRangeStaff(staffEl, range, range, [], 0, false, { showTonic: false });
}

function update() {
  if (state.scaleId === FULL_RANGE_ID) {
    renderFullRange();
    return;
  }
  const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
  if (!entry) return;
  $('range-hint').textContent = SCALE_HINT;
  $('start-scales').hidden = true;

  pushHash(entry, state.variantType);
  const navScalesLink = document.getElementById('nav-scales-link');
  if (navScalesLink) {
    // The scales page shows only dur/moll — theoretical keys and whole-tone link to its default
    const scalesId = entry.baseId ?? (['major', 'minor'].includes(entry.type) ? entry.id : null);
    navScalesLink.href = scalesId ? '/scales/#' + scaleIdToCode(scalesId) : '/scales/';
  }
  updateTypeNav(entry, state.variantType);
  updateScaleHeading(entry);

  const naturalScale = generateScale(entry.id, 4, 'natural');
  const chordNames   = getChordNotes(naturalScale).map((n) => n.name);
  const isMinor      = entry.type === 'minor';
  const variantScale = isMinor ? generateScale(entry.id, 4, state.variantType) : naturalScale;
  // Whole-tone scales are classified as 'natural' (they sit outside the sharp/flat
  // filter), so infer the fill-note spelling from the scale's own accidentals instead.
  const useFlats = entry.accidental === 'flat'
    || entry.notes.some((n) => accidentalType(n) === 'flat');

  let scaleNotes;
  let rangeNotes;   // every note of the range in the staff's spelling (also outside the scale)
  // Whole-tone and "dur od tónu" scales name the fingering columns with all names of a note
  const allNames = entry.type === 'whole-tone' || entry.startOctave !== undefined;
  if (entry.startOctave !== undefined) {
    ({ scaleNotes, rangeNotes } = renderMajorFromStaves(entry));
  } else {
    setScaleSubtitle($('range-subtitle'), entry, isMinor ? state.variantType : 'natural');
    $('twin-block').hidden = true;
    rangeNotes = buildFullSaxRange(variantScale, useFlats);
    renderRangeStaff($('range-staff'), rangeNotes, variantScale, chordNames, 0, isMinor);
    scaleNotes = rangeScaleNotes(rangeNotes, variantScale);
    annotateOutsideNotes($('range-staff'), scaleNotes, isMinor);
  }
  trackScaleView(entry.id, state.variantType);

  const isMelodic = isMinor && state.variantType === 'melodic';
  $('asc-label').hidden = !isMelodic;
  $('desc-block').hidden = !isMelodic;

  if (isMelodic) {
    const descRange = buildFullSaxRange(naturalScale, useFlats);
    renderRangeStaff($('range-staff-desc'), descRange.slice().reverse(), naturalScale, chordNames, 0, isMinor);
    const descScaleNotes = rangeScaleNotes(descRange, naturalScale);
    annotateOutsideNotes($('range-staff-desc'), descScaleNotes, isMinor);
    // Fingerings of both directions; a note in both keeps the ascending spelling
    scaleNotes = [...descScaleNotes, ...scaleNotes];
  }
  state.scaleNotes = scaleNotes;
  state.rangeNotes = rangeNotes;
  // Another scale keeps the clicked note only while it is in it (e.g. switching the minor
  // variant); redrawing the same scale (resize) keeps also a note outside the scale,
  // picked from an empty fingering slot
  const scaleKey = `${entry.id}/${state.variantType}`;
  if (state.scaleNoteKey !== scaleKey) {
    if (state.scaleNote && !findSamePitch(scaleNotes, state.scaleNote)) state.scaleNote = null;
    state.scaleNoteKey = scaleKey;
  }
  // Melodic minor has the descending staff in between — keep the panel next to the fingerings
  const panelHost = $(isMelodic ? 'note-details-bottom' : 'note-details');
  if ($('note-fingerings').parentNode !== panelHost) panelHost.appendChild($('note-fingerings'));
  renderFingeringChart(scaleNotes, variantScale[0].name, chordNames, isMinor, rangeNotes, allNames);
  renderNoteFingerings();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initSitePage({ settingsRows: [SECTION_TINT_ROW], analytics: true });
  // Remembered filters, before the URL's scale (which switches its own filters on)
  applySavedFilters(state, FILTER_STORAGE_KEY, ALL_FILTERS);
  applyHashToState();
  syncFilterChips(state);
  initFilterChips(state, applyFilterChange);
  initSectionTintSelect($('section-tint-select'));
  repopulateSelect();
  initTooltip();
  initStartScales();
  initSelectionKeys();
  initColumnHighlight();
  initScaleSwitching();

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId     = e.target.value;
    state.variantType = 'natural';
    if (state.scaleId !== FULL_RANGE_ID) saveLastScaleId(state.scaleId);
    update();
  });

  window.addEventListener('hashchange', () => {
    applyHashToState();
    syncFilterChips(state);
    repopulateSelect();
    update();
    playScaleSlide();
  });


  renderStavesWhenFontReady(update, [$('range-staff')]);
});
