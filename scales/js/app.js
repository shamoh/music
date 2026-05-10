import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  filteredScales,
  ALTO_SAX_LOW,
  ALTO_SAX_HIGH,
  noteNameToSemitone,
  accidentalType,
  scaleStartOctave,
} from './music.js';
import { renderScaleStaff, renderRangeStaff } from './notation.js';
import { VISUAL_PROFILES, applyProfile, savedProfileId } from './themes.js';
import { DEFAULT_SCALE_ID } from './defaults.js';

// Build all occurrences of scale notes within the playable alto sax range, sorted by pitch.
function buildScaleRange(scaleNotes) {
  const seen = new Set();
  const entries = [];
  for (const n of scaleNotes.slice(0, 7)) {
    if (!seen.has(n.name)) {
      seen.add(n.name);
      entries.push({ name: n.name, semitone: noteNameToSemitone(n.name) });
    }
  }
  const lowMidi  = ALTO_SAX_LOW.octave  * 12 + ALTO_SAX_LOW.semitone;
  const highMidi = ALTO_SAX_HIGH.octave * 12 + ALTO_SAX_HIGH.semitone;

  // Ces (C-flat, semitone 11) crosses the octave boundary downward: Ces4 sounds like H3.
  // His (H-sharp, semitone  0) crosses the octave boundary upward:  His4 sounds like C5.
  function pitchMidi(name, semitone, oct) {
    if (name === 'Ces') return (oct - 1) * 12 + 11;
    if (name === 'His') return (oct + 1) * 12;
    return oct * 12 + semitone;
  }

  const result = [];
  for (const { name, semitone } of entries) {
    for (let oct = 3; oct <= 6; oct++) {
      const midi = pitchMidi(name, semitone, oct);
      if (midi >= lowMidi && midi <= highMidi) result.push({ name, semitone, octave: oct });
    }
  }
  return result.sort((a, b) => pitchMidi(a.name, a.semitone, a.octave) - pitchMidi(b.name, b.semitone, b.octave));
}

const state = {
  scaleId: DEFAULT_SCALE_ID,
  filterType: new Set(['major', 'minor']),
  filterAcc:  new Set(['sharp', 'flat']),
};


function $(id) { return document.getElementById(id); }

// ─── Key signature labels and variant helpers ─────────────────────────────────

const SHARP_NAMES = ['fis', 'cis', 'gis', 'dis', 'ais', 'eis', 'his'];
const FLAT_NAMES  = ['be',  'es',  'as',  'des', 'ges', 'ces', 'fes'];

// Main scale title label: "(2# fis, cis)" or "(3♭ be, es, as)"
function keySigLabel(keySig) {
  if (keySig === 0) return '';
  if (keySig > 0) {
    return ` (${keySig}# : ${SHARP_NAMES.slice(0, keySig).join(', ')})`;
  }
  const n = Math.abs(keySig);
  return ` (${n}♭ : ${FLAT_NAMES.slice(0, n).join(', ')})`;
}

function noteDisplayName(name) {
  return name === 'B' ? 'be' : name.toLowerCase();
}

const DOUBLE_SHARP_ENHARMONIC = { Fisis: 'G', Cisis: 'D', Gisis: 'A' };

function noteChipLabel(name) {
  const enh = DOUBLE_SHARP_ENHARMONIC[name];
  return enh ? `${name} (=${enh})` : name;
}

// Compute label like "(2♭ es, as)" or "(1♭ be, 1# cis)" from actual variant notes
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
  if (sharpNames.length > 0) parts.push(`${sharpNames.length}# : ${sharpNames.join(', ')}`);
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

// Rebuild h3 content (preserves variant-hint span if hintText given)
function setVariantHeader(sectionId, baseTitle, variantNotes, hintText) {
  const h3 = $(sectionId).querySelector('h3');
  clearEl(h3);
  h3.appendChild(document.createTextNode(baseTitle + scaleAccidentalLabel(variantNotes)));
  if (hintText) {
    const span = document.createElement('span');
    span.className = 'variant-hint';
    span.textContent = ' ' + hintText;
    h3.appendChild(span);
  }
}

// Update (or lazily create) the .variant-changes paragraph below h3
function setVariantChanges(sectionId, changeText) {
  const section = $(sectionId);
  let el = section.querySelector('.variant-changes');
  if (!el) {
    el = document.createElement('p');
    el.className = 'variant-changes';
    section.querySelector('h3').insertAdjacentElement('afterend', el);
  }
  el.textContent = changeText;
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
    const span = document.createElement('span');
    span.textContent = noteChipLabel(note.name);
    let cls = 'note-chip';
    if (note.name === tonicName)       cls += ' tonic';
    else if (chordSet.has(note.name))  cls += ' chord';
    span.className = cls;
    span.setAttribute('role', 'listitem');
    containerEl.appendChild(span);
  });
}

// ─── Main update ──────────────────────────────────────────────────────────────

function update() {
  const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
  if (!entry) return;
  pushHash();

  if (entry.type === 'major') {
    $('major-view').hidden = false;
    $('minor-view').hidden = true;
    renderMajorView(entry);
  } else {
    $('major-view').hidden = true;
    $('minor-view').hidden = false;
    renderMinorView(entry);
  }

  // Range staff: scale notes only, no key signature, individual accidentals per note
  const naturalScale = generateScale(entry.id, 4, 'natural');
  const chordNames = getChordNotes(naturalScale).map((n) => n.name);

  if (entry.type === 'major') {
    $('range-major').hidden = false;
    $('range-minor').hidden = true;
    renderRangeStaff($('range-major-staff'), buildScaleRange(naturalScale), naturalScale, chordNames, 0, false);
  } else {
    $('range-major').hidden = true;
    $('range-minor').hidden = false;
    for (const variant of ['natural', 'harmonic', 'melodic']) {
      const variantScale = generateScale(entry.id, 4, variant);
      renderRangeStaff($(`range-${variant}-staff`), buildScaleRange(variantScale), variantScale, chordNames, 0, true);
    }
  }
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
}

function renderMinorView(entry) {
  const octave = scaleStartOctave(entry.id);
  const naturalScale = generateScale(entry.id, octave, 'natural');
  const chord = getChordNotes(naturalScale);
  const chordNames = chord.map((n) => n.name);

  $('minor-title').textContent = `${entry.root} moll${keySigLabel(entry.keySig)}`;
  $('minor-chord').textContent = `Akord: ${chordNames.join(' – ')}`;

  renderVariant('minor-natural',  entry.id, 'natural',  chordNames, entry.keySig, true, octave);

  setVariantHeader('minor-harmonic', 'Harmonická moll', entry.harmonicNotes, null);
  setVariantChanges('minor-harmonic', variantChangeText(entry, 'harmonic'));
  renderVariant('minor-harmonic', entry.id, 'harmonic', chordNames, entry.keySig, true, octave);

  setVariantHeader('minor-melodic', 'Melodická moll', entry.melodicNotes, '(vzestupná)');
  setVariantChanges('minor-melodic', variantChangeText(entry, 'melodic'));
  renderVariant('minor-melodic', entry.id, 'melodic', chordNames, entry.keySig, true, octave);
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
  const id = hashToScaleId(hash);
  const entry = SCALE_CATALOG.find((s) => s.id === id);
  if (!entry) return;
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
    navigator.serviceWorker.register('/scales/service-worker.js').catch(() => {});
  }
}

function initProfileSelect() {
  const sel = $('profile-select');
  const currentId = savedProfileId();
  VISUAL_PROFILES.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', (e) => {
    applyProfile(e.target.value);
    update();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyProfile(savedProfileId());
  applyHash(location.hash);
  initFilterChips();
  initProfileSelect();

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId = e.target.value;
    update();
  });

  window.addEventListener('hashchange', () => {
    applyHash(location.hash);
    repopulateSelect();
    update();
  });

  repopulateSelect();
  update();
  registerSW();

  // ─── Range staff note tooltip ────────────────────────────────────────────────
  const rangeTooltip = document.createElement('div');
  rangeTooltip.className = 'note-tooltip';
  rangeTooltip.hidden = true;
  document.body.appendChild(rangeTooltip);

  let tooltipTimer = null;

  function showRangeTooltip(e) {
    const g = e.target.closest('[data-tooltip]');
    const isTouch = e.pointerType === 'touch';
    if (g) {
      rangeTooltip.textContent = g.dataset.tooltip;
      rangeTooltip.style.left = e.clientX + 'px';
      // On touch, shift tooltip up so it clears the finger
      rangeTooltip.style.top  = (e.clientY - (isTouch ? 60 : 0)) + 'px';
      rangeTooltip.hidden = false;
      if (isTouch) {
        clearTimeout(tooltipTimer);
        tooltipTimer = setTimeout(() => { rangeTooltip.hidden = true; }, 3000);
      }
    } else if (e.type === 'pointermove') {
      rangeTooltip.hidden = true;
    }
  }

  const rangeSection = document.querySelector('.range-section');
  rangeSection.addEventListener('pointermove', showRangeTooltip);
  rangeSection.addEventListener('pointerdown', showRangeTooltip);
  rangeSection.addEventListener('pointerleave', () => { rangeTooltip.hidden = true; });
  rangeSection.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') setTimeout(() => { rangeTooltip.hidden = true; }, 1200);
  });

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    document.querySelectorAll('.staff-container').forEach((el) => ro.observe(el));
  } else {
    window.addEventListener('resize', () => update());
  }
});
