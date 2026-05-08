import {
  ROOT_NOTES,
  SCALE_TYPES,
  generateScale,
  getChordNotes,
  buildAltSaxRange,
} from './music.js';
import { renderScaleStaff, renderRangeStaff } from './notation.js';

const state = {
  rootSemitone: 0,
  scaleType: 'major',
};

const altSaxRange = buildAltSaxRange();

function $(id) { return document.getElementById(id); }

function initSelectors() {
  const rootSelect = $('root-select');
  ROOT_NOTES.forEach(({ semitone, name }) => {
    const opt = document.createElement('option');
    opt.value = semitone;
    opt.textContent = name;
    rootSelect.appendChild(opt);
  });

  const typeSelect = $('type-select');
  SCALE_TYPES.forEach(({ key, label }) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    typeSelect.appendChild(opt);
  });

  rootSelect.addEventListener('change', () => {
    state.rootSemitone = Number(rootSelect.value);
    update();
  });
  typeSelect.addEventListener('change', () => {
    state.scaleType = typeSelect.value;
    update();
  });
}

function scaleLabel(rootName, scaleType) {
  const type = SCALE_TYPES.find((t) => t.key === scaleType);
  return `${rootName} ${type ? type.label : ''}`;
}

function renderNoteRow(scaleNotes, chordNoteNames) {
  const chordSet = new Set(chordNoteNames);
  const container = $('note-row');
  while (container.firstChild) container.removeChild(container.firstChild);

  scaleNotes.forEach((note) => {
    const span = document.createElement('span');
    span.textContent = note.name;
    span.className = 'note-chip' + (chordSet.has(note.name) ? ' chord' : '');
    container.appendChild(span);
  });
}

function update() {
  const scale = generateScale(state.rootSemitone, state.scaleType, 4);
  const chord = getChordNotes(scale);
  const chordNames = chord.map((n) => n.name);
  const rootName = ROOT_NOTES.find((r) => r.semitone === state.rootSemitone)?.name ?? 'C';

  $('scale-title').textContent = scaleLabel(rootName, state.scaleType);
  $('chord-label').textContent = `Akord: ${chordNames.join(' – ')}`;

  renderNoteRow(scale, chordNames);
  renderScaleStaff($('scale-staff'), scale, chordNames);
  renderRangeStaff($('range-staff'), altSaxRange, scale);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSelectors();
  update();
  registerSW();

  // Re-render staffs when container size changes (orientation, split-screen, etc.)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    ro.observe($('scale-staff'));
    ro.observe($('range-staff'));
  } else {
    window.addEventListener('resize', () => update());
  }
});
