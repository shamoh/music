import { DEFAULT_PROFILE_ID } from './defaults.js';

export const VISUAL_PROFILES = [
  {
    id: 'compact',
    name: 'Kompaktní',
    vars: {
      '--bg':         '#f4f4f8',
      '--bg-card':    '#ffffff',
      '--bg-input':   '#e4e4f0',
      '--text':       '#1a1a2e',
      '--text-muted': '#505068',
      '--accent':     '#c0002a',
      '--accent2':    '#c07000',
      '--border':     '#c0c0d8',
      '--note-tonic':           '#000000',
      '--note-tonic-ledger':    '#000000',
      '--note-tonic-label':     '#ffffff',
      '--note-tonic-label-bg':  '#b81838',
      '--note-chord':           '#000000',
      '--note-chord-ledger':    '#000000',
      '--note-chord-label':     '#ffffff',
      '--note-chord-label-bg':  '#000000',
      '--note-scale':           '#000000',
      '--note-scale-ledger':    '#000000',
      '--note-scale-label':     '#505068',
      '--note-scale-label-bg':  '#d4d4e4',
      '--note-muted':           '#e8e8f2',
      '--note-muted-ledger':    '#e8e8f2',
      '--note-muted-label':     '#b4b4c8',
      '--note-muted-label-bg':  'transparent',
      '--note-shadow':          'rgba(40,40,80,0.3)',
      '--font-scale': '1',
      '--note-col-width': '28',
      '--chip-text': '#ffffff',
      '--tonic-col-bg': 'rgba(184,24,56,0.22)',
      '--logo-clef':   '#3d2e1e',
      '--logo-staff':  '#8a8aa0',
      '--logo-tonic':  '#8a1530',
      '--logo-chord':  '#1a1a2e',
      '--logo-accent': '#2f4a36',
    },
  },
  {
    id: 'large',
    name: 'Větší',
    vars: {
      '--bg':         '#f4f4f8',
      '--bg-card':    '#ffffff',
      '--bg-input':   '#e4e4f0',
      '--text':       '#1a1a2e',
      '--text-muted': '#505068',
      '--accent':     '#c0002a',
      '--accent2':    '#c07000',
      '--border':     '#c0c0d8',
      '--note-tonic':           '#000000',
      '--note-tonic-ledger':    '#000000',
      '--note-tonic-label':     '#ffffff',
      '--note-tonic-label-bg':  '#b81838',
      '--note-chord':           '#000000',
      '--note-chord-ledger':    '#000000',
      '--note-chord-label':     '#ffffff',
      '--note-chord-label-bg':  '#000000',
      '--note-scale':           '#000000',
      '--note-scale-ledger':    '#000000',
      '--note-scale-label':     '#505068',
      '--note-scale-label-bg':  '#d4d4e4',
      '--note-muted':           '#e8e8f2',
      '--note-muted-ledger':    '#e8e8f2',
      '--note-muted-label':     '#b4b4c8',
      '--note-muted-label-bg':  'transparent',
      '--note-shadow':          'rgba(40,40,80,0.3)',
      '--font-scale': '1.1',
      '--note-col-width': '36',
      '--chip-text': '#ffffff',
      '--tonic-col-bg': 'rgba(184,24,56,0.22)',
      '--logo-clef':   '#3d2e1e',
      '--logo-staff':  '#8a8aa0',
      '--logo-tonic':  '#8a1530',
      '--logo-chord':  '#1a1a2e',
      '--logo-accent': '#2f4a36',
    },
  },
];

// ─── Profile selection ────────────────────────────────────────────────────────
//
// Default is 'auto': 'compact' (Kompaktní) on phones, 'large' (Větší) on
// larger screens. A manual choice from the select is remembered under CHOICE_KEY.

export const AUTO_PROFILE_ID = 'auto';
const AUTO_PROFILE_NAME = 'Automaticky';
const CHOICE_KEY = 'scales-profile-choice';

// Phones have the shorter screen side below this width (CSS px) — stable when rotating.
const PHONE_MAX_SHORT_SIDE = 600;

export function autoProfileId(shortSide) {
  return shortSide < PHONE_MAX_SHORT_SIDE ? 'compact' : 'large';
}

// Real profile id for a choice ('auto' or a profile id); unknown ids fall back to auto.
export function resolveProfileId(choice, shortSide) {
  if (VISUAL_PROFILES.some((p) => p.id === choice)) return choice;

  return autoProfileId(shortSide);
}

function deviceShortSide() {
  try { return Math.min(screen.width, screen.height); } catch (_) { return Infinity; }
}

// Former profile ids (before the rename to compact / large) → current ids.
const LEGACY_PROFILE_IDS = { light: 'compact', 'light-large': 'large' };

// Maps a stored choice to a current one: legacy ids are renamed, 'auto' and
// current profile ids are kept, anything else (e.g. removed dark profiles) → 'auto'.
export function migrateProfileChoice(choice) {
  const migrated = LEGACY_PROFILE_IDS[choice] ?? choice;

  return VISUAL_PROFILES.some((p) => p.id === migrated) ? migrated : AUTO_PROFILE_ID;
}

// 'auto' or a stored manual profile id. A legacy id is migrated and stored back.
export function savedProfileChoice() {
  try {
    const stored = localStorage.getItem(CHOICE_KEY);
    const choice = migrateProfileChoice(stored);
    if (stored !== null && stored !== choice) localStorage.setItem(CHOICE_KEY, choice);

    return choice;
  } catch (_) {
    return AUTO_PROFILE_ID;
  }
}

// Profile id to apply on this device.
export function savedProfileId() {
  return resolveProfileId(savedProfileChoice(), deviceShortSide());
}

// Applies a profile's CSS variables ('auto' resolves for this device). The vars
// are cached so the inline head script can apply them before first paint.
export function applyProfile(id) {
  const profile = VISUAL_PROFILES.find((p) => p.id === resolveProfileId(id, deviceShortSide()))
    ?? VISUAL_PROFILES.find((p) => p.id === DEFAULT_PROFILE_ID);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(profile.vars)) root.style.setProperty(k, v);
  try { localStorage.setItem('scales-profile-vars', JSON.stringify(profile.vars)); } catch (_) {}

  return profile;
}

// Fills the profile <select> ('Automaticky' + profiles), selects the saved choice
// and applies + remembers the choice on change. onChange runs after applying.
export function initProfileSelect(sel, onChange = () => {}) {
  initSettingsMenu();
  if (!sel) return;
  const options = [{ id: AUTO_PROFILE_ID, name: AUTO_PROFILE_NAME }, ...VISUAL_PROFILES];
  const current = savedProfileChoice();
  for (const p of options) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === current) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', (e) => {
    try { localStorage.setItem(CHOICE_KEY, e.target.value); } catch (_) {}
    applyProfile(e.target.value);
    onChange();
  });
}

// ─── Section tint (background bands of the saxophone range sections) ─────────
//
// The range staff colors each note column by the instrument section it belongs
// to (low / middle / high / altissimo). The tint level is chosen independently
// of the visual profile; 'none' leaves the staff clean.

const SECTION_COLORS = ['80,110,220', '210,155,55', '60,180,185', '215,105,90'];

// alpha of the plain band and of a band under a chord note
export const SECTION_TINTS = [
  { id: 'strong', name: 'Výrazné', alpha: 0.20, chordAlpha: 0.42 },
  { id: 'normal', name: 'Střední', alpha: 0.10, chordAlpha: 0.24 },
  { id: 'subtle', name: 'Jemné', alpha: 0.05, chordAlpha: 0.13 },
  { id: 'none',   name: 'Žádné', alpha: 0,    chordAlpha: 0 },
];
export const DEFAULT_SECTION_TINT_ID = 'normal';
const SECTION_TINT_KEY = 'scales-section-tint';

// CSS variables --section-bg-N / --section-chord-bg-N for a tint level
// (unknown ids fall back to the default level).
export function sectionTintVars(id) {
  const tint = SECTION_TINTS.find((t) => t.id === id)
    ?? SECTION_TINTS.find((t) => t.id === DEFAULT_SECTION_TINT_ID);
  const vars = {};
  SECTION_COLORS.forEach((rgb, i) => {
    vars[`--section-bg-${i + 1}`]       = tint.alpha      ? `rgba(${rgb},${tint.alpha})`      : 'transparent';
    vars[`--section-chord-bg-${i + 1}`] = tint.chordAlpha ? `rgba(${rgb},${tint.chordAlpha})` : 'transparent';
  });

  return vars;
}

export function savedSectionTintId() {
  try {
    const stored = localStorage.getItem(SECTION_TINT_KEY);
    return SECTION_TINTS.some((t) => t.id === stored) ? stored : DEFAULT_SECTION_TINT_ID;
  } catch (_) {
    return DEFAULT_SECTION_TINT_ID;
  }
}

export function applySectionTint(id) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(sectionTintVars(id))) root.style.setProperty(k, v);
}

// Fills the tint <select>, applies the saved level and applies + remembers a
// new one on change. onChange runs after applying (e.g. to redraw the staff).
export function initSectionTintSelect(sel, onChange = () => {}) {
  applySectionTint(savedSectionTintId());
  if (!sel) return;
  const current = savedSectionTintId();
  for (const t of SECTION_TINTS) {
    const opt = Object.assign(document.createElement('option'), { value: t.id, textContent: t.name });
    if (t.id === current) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', (e) => {
    try { localStorage.setItem(SECTION_TINT_KEY, e.target.value); } catch (_) {}
    applySectionTint(e.target.value);
    onChange();
  });
}

// ─── Settings menu (gear button in the header) ───────────────────────────────

// Opens / closes the header settings panel (#settings-toggle / #settings-panel).
// Closes on a click outside the menu and on Escape. Safe to call more than once.
export function initSettingsMenu() {
  const toggle = document.getElementById('settings-toggle');
  const panel  = document.getElementById('settings-panel');
  if (!toggle || !panel || toggle.dataset.ready) return;
  toggle.dataset.ready = '1';

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('.settings')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
}
