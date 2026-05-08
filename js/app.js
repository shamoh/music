import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  filteredScales,
  buildAltSaxRange,
} from './music.js';
import { renderScaleStaff, renderRangeStaff } from './notation.js';

const state = {
  scaleId: 'C-major',
  filterType: new Set(['major', 'minor']),
  filterAcc:  new Set(['sharp', 'flat']),
};

const altSaxRange = buildAltSaxRange();

function $(id) { return document.getElementById(id); }

// ─── Key signature label ─────────────────────────────────────────────────────

function keySigLabel(keySig) {
  if (keySig === 0) return '';
  if (keySig > 0) return ` (${keySig}#)`;
  return ` (${Math.abs(keySig)}♭)`;
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
    state.scaleId = visible[0]?.id ?? 'C-major';
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
  clearEl(containerEl);
  scaleNotes.forEach((note) => {
    const span = document.createElement('span');
    span.textContent = note.name;
    span.className = 'note-chip' + (chordSet.has(note.name) ? ' chord' : '');
    span.setAttribute('role', 'listitem');
    containerEl.appendChild(span);
  });
}

// ─── Main update ──────────────────────────────────────────────────────────────

function update() {
  const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
  if (!entry) return;

  if (entry.type === 'major') {
    $('major-view').hidden = false;
    $('minor-view').hidden = true;
    renderMajorView(entry);
  } else {
    $('major-view').hidden = true;
    $('minor-view').hidden = false;
    renderMinorView(entry);
  }

  // Range staff: highlight natural scale notes
  const naturalScale = generateScale(entry.id, 4, 'natural');
  renderRangeStaff($('range-staff'), altSaxRange, naturalScale);
}

function renderMajorView(entry) {
  const scale = generateScale(entry.id, 4);
  const chord = getChordNotes(scale);
  const chordNames = chord.map((n) => n.name);

  $('major-title').textContent = `${entry.root} dur${keySigLabel(entry.keySig)}`;
  $('major-chord').textContent = `Akord: ${chordNames.join(' – ')}`;
  renderNoteRow($('major-note-row'), scale, chordNames);
  renderScaleStaff($('major-staff'), scale, chordNames);
}

function renderMinorView(entry) {
  const naturalScale = generateScale(entry.id, 4, 'natural');
  const chord = getChordNotes(naturalScale);
  const chordNames = chord.map((n) => n.name);

  $('minor-title').textContent = `${entry.root} moll${keySigLabel(entry.keySig)}`;
  $('minor-chord').textContent = `Akord: ${chordNames.join(' – ')}`;

  renderVariant('minor-natural',  entry.id, 'natural',  chordNames);
  renderVariant('minor-harmonic', entry.id, 'harmonic', chordNames);
  renderVariant('minor-melodic',  entry.id, 'melodic',  chordNames);
}

function renderVariant(sectionId, scaleId, variant, chordNames) {
  const section = $(sectionId);
  const scale = generateScale(scaleId, 4, variant);
  renderNoteRow(section.querySelector('.note-row'), scale, chordNames);
  renderScaleStaff(section.querySelector('.staff-container'), scale, chordNames);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initFilterChips();

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId = e.target.value;
    update();
  });

  repopulateSelect();
  update();
  registerSW();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    ro.observe($('range-staff'));
    // observe dynamically-shown staff containers via document-level fallback
    document.querySelectorAll('.staff-container').forEach((el) => ro.observe(el));
  } else {
    window.addEventListener('resize', () => update());
  }
});
