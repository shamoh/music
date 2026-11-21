// Settings menu in the header of every page (gear button + panel): appearance select,
// optional page-specific rows and links to the version history and the license.
// Rendering and the open / close behaviour live here; themes.js fills the selects.

const GEAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2.4h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.88a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.04.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>';

export const SETTINGS_MENU_LINKS = [
  { href: '/history.html', text: 'Historie verzí' },
  { href: '/license.html', text: 'Licence' },
];

// Select row of the appearance profile, shown on every page
const PROFILE_ROW = { label: 'Vzhled', selectId: 'profile-select' };

// Page-specific select rows shown below the appearance row
export const SECTION_TINT_ROW = { label: 'Podbarvení rozsahu', selectId: 'section-tint-select' };

function settingsRowHtml(row) {
  return `<label class="settings-row">${row.label}<select id="${row.selectId}" class="profile-select"></select></label>`;
}

// Markup of the menu (the content of the .settings container)
export function settingsMenuHtml({ extraRows = [] } = {}) {
  const rows = [PROFILE_ROW, ...extraRows].map(settingsRowHtml).join('');
  const links = SETTINGS_MENU_LINKS.map((link) => `<a class="settings-link" href="${link.href}">${link.text}</a>`).join('');

  return `<button type="button" id="settings-toggle" class="settings-toggle" aria-label="Nastavení" aria-expanded="false" aria-controls="settings-panel">${GEAR_ICON}</button>`
    + `<div id="settings-panel" class="settings-panel" hidden>${rows}<div class="settings-links">${links}</div></div>`;
}

// Fills the header container (<div class="settings" id="settings-menu">) with the menu
// and wires its opening / closing. Call before initProfileSelect, which fills the selects.
export function renderSettingsMenu(container, { extraRows = [], documentRef } = {}) {
  if (!container) return;

  container.innerHTML = settingsMenuHtml({ extraRows });
  initSettingsMenu(documentRef ?? container.ownerDocument);
}

// Opens / closes the header settings panel (#settings-toggle / #settings-panel).
// Closes on a click outside the menu and on Escape. Safe to call more than once.
export function initSettingsMenu(documentRef = document) {
  const toggle = documentRef.getElementById('settings-toggle');
  const panel  = documentRef.getElementById('settings-panel');
  if (!toggle || !panel || toggle.dataset.ready) return;
  toggle.dataset.ready = '1';

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  documentRef.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('.settings')) setOpen(false);
  });
  documentRef.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
}
