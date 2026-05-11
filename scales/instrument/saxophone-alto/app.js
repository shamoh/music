import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  buildAltSaxRange,
  filteredScales,
  accidentalType,
} from '/scales/js/music.js';
import { renderRangeStaff } from '/scales/js/notation.js';
import { VISUAL_PROFILES, applyProfile, savedProfileId } from '/scales/js/themes.js';
import { DEFAULT_SCALE_ID, APP_VERSION, BUILD_DATE } from '/scales/js/defaults.js';

const VALID_TYPES = ['natural', 'harmonic', 'melodic'];
const TYPE_LABELS = { natural: 'Aiolská', harmonic: 'Harmonická', melodic: 'Melodická' };
const DEFAULT_HASH = '#C-dur';

function $(id) { return document.getElementById(id); }

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  scaleId:     DEFAULT_SCALE_ID,
  variantType: 'natural',
  filterType:  new Set(['major', 'minor']),
  filterAcc:   new Set(['sharp', 'flat']),
};

// ─── URL helpers ──────────────────────────────────────────────────────────────

function scaleIdToCode(id) {
  return id.replace('-major', '-dur').replace('-minor', '-moll');
}

function codeToScaleId(code) {
  return code.replace('-dur', '-major').replace('-moll', '-minor');
}

function makeHash(entry, type) {
  const code = scaleIdToCode(entry.id);
  const suffix = (entry.type === 'minor' && type !== 'natural') ? '?type=' + type : '';
  return '#' + code + suffix;
}

function applyHashToState() {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!raw) return false;
  const [fragment, query] = raw.split('?');
  const entry = SCALE_CATALOG.find((s) => s.id === codeToScaleId(fragment));
  if (!entry) return false;
  const rawType = new URLSearchParams(query || '').get('type') || 'natural';
  const type = (entry.type === 'minor' && VALID_TYPES.includes(rawType)) ? rawType : 'natural';
  if (!state.filterType.has(entry.type)) state.filterType.add(entry.type);
  if (entry.accidental !== 'natural' && !state.filterAcc.has(entry.accidental)) {
    state.filterAcc.add(entry.accidental);
  }
  state.scaleId     = entry.id;
  state.variantType = type;
  return true;
}

function pushHash(entry, type) {
  const hash = makeHash(entry, type);
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

// ─── Key signature label ──────────────────────────────────────────────────────

const SHARP_NAMES = ['fis', 'cis', 'gis', 'dis', 'ais', 'eis', 'his'];
const FLAT_NAMES  = ['be',  'es',  'as',  'des', 'ges', 'ces', 'fes'];

function keySigLabel(keySig) {
  if (keySig === 0) return '';
  if (keySig > 0) return ` (${keySig}# : ${SHARP_NAMES.slice(0, keySig).join(', ')})`;
  const n = Math.abs(keySig);
  return ` (${n}♭ : ${FLAT_NAMES.slice(0, n).join(', ')})`;
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

// ─── Profile select ───────────────────────────────────────────────────────────

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
  sel.addEventListener('change', (e) => applyProfile(e.target.value));
}

// ─── Type sub-nav ─────────────────────────────────────────────────────────────

function updateTypeNav(entry, currentType) {
  const nav = $('type-nav');
  if (entry.type !== 'minor') {
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

// ─── Tooltip ──────────────────────────────────────────────────────────────────

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
      tooltip.textContent = g.dataset.tooltip;
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

function update() {
  const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
  if (!entry) return;

  pushHash(entry, state.variantType);
  $('range-title').textContent = `${entry.root} ${entry.type === 'major' ? 'dur' : 'moll'}`;
  $('back-link').href = '/scales/#' + scaleIdToCode(entry.id);
  updateTypeNav(entry, state.variantType);

  const naturalScale = generateScale(entry.id, 4, 'natural');
  const chordNames   = getChordNotes(naturalScale).map((n) => n.name);
  const isMinor      = entry.type === 'minor';
  const variantScale = isMinor ? generateScale(entry.id, 4, state.variantType) : naturalScale;
  const useFlats     = entry.accidental === 'flat';

  renderRangeStaff($('range-staff'), buildFullSaxRange(variantScale, useFlats), variantScale, chordNames, 0, isMinor);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/scales/service-worker.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyProfile(savedProfileId());
  applyHashToState();
  initFilterChips();
  initProfileSelect();
  repopulateSelect();
  update();
  registerSW();
  initTooltip();

  $('scale-select').addEventListener('change', (e) => {
    state.scaleId     = e.target.value;
    state.variantType = 'natural';
    update();
  });

  window.addEventListener('hashchange', () => {
    applyHashToState();
    repopulateSelect();
    update();
  });

  const footer = document.getElementById('app-footer');
  if (footer) footer.textContent = `Scales v${APP_VERSION} · ${BUILD_DATE}`;

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe($('range-staff'));
  } else {
    window.addEventListener('resize', update);
  }
});
