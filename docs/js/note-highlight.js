// Shared "highlighted note" logic: one note (pitch class, semitone 0–11) highlighted in
// every octave — on staves, in note overviews and in the fingering chart. A click on a
// note name toggles it, Escape clears it. Used by the scales page and the saxophone
// range page; works on any elements carrying data-semitone or data-note.
import { noteNameToSemitone } from './music.js';

// New highlighted semitone after a click on `semitone`: a second click turns it off.
export function toggledSemitone(current, semitone) {
  return current === semitone ? null : semitone;
}

// Semitone of an element: data-semitone, or derived from its data-note name.
export function elementSemitone(el) {
  return el.dataset.semitone !== undefined ? Number(el.dataset.semitone) : noteNameToSemitone(el.dataset.note);
}

// Toggles `className` on the elements of the highlighted note (null = none); with
// `pressable` (buttons) also sets aria-pressed.
export function markHighlightedNote(elements, highlight, { className = 'same-note', pressable = false } = {}) {
  for (const el of elements) {
    const on = highlight !== null && elementSemitone(el) === highlight;
    el.classList.toggle(className, on);
    if (pressable) el.setAttribute('aria-pressed', String(on));
  }
}

// Semitone of the staff note whose name label was clicked, or null when the click was
// elsewhere or on a grey note outside the scale (those only show their tooltip).
export function staffLabelSemitone(event) {
  const g = event.target.closest('[data-note]');
  if (!g || g.closest('[data-layer="muted-notes"]') || !event.target.closest('[data-note-label]')) return null;

  return noteNameToSemitone(g.dataset.note);
}
