// Keyboard handling shared by the pages: which key presses belong to the page (not to
// the settings menu or the browser) and dropping a stale focus ring after a key press.
// No dependencies, works with any document (tests pass a stand-in).

// True when a key press is meant for the page: the settings menu is closed (then its
// keys belong to the menu — Escape only closes it, see themes.js) and no Alt / Ctrl /
// Cmd is held (browser shortcuts).
export function isPageKey(event, doc = document) {
  const menu = doc.getElementById('settings-panel');

  return !(menu && !menu.hidden) && !event.altKey && !event.ctrlKey && !event.metaKey;
}

// Calls handler(event) for every page key (isPageKey). Capture phase: the handler sees
// the settings menu before its own Escape handler closes it.
export function initPageKeys(handler, doc = document) {
  doc.addEventListener('keydown', (event) => {
    if (isPageKey(event, doc)) handler(event);
  }, true);
}

// Drops the focus from the focused element when it matches `selector`: after a click
// the keyboard would otherwise show a focus ring on it, though the highlight or the
// selection has moved on.
export function blurFocused(selector, doc = document) {
  const el = doc.activeElement;
  if (el?.closest?.(selector)) el.blur();
}

// Form fields use the keys themselves (typing, sliders, number inputs, selects) — page
// shortcuts leave them alone there.
export function isFormField(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

// Elements a Space / Enter press already activates (buttons, links, focusable rows) and
// form fields — a page shortcut on Space would act twice there.
export function activatesOnKey(target) {
  return isFormField(target) || Boolean(target?.closest?.('button, a[href], [tabindex]'));
}

// Cmd+Z (Mac) / Ctrl+Z: undo. Not with Shift (redo) or Alt.
export function isUndoKey(event) {
  return Boolean(event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && (event.key === 'z' || event.key === 'Z');
}

// Calls handler(event) on Cmd+Z / Ctrl+Z meant for the page: not while the settings
// menu is open and not in a form field (there it undoes the typing).
export function initUndoKey(handler, doc = document) {
  doc.addEventListener('keydown', (event) => {
    const menu = doc.getElementById('settings-panel');
    if (!isUndoKey(event) || (menu && !menu.hidden) || isFormField(event.target)) return;
    handler(event);
  });
}

// Navigation keys with Shift: ← / → step to the previous / next scale, ↑ / ↓ to the
// previous / next variant of a minor scale (plain arrows move the selected note).
// Returns { axis: 'scale' | 'variant', step: −1 | +1 }, or null for any other key.
const NAVIGATION_KEYS = {
  ArrowLeft:  { axis: 'scale', step: -1 },
  ArrowRight: { axis: 'scale', step: 1 },
  ArrowUp:    { axis: 'variant', step: -1 },
  ArrowDown:  { axis: 'variant', step: 1 },
};

export function navigationKey(event) {
  if (!event.shiftKey) return null;

  return NAVIGATION_KEYS[event.key] ?? null;
}
