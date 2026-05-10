import { DEFAULT_PROFILE_ID } from './defaults.js';

export const VISUAL_PROFILES = [
  {
    id: 'dark',
    name: 'Tmavý A',
    vars: {
      '--bg':         '#1a1a2e',
      '--bg-card':    '#16213e',
      '--bg-input':   '#0f3460',
      '--text':       '#e0e0e0',
      '--text-muted': '#6a7080',
      '--accent':     '#e94560',
      '--accent2':    '#f5a623',
      '--border':     '#2a2a4a',
      '--note-tonic': '#ff3355',
      '--note-chord': '#e94560',
      '--note-scale': '#e07888',
      '--note-muted': '#444464',
      '--font-scale': '1',
    },
  },
  {
    id: 'light',
    name: 'Světlý A',
    vars: {
      '--bg':         '#f4f4f8',
      '--bg-card':    '#ffffff',
      '--bg-input':   '#e4e4f0',
      '--text':       '#1a1a2e',
      '--text-muted': '#505068',
      '--accent':     '#c0002a',
      '--accent2':    '#c07000',
      '--border':     '#c0c0d8',
      '--note-tonic': '#cc0022',
      '--note-chord': '#c0002a',
      '--note-scale': '#903550',
      '--note-muted': '#9090a8',
      '--font-scale': '1',
    },
  },
  {
    id: 'dark-large',
    name: 'Tmavý AA',
    vars: {
      '--bg':         '#1a1a2e',
      '--bg-card':    '#16213e',
      '--bg-input':   '#0f3460',
      '--text':       '#e0e0e0',
      '--text-muted': '#6a7080',
      '--accent':     '#e94560',
      '--accent2':    '#f5a623',
      '--border':     '#2a2a4a',
      '--note-tonic': '#ff3355',
      '--note-chord': '#e94560',
      '--note-scale': '#e07888',
      '--note-muted': '#444464',
      '--font-scale': '1.2',
    },
  },
  {
    id: 'light-large',
    name: 'Světlý AA',
    vars: {
      '--bg':         '#f4f4f8',
      '--bg-card':    '#ffffff',
      '--bg-input':   '#e4e4f0',
      '--text':       '#1a1a2e',
      '--text-muted': '#505068',
      '--accent':     '#c0002a',
      '--accent2':    '#c07000',
      '--border':     '#c0c0d8',
      '--note-tonic': '#cc0022',
      '--note-chord': '#c0002a',
      '--note-scale': '#903550',
      '--note-muted': '#9090a8',
      '--font-scale': '1.2',
    },
  },
];

export function applyProfile(id) {
  const profile = VISUAL_PROFILES.find((p) => p.id === id) ?? VISUAL_PROFILES[0];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(profile.vars)) root.style.setProperty(k, v);
  try {
    localStorage.setItem('scales-profile', profile.id);
    localStorage.setItem('scales-profile-vars', JSON.stringify(profile.vars));
  } catch (_) {}
  return profile;
}

export function savedProfileId() {
  try { return localStorage.getItem('scales-profile') ?? DEFAULT_PROFILE_ID; } catch (_) { return DEFAULT_PROFILE_ID; }
}
