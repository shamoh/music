// Selected note (fingerings, start scales) and highlighted column note of the saxophone range
// page: clicks on notes and fingerings, keys (arrows, Home / End, Escape). `onNoteChange` runs
// after the selected note changed, `onColumnChange` after the highlighted column note.

import { buildAltSaxRange, findSamePitch, adjacentNote, octaveNote, rangeEndNote } from './music.js';
import { FULL_RANGE_ID } from './range-names.js';
import { toggledSemitone, elementSemitone, staffLabelSemitone } from './note-highlight.js';
import { initPageKeys, blurFocused, isFormField, navigationKey } from './page-keys.js';

export function createRangeSelection({ doc, $, state, onNoteChange, onColumnChange }) {
  // Clickable note elements that may keep a stale focus ring after a key press
  function blurFingeringCell() {
    blurFocused('.fingering-cell, .fingering-header-cell, .subtitle-note', doc);
  }

  function setSelectedNote(note) {
    if (state.scaleId === FULL_RANGE_ID) state.startNote = note;
    else state.scaleNote = note;
    onNoteChange();
  }

  // The note whose fingerings are shown: clicked in the full range or on a scale page.
  function selectedNote() {
    return state.scaleId === FULL_RANGE_ID ? state.startNote : state.scaleNote;
  }

  // A click on a column name highlights that note's fingerings in every octave;
  // a second click (or Escape) turns it off.
  function initColumnHighlight() {
    $('fingering-chart').addEventListener('click', (e) => {
      const head = e.target.closest('.fingering-header-cell');
      if (head) toggleColumnNote(elementSemitone(head));
    });
    // The notes in the scale summary above the staff ("Fis dur: F♯ · G♯ · …") do the same
    for (const id of ['range-subtitle', 'twin-subtitle']) {
      $(id).addEventListener('click', (e) => {
        const note = e.target.closest('.subtitle-note');
        if (note) toggleColumnNote(elementSemitone(note));
      });
    }
  }

  // Highlights the note (semitone 0–11) in every octave, or turns it off when it already is.
  function toggleColumnNote(semitone) {
    state.columnNote = toggledSemitone(state.columnNote, semitone);
    onColumnChange();
  }


  // Clicking a note on either staff or a fingering in the chart selects the note.
  // A note on any staff or a fingering selects the note (also on scale pages);
  // clicking the selected note again (in any spelling or place) clears the selection.
  // The name label under a staff note highlights that note in every octave instead,
  // like a fingering column name. Grey notes outside the scale only show their tooltip.
  function initStartScales() {
    for (const id of ['range-staff', 'range-staff-twin', 'range-staff-desc', 'fingering-chart']) {
      $(id).addEventListener('click', (e) => {
        const labelSemitone = staffLabelSemitone(e);
        if (labelSemitone !== null) {
          toggleColumnNote(labelSemitone);
          return;
        }
        const g = e.target.closest('[data-note]');
        if (!g || g.closest('[data-layer="muted-notes"]')) return;
        const clicked = { name: g.dataset.note, octave: Number(g.dataset.octave) };
        const current = selectedNote();
        setSelectedNote(current && findSamePitch([current], clicked) ? null : clicked);
      });
    }
  }


  // Keyboard on the selected note (scale notes on a scale page, every note in the full
  // range): Escape clears it, ←/→ move it to the previous / next note, ↑/↓ an octave
  // up / down, Home/End to the lowest / highest note. When the settings menu is open the
  // keys belong to it — Escape only closes the menu (themes.js); the capture phase sees
  // the menu before it closes. Form controls keep their own keys.
  const SELECTION_MOVES = {
    ArrowLeft:  (notes, note) => adjacentNote(notes, note, -1),
    ArrowRight: (notes, note) => adjacentNote(notes, note, 1),
    ArrowDown:  (notes, note, octaveNotes) => octaveNote(octaveNotes, note, -1),
    ArrowUp:    (notes, note, octaveNotes) => octaveNote(octaveNotes, note, 1),
    Home:       (notes) => rangeEndNote(notes, -1),
    End:        (notes) => rangeEndNote(notes, 1),
  };

  function initSelectionKeys() {
    initPageKeys((e) => {
      // Shift+arrows switch the scale / variant (scale-nav.js)
      if (navigationKey(e)) return;
      const note = selectedNote();
      if (e.key === 'Escape') {
        // Clears the selected note and the highlighted column note
        if (!note && state.columnNote === null) return;
        state.columnNote = null;
        setSelectedNote(null);
        blurFingeringCell();
        return;
      }
      if (!note) return;
      const move = SELECTION_MOVES[e.key];
      if (!move || isFormField(e.target)) return;
      const notes = state.scaleId === FULL_RANGE_ID ? buildAltSaxRange(false) : state.scaleNotes;
      // A note outside the scale moves by an octave to the same note (also outside the
      // scale) — among all range notes
      const octaveNotes = findSamePitch(notes, note) ? notes : state.rangeNotes;
      const next = move(notes, note, octaveNotes);
      if (!next) return;
      e.preventDefault();   // the keys don't scroll the page or the staff
      setSelectedNote({ name: next.name, octave: next.octave });
      blurFingeringCell();
    }, doc);
  }

  return { selectedNote, setSelectedNote, toggleColumnNote, blurFingeringCell, initStartScales, initSelectionKeys, initColumnHighlight };
}
