// Header of every page: logo, global navigation (Hudební nauka | Stupnice | Metronom)
// and the settings menu. Rendered into <header id="site-header"></header>.
import { renderSettingsMenu } from './settings-menu.js';

// Top-level sections of the app, in navigation order. A section link has the id
// nav-<id>-link, so a page can retarget it (the saxophone range page points
// "Stupnice" to the current scale).
export const SITE_SECTIONS = [
  { id: 'theory',    label: 'Hudební nauka', href: '/' },
  { id: 'scales',    label: 'Stupnice',      href: '/scales/' },
  { id: 'metronome', label: 'Metronom',      href: '/metronome/' },
];

const LOGO_SVG = `<svg class="logo" viewBox="0 0 85 50" aria-hidden="true">
  <!-- Staff Lines -->
  <path d="M 6 14 Q 45 9, 80 14" stroke="var(--logo-staff, #8a8aa0)" stroke-width="1" fill="none" opacity="0.5" />
  <path d="M 6 19 Q 45 14, 80 19" stroke="var(--logo-staff, #8a8aa0)" stroke-width="1" fill="none" opacity="0.5" />
  <path d="M 6 24 Q 45 19, 80 24" stroke="var(--logo-staff, #8a8aa0)" stroke-width="1" fill="none" opacity="0.5" />
  <path d="M 6 29 Q 45 24, 80 29" stroke="var(--logo-staff, #8a8aa0)" stroke-width="1" fill="none" opacity="0.5" />
  <path d="M 6 34 Q 45 29, 80 34" stroke="var(--logo-staff, #8a8aa0)" stroke-width="1" fill="none" opacity="0.5" />
  <!-- Treble Clef -->
  <path d="M 16.05 43.5 L 19.95 4 C 19.95 1, 23.85 0, 25.8 3 C 27.75 6, 26.45 11, 18.65 17 C 10.85 23, 7.6 29.5, 11.5 34.5 C 15.4 39.5, 24.5 39.5, 27.75 33.5 C 30.35 28, 23.85 22.5, 18.65 26.5 C 16.05 28.5, 16.7 31.5, 20.6 31" stroke="var(--logo-clef, #3d2e1e)" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="16.05" cy="43.5" r="2.8" fill="var(--logo-clef, #3d2e1e)" />
  <!-- Notes -->
  <ellipse cx="38" cy="30" rx="5.6" ry="3.8" transform="rotate(-20 38 30)" fill="var(--logo-tonic, #8a1530)" />
  <line x1="43.2" y1="30" x2="43.2" y2="13" stroke="var(--logo-tonic, #8a1530)" stroke-width="2.2" stroke-linecap="round" />
  <ellipse cx="53" cy="24" rx="5.6" ry="3.8" transform="rotate(-20 53 24)" fill="var(--logo-chord, #1a1a2e)" />
  <line x1="58.2" y1="24" x2="58.2" y2="7" stroke="var(--logo-chord, #1a1a2e)" stroke-width="2.2" stroke-linecap="round" />
  <polygon points="43.2,13 58.2,7 58.2,11 43.2,17" fill="var(--logo-chord, #1a1a2e)" />
  <ellipse cx="68" cy="18" rx="5.6" ry="3.8" transform="rotate(-20 68 18)" fill="var(--logo-accent, #2f4a36)" />
  <line x1="62.8" y1="18" x2="62.8" y2="35" stroke="var(--logo-accent, #2f4a36)" stroke-width="2.2" stroke-linecap="round" />
</svg>`;

const NAV_SEPARATOR = '<span class="bc-sep" aria-hidden="true">|</span>';

// The current section is plain bold text, the others are links
function sectionNavHtml(section, currentSectionId) {
  if (section.id === currentSectionId) return `<span class="nav-current">${section.label}</span>`;

  return `<a id="nav-${section.id}-link" href="${section.href}" class="bc-link">${section.label}</a>`;
}

// Markup of the header content. currentSectionId: id from SITE_SECTIONS, or null for
// pages outside the three sections (history, license).
export function siteHeaderHtml({ currentSectionId = null } = {}) {
  const navigation = SITE_SECTIONS.map((section) => sectionNavHtml(section, currentSectionId)).join(NAV_SEPARATOR);

  return `<h1><a href="/" class="bc-logo">${LOGO_SVG}</a>${navigation}</h1>`
    + '<div class="settings" id="settings-menu"></div>';
}

// Fills the header element with the logo, the navigation and the settings menu.
// settingsRows: page-specific rows of the settings menu (see settings-menu.js).
// Call before initProfileSelect, which fills the selects of the settings menu.
export function renderSiteHeader(headerElement, { currentSectionId = null, settingsRows = [], documentRef } = {}) {
  if (!headerElement) return;

  headerElement.innerHTML = siteHeaderHtml({ currentSectionId });
  renderSettingsMenu(headerElement.querySelector('#settings-menu'), {
    extraRows: settingsRows,
    documentRef: documentRef ?? headerElement.ownerDocument,
  });
}
