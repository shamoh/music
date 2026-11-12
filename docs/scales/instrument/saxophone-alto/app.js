import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  buildAltSaxRange,
  filteredScales,
  accidentalType,
  adjacentScales,
  scalePair,
  dedupePairs,
  splitOctaveNumbers,
  scaleStartOctave,
  scaleAccidentalsLabel,
  scaleNotesText,
  scalesStartingAt,
  shortNoteName,
  shortScaleName,
} from '/js/music.js';
import { renderRangeStaff, whenMusicFontReady } from '/js/notation.js';
import { applyProfile, savedProfileId, initProfileSelect } from '/js/themes.js';
import { DEFAULT_SCALE_ID, APP_VERSION, BUILD_DATE } from '/js/defaults.js';
import { initAnalytics, trackScaleView } from '/js/analytics.js';

const VALID_TYPES = ['natural', 'harmonic', 'melodic'];
const TYPE_LABELS = { natural: 'Aiolská', harmonic: 'Harmonická', melodic: 'Melodická' };

// Pseudo scale id for the whole instrument range (all notes, no scale).
// It is shown when the page has no hash.
const FULL_RANGE_ID = 'full-range';
const FULL_RANGE_LABEL = 'Celý rozsah';

const SCALE_HINT      = 'Noty stupnice zvýrazněny barevně, ostatní šedě. Klepnutím zobrazíte název.';
const FULL_RANGE_HINT = 'Klepnutím na notu zobrazíte její názvy a stupnice, které jí začínají.';

// Scale-type label shown in the title and the combo box.
const SCALE_TYPE_LABEL = { major: 'dur', minor: 'moll', 'whole-tone': 'celotónová', 'major-from': 'dur' };
const SCALE_TYPE_GROUP_LABEL = { major: 'Dur', minor: 'Moll', 'whole-tone': 'Celotónové', 'major-from': 'Dur od tónu' };
const SCALE_TYPE_ORDER = ['major', 'minor', 'whole-tone', 'major-from'];

// "B dur", "a moll", "C celotónová"
function scaleName(entry) {
  return `${entry.root} ${SCALE_TYPE_LABEL[entry.type]}`;
}

// Short name for the heading, prev/next links and the start-scales panel:
// "A♯ dur | H♭ dur" for enharmonic pairs, otherwise "F♯ dur".
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

function saveLastScaleId(id) {
  try { localStorage.setItem('scales-last-scale', id); } catch (_) {}
}

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  scaleId:     DEFAULT_SCALE_ID,
  variantType: 'natural',
  startNote:   null,   // { name, octave } clicked in the full range
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

function initFilterChips() {
  document.querySelectorAll('[data-filter-type]').forEach((btn) => {
    btn.addEventListener('click', () => toggleFilter(btn, 'filterType', btn.dataset.filterType));
  });
  document.querySelectorAll('[data-filter-acc]').forEach((btn) => {
    btn.addEventListener('click', () => toggleFilter(btn, 'filterAcc', btn.dataset.filterAcc));
  });
}

function toggleFilter(btn, stateKey, value) {
  const set = state[stateKey];
  if (set.has(value) && set.size === 1) return;
  if (set.has(value)) {
    set.delete(value);
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  } else {
    set.add(value);
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }
  if (state.scaleId === FULL_RANGE_ID) {
    repopulateSelect();
    update();
    return;
  }
  const visible = visibleScales();
  const shown = visible.find((s) => scalePair(s).some((p) => p.id === state.scaleId));
  state.scaleId = shown?.id ?? visible[0]?.id ?? DEFAULT_SCALE_ID;
  repopulateSelect();
  update();
}

// ─── Scale select ─────────────────────────────────────────────────────────────

function repopulateSelect() {
  const sel = $('scale-select');
  while (sel.firstChild) sel.removeChild(sel.firstChild);
  const scales = visibleScales();
  // "Celý rozsah" on top; scales grouped by type so they stay visually apart from it
  sel.appendChild(Object.assign(document.createElement('option'), { value: FULL_RANGE_ID, textContent: FULL_RANGE_LABEL }));
  SCALE_TYPE_ORDER.forEach((t) => appendGroup(sel, SCALE_TYPE_GROUP_LABEL[t], scales.filter((s) => s.type === t)));
  sel.value = state.scaleId;
}

function appendGroup(sel, label, scales) {
  if (scales.length === 0) return;
  const grp = document.createElement('optgroup');
  grp.label = label;
  scales.forEach((s) => grp.appendChild(makeOption(s)));
  sel.appendChild(grp);
}

function makeOption(s) {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = scalePair(s).map(scaleNameWithAccidentals).join(' | ');
  return opt;
}

// ─── Type sub-nav ─────────────────────────────────────────────────────────────

function updateTypeNav(entry, currentType) {
  const nav = $('type-nav');
  if (entry?.type !== 'minor') {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;
  while (nav.firstChild) nav.removeChild(nav.firstChild);
  VALID_TYPES.forEach((type, i) => {
    if (i > 0) {
      nav.appendChild(Object.assign(document.createElement('span'), { className: 'type-nav-sep' }));
    }
    if (type === currentType) {
      nav.appendChild(Object.assign(document.createElement('strong'), { textContent: TYPE_LABELS[type] }));
    } else {
      nav.appendChild(Object.assign(document.createElement('a'), { href: makeHash(entry, type), textContent: TYPE_LABELS[type] }));
    }
  });
}

// ─── Heading: ‹ previous | current | next › ──────────────────────────────────

// Previous / next scale of the same type, in the order of the scale select
// (respects the active filters). Each of the three sections gets a fixed width
// — the widest name within the group — so switching scales never moves the links.
function updateScaleHeading(entry) {
  const prevEl = $('scale-nav-prev');
  const nextEl = $('scale-nav-next');
  const titleEl = $('range-title');
  const isFullRange = !entry;
  const group = isFullRange ? [] : visibleScales().filter((s) => s.type === entry.type);
  const { prev, next } = isFullRange ? { prev: null, next: null } : adjacentScales(visibleScales(), entry.id);

  titleEl.textContent = isFullRange ? FULL_RANGE_LABEL : pairName(entry);
  fillNavItem(prevEl, prev, 'Předchozí stupnice', (name) => `‹ ${name}`);
  fillNavItem(nextEl, next, 'Další stupnice', (name) => `${name} ›`);
  $('scale-heading').classList.toggle('single', isFullRange);
  if (isFullRange) {
    for (const el of [prevEl, titleEl, nextEl]) el.style.width = '';
    return;
  }

  const names = group.map(pairName);
  prevEl.style.width  = maxTextWidth(prevEl, names.map((n) => `‹ ${n}`)) + 'px';
  titleEl.style.width = maxTextWidth(titleEl, names) + 'px';
  nextEl.style.width  = maxTextWidth(nextEl, names.map((n) => `${n} ›`)) + 'px';

  // Depends only on the group's widest names, so it doesn't flip while browsing the group
  const heading = $('scale-heading');
  heading.classList.remove('stacked');
  heading.classList.toggle('stacked', heading.scrollWidth > heading.parentNode.clientWidth);
}

function fillNavItem(el, target, ariaLabel, format) {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.classList.toggle('disabled', !target);
  el.removeAttribute('aria-label');
  if (!target) {
    el.textContent = format('').trim();
    return;
  }
  const a = Object.assign(document.createElement('a'), {
    href: makeHash(target, 'natural'),
    textContent: format(pairName(target)),
  });
  a.setAttribute('aria-label', `${ariaLabel}: ${pairName(target)}`);
  el.appendChild(a);
}

// Widest rendered width (px, including the element's padding) of the given
// texts in the font of el. Measured with an invisible clone of el.
function maxTextWidth(el, texts) {
  const probe = el.cloneNode(false);
  probe.removeAttribute('id');
  Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', width: 'auto', whiteSpace: 'nowrap' });
  el.parentNode.appendChild(probe);
  let max = 0;
  for (const text of texts) {
    probe.textContent = text;
    max = Math.max(max, probe.getBoundingClientRect().width);
  }
  probe.remove();

  return Math.ceil(max);
}

// ─── Subtitle: "B dur: B3 C4 … B4 (2♭ : be, es)" ─────────────────────────────

// "**Fis dur**: F♯ G♯ A♯ H C♯ D♯ E♯ F♯" — bold name, then the text.
// Octave numbers in the text (full range bounds) are drawn as a smaller subscript.
function setSubtitle(el, name, text, suffix = '') {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(Object.assign(document.createElement('strong'), { textContent: name }));
  el.appendChild(document.createTextNode(': '));
  for (const part of splitOctaveNumbers(text)) {
    el.appendChild(part.octave
      ? Object.assign(document.createElement('span'), { className: 'range-subtitle-octave', textContent: part.text })
      : document.createTextNode(part.text));
  }
  if (suffix) el.appendChild(document.createTextNode(suffix));
}

function setScaleSubtitle(el, entry, variant) {
  const notes = generateScale(entry.id, scaleStartOctave(entry.id), variant);
  setSubtitle(el, scaleName(entry), scaleNotesText(notes, entry.type === 'minor'));
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

// Fills the tooltip with the multi-line label; octave numbers get a muted span
// (the note name matters more than its octave).
function setTooltipContent(el, label) {
  while (el.firstChild) el.removeChild(el.firstChild);
  for (const { text, octave } of splitOctaveNumbers(label)) {
    el.appendChild(octave
      ? Object.assign(document.createElement('span'), { className: 'note-tooltip-octave', textContent: text })
      : document.createTextNode(text));
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
  while (panel.firstChild) panel.removeChild(panel.firstChild);
  const note = state.startNote;
  panel.hidden = !note;
  if (!note) return;

  panel.appendChild(Object.assign(document.createElement('p'), {
    className: 'start-scales-title',
    textContent: `Stupnice od tónu ${note.name}${note.octave}`,
  }));
  const scales = dedupePairs(scalesStartingAt(note.name, note.octave));
  const list = document.createElement('dl');
  for (const [type, label] of START_SCALE_GROUPS) {
    const ofType = scales.filter((s) => s.type === type);
    if (ofType.length === 0) continue;
    list.appendChild(Object.assign(document.createElement('dt'), { textContent: label }));
    const dd = document.createElement('dd');
    ofType.forEach((s, i) => {
      if (i > 0) dd.appendChild(document.createTextNode(' · '));
      dd.appendChild(Object.assign(document.createElement('a'), { href: makeHash(s, 'natural'), textContent: pairName(s) }));
    });
    list.appendChild(dd);
  }
  panel.appendChild(list);
}

function initStartScales() {
  for (const id of ['range-staff', 'range-staff-twin']) {
    $(id).addEventListener('click', (e) => {
      if (state.scaleId !== FULL_RANGE_ID) return;
      const g = e.target.closest('[data-note]');
      if (!g) return;
      state.startNote = { name: g.dataset.note, octave: Number(g.dataset.octave) };
      renderStartScales();
    });
  }
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
function renderMajorFromStaves(entry) {
  const [first, twin] = scalePair(entry);
  setScaleSubtitle($('range-subtitle'), first, 'natural');
  renderMajorFromStaff($('range-staff'), first);
  $('twin-block').hidden = !twin;
  if (twin) {
    setScaleSubtitle($('twin-subtitle'), twin, 'natural');
    renderMajorFromStaff($('range-staff-twin'), twin);
  }
}

function renderMajorFromStaff(staffEl, entry) {
  const scale      = generateScale(entry.id, 4, 'natural');
  const chordNames = getChordNotes(scale).map((n) => n.name);
  const useFlats   = entry.accidental === 'flat';
  renderRangeStaff(staffEl, buildFullSaxRange(scale, useFlats), scale, chordNames, 0, false);
}

// The whole instrument range: every note, none of them highlighted as a tonic.
function renderFullRange() {
  clearHash();
  $('nav-scales-link').href = '/scales/';
  updateScaleHeading(null);
  updateTypeNav(null);
  // Same pitches twice, like an enharmonic pair: sharp names first, then flat names
  renderFullRangeStaff($('range-staff'), $('range-subtitle'), 'Křížky', buildAltSaxRange(false));
  renderFullRangeStaff($('range-staff-twin'), $('twin-subtitle'), 'Béčka', buildAltSaxRange(true));
  $('twin-block').hidden = false;
  $('asc-label').hidden = true;
  $('desc-block').hidden = true;
  $('range-hint').textContent = FULL_RANGE_HINT;
  renderStartScales();
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

  if (entry.startOctave !== undefined) {
    renderMajorFromStaves(entry);
  } else {
    setScaleSubtitle($('range-subtitle'), entry, isMinor ? state.variantType : 'natural');
    $('twin-block').hidden = true;
    renderRangeStaff($('range-staff'), buildFullSaxRange(variantScale, useFlats), variantScale, chordNames, 0, isMinor);
  }
  trackScaleView(entry.id, state.variantType);

  const isMelodic = isMinor && state.variantType === 'melodic';
  $('asc-label').hidden = !isMelodic;
  $('desc-block').hidden = !isMelodic;

  if (isMelodic) {
    const descRange = buildFullSaxRange(naturalScale, useFlats).slice().reverse();
    renderRangeStaff($('range-staff-desc'), descRange, naturalScale, chordNames, 0, isMinor);
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAnalytics();
  applyProfile(savedProfileId());
  applyHashToState();
  initFilterChips();
  initProfileSelect($('profile-select'));
  repopulateSelect();
  registerSW();
  initTooltip();
  initStartScales();

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId     = e.target.value;
    state.variantType = 'natural';
    if (state.scaleId !== FULL_RANGE_ID) saveLastScaleId(state.scaleId);
    update();
  });

  window.addEventListener('hashchange', () => {
    applyHashToState();
    repopulateSelect();
    update();
  });

  const footer = document.getElementById('app-footer');
  if (footer) {
    const a = Object.assign(document.createElement('a'), { href: '/history.html', textContent: `Scales v${APP_VERSION} · ${BUILD_DATE}` });
    footer.appendChild(a);
  }

  // First staff render waits for the music font (the resize observer also renders on observe)
  whenMusicFontReady().then(() => {
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe($('range-staff'));
    } else {
      window.addEventListener('resize', update);
    }
  });
});
