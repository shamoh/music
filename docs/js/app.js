import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  filteredScales,
  accidentalType,
  scaleStartOctave,
  noteNameToSemitone,
  longNoteName,
} from './music.js';
import { renderScaleStaff, whenMusicFontReady } from './notation.js';
import { applyProfile, savedProfileId, initProfileSelect } from './themes.js';
import { DEFAULT_SCALE_ID, APP_VERSION, BUILD_DATE } from './defaults.js';
import { initAnalytics, trackScaleView } from './analytics.js';
import { toggledSemitone, elementSemitone, markHighlightedNote, staffLabelSemitone } from './note-highlight.js';
import { initPageKeys, blurFocused } from './page-keys.js';

const state = {
  scaleId: DEFAULT_SCALE_ID,
  filterType: new Set(['major', 'minor']),
  filterAcc:  new Set(['sharp', 'flat']),
  highlight:  null,   // semitone (0–11) of the note highlighted in every octave
};


function $(id) { return document.getElementById(id); }

function savedLastScaleId() {
  try { return localStorage.getItem('scales-last-scale') ?? null; } catch (_) { return null; }
}
function saveLastScaleId(id) {
  try { localStorage.setItem('scales-last-scale', id); } catch (_) {}
}

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
  clearEl(h3);
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
  if (set.has(value) && set.size === 1) return; // keep at least one active
  if (set.has(value)) {
    set.delete(value);
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  } else {
    set.add(value);
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }
  // If selected scale no longer visible, pick first visible scale
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
  while (sel.firstChild) sel.removeChild(sel.firstChild);

  const scales = filteredScales(state.filterType, state.filterAcc);
  const bothTypes = state.filterType.has('major') && state.filterType.has('minor');

  if (bothTypes) {
    appendGroup(sel, 'Dur',  scales.filter((s) => s.type === 'major'));
    appendGroup(sel, 'Moll', scales.filter((s) => s.type === 'minor'));
  } else {
    scales.forEach((s) => sel.appendChild(makeOption(s)));
  }

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
  opt.textContent = `${s.root} ${s.type === 'major' ? 'dur' : 'moll'}${keySigLabel(s.keySig)}`;
  return opt;
}

// ─── Rendering helpers ────────────────────────────────────────────────────────

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function renderNoteRow(containerEl, scaleNotes, chordNoteNames) {
  const chordSet = new Set(chordNoteNames);
  const tonicName = scaleNotes[0]?.name;
  clearEl(containerEl);
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

  $('major-range-link').href = '/scales/instrument/saxophone-alto/#' + scaleIdToHash(entry.id);
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
  const basePath = '/scales/instrument/saxophone-alto/#';
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

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAnalytics();
  applyProfile(savedProfileId());
  if (!location.hash) {
    const saved = savedLastScaleId();
    if (saved) applyHash('#' + scaleIdToHash(saved));
  }
  applyHash(location.hash);
  initFilterChips();
  initProfileSelect($('profile-select'), update);

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId = e.target.value;
    saveLastScaleId(state.scaleId);
    update();
  });

  window.addEventListener('hashchange', () => {
    applyHash(location.hash);
    repopulateSelect();
    update();
  });

  repopulateSelect();
  registerSW();
  initNoteHighlight();

  const footer = document.getElementById('app-footer');
  if (footer) {
    const a = Object.assign(document.createElement('a'), { href: '/history.html', textContent: `Scales v${APP_VERSION} · ${BUILD_DATE}` });
    footer.appendChild(a);
  }

  // First staff render waits for the music font (the resize observer also renders on observe)
  whenMusicFontReady().then(() => {
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      document.querySelectorAll('.staff-container').forEach((el) => ro.observe(el));
    } else {
      window.addEventListener('resize', () => update());
    }
  });
});
