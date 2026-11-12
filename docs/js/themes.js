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
      '--section-bg-1':       'rgba(80,110,220,0.10)',
      '--section-bg-2':       'rgba(210,155,55,0.10)',
      '--section-bg-3':       'rgba(60,180,185,0.10)',
      '--section-bg-4':       'rgba(215,105,90,0.10)',
      '--section-chord-bg-1': 'rgba(80,110,220,0.24)',
      '--section-chord-bg-2': 'rgba(210,155,55,0.24)',
      '--section-chord-bg-3': 'rgba(60,180,185,0.24)',
      '--section-chord-bg-4': 'rgba(215,105,90,0.24)',
      '--font-scale': '1',
      '--note-col-width': '28',
      '--chip-text': '#ffffff',
      '--tonic-col-bg': 'rgba(184,24,56,0.22)',
      '--logo-clef':   '#8c7050',
      '--logo-staff':  '#a0a0c0',
      '--logo-tonic':  '#6c8ebf',
      '--logo-chord':  '#c07a8a',
      '--logo-accent': '#78a078',
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
      '--section-bg-1':       'rgba(80,110,220,0.10)',
      '--section-bg-2':       'rgba(210,155,55,0.10)',
      '--section-bg-3':       'rgba(60,180,185,0.10)',
      '--section-bg-4':       'rgba(215,105,90,0.10)',
      '--section-chord-bg-1': 'rgba(80,110,220,0.24)',
      '--section-chord-bg-2': 'rgba(210,155,55,0.24)',
      '--section-chord-bg-3': 'rgba(60,180,185,0.24)',
      '--section-chord-bg-4': 'rgba(215,105,90,0.24)',
      '--font-scale': '1.1',
      '--note-col-width': '36',
      '--chip-text': '#ffffff',
      '--tonic-col-bg': 'rgba(184,24,56,0.22)',
      '--logo-clef':   '#8c7050',
      '--logo-staff':  '#a0a0c0',
      '--logo-tonic':  '#6c8ebf',
      '--logo-chord':  '#c07a8a',
      '--logo-accent': '#78a078',
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
