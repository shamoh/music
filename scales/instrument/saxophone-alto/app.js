import {
  SCALE_CATALOG,
  generateScale,
  getChordNotes,
  buildScaleRange,
} from '/scales/js/music.js';
import { renderRangeStaff } from '/scales/js/notation.js';
import { applyProfile, savedProfileId } from '/scales/js/themes.js';
import { APP_VERSION } from '/scales/js/defaults.js';

const VALID_TYPES  = ['natural', 'harmonic', 'melodic'];
const TYPE_LABELS  = { natural: 'Přirozená', harmonic: 'Harmonická', melodic: 'Melodická' };
const DEFAULT_HASH = '#C-dur';

function $(id) { return document.getElementById(id); }

// ─── URL helpers ──────────────────────────────────────────────────────────────

function scaleIdToCode(id) {
  return id.replace('-major', '-dur').replace('-minor', '-moll');
}

function codeToScaleId(code) {
  return code.replace('-dur', '-major').replace('-moll', '-minor');
}

// Parse "#a-moll?type=harmonic" → { entry, type } or null if invalid.
function parseHash() {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!raw) return null;
  const [fragment, query] = raw.split('?');
  const entry = SCALE_CATALOG.find((s) => s.id === codeToScaleId(fragment));
  if (!entry) return null;
  const rawType = new URLSearchParams(query || '').get('type') || 'natural';
  const type = (entry.type === 'minor' && VALID_TYPES.includes(rawType)) ? rawType : 'natural';
  return { entry, type };
}

// Canonical hash for the given entry + type (omits ?type=natural for brevity).
function makeHash(entry, type) {
  const code = scaleIdToCode(entry.id);
  const suffix = (entry.type === 'minor' && type !== 'natural') ? '?type=' + type : '';
  return '#' + code + suffix;
}

// ─── UI rendering ─────────────────────────────────────────────────────────────

function updateBackLink(entry) {
  $('back-link').href = '/scales/#' + scaleIdToCode(entry.id);
}

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

function update() {
  const parsed = parseHash();
  if (!parsed) {
    location.replace('/scales/instrument/saxophone-alto/' + DEFAULT_HASH);
    return;
  }
  const { entry, type } = parsed;

  // Push canonical hash (normalise ?type=natural → omit)
  const canonical = makeHash(entry, type);
  if (location.hash !== canonical) history.replaceState(null, '', canonical);

  $('range-title').textContent = `${entry.root} ${entry.type === 'major' ? 'dur' : 'moll'}`;
  updateBackLink(entry);
  updateTypeNav(entry, type);

  const naturalScale = generateScale(entry.id, 4, 'natural');
  const chordNames   = getChordNotes(naturalScale).map((n) => n.name);
  const isMinor      = entry.type === 'minor';
  const variantScale = isMinor ? generateScale(entry.id, 4, type) : naturalScale;

  renderRangeStaff($('range-staff'), buildScaleRange(variantScale), variantScale, chordNames, 0, isMinor);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/scales/service-worker.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyProfile(savedProfileId());
  update();
  registerSW();
  initTooltip();

  const footer = document.getElementById('app-footer');
  if (footer) footer.textContent = `Scales v${APP_VERSION}`;

  window.addEventListener('hashchange', update);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe($('range-staff'));
  } else {
    window.addEventListener('resize', update);
  }
});
