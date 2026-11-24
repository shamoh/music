// Building blocks of the scales page that touch the DOM or the page state but not the
// page itself (no module-level side effects), so they can be tested with a fake DOM.

import { SCALE_CATALOG, keySigLabel, scaleAccidentalLabel, noteChipLabel, noteNameToSemitone } from './music.js';

// Rebuilds the h3 of a variant section: "baseTitle (keySig) [hint] [· changes]"
export function setVariantHeader(section, baseTitle, variantNotes, hintText, changesText, doc = globalThis.document) {
  const h3 = section.querySelector('h3');
  h3.replaceChildren();
  h3.appendChild(doc.createTextNode(baseTitle + scaleAccidentalLabel(variantNotes)));
  if (hintText) {
    const span = doc.createElement('span');
    span.className = 'variant-hint';
    span.textContent = ' ' + hintText;
    h3.appendChild(span);
  }
  if (changesText) {
    const span = doc.createElement('span');
    span.className = 'variant-changes-inline';
    span.textContent = ' · ' + changesText;
    h3.appendChild(span);
  }
}

// <option> of the scale select: "Es dur (3♭ : b, es, as)"
export function makeOption(scale, doc = globalThis.document) {
  const option = doc.createElement('option');
  option.value = scale.id;
  option.textContent = `${scale.root} ${scale.type === 'major' ? 'dur' : 'moll'}${keySigLabel(scale.keySig)}`;

  return option;
}

// Fills a note row with one chip (button) per scale note: the tonic and the chord notes marked
export function renderNoteRow(containerEl, scaleNotes, chordNoteNames, doc = globalThis.document) {
  const chordSet = new Set(chordNoteNames);
  const tonicName = scaleNotes[0]?.name;
  containerEl.replaceChildren();
  scaleNotes.forEach((note) => {
    // A chip is a button: a click highlights the note in every octave (chips, staves)
    const chip = Object.assign(doc.createElement('button'), { type: 'button', textContent: noteChipLabel(note.name) });
    let cls = 'note-chip';
    if (note.name === tonicName)       cls += ' tonic';
    else if (chordSet.has(note.name))  cls += ' chord';
    chip.className = cls;
    chip.dataset.semitone = noteNameToSemitone(note.name);
    containerEl.appendChild(chip);
  });
}

// ─── URL hash ────────────────────────────────────────────────────────────────

export function scaleIdToHash(id) {
  return id.replace('-major', '-dur').replace('-minor', '-moll');
}

export function hashToScaleId(hash) {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;

  return fragment.replace('-dur', '-major').replace('-moll', '-minor');
}

// Selects the scale of a URL hash in `state` and switches on the filters it needs to be visible.
// Unknown hashes and types this page cannot show are ignored.
export function applyHashToState(state, hash) {
  if (!hash) return;
  const found = SCALE_CATALOG.find((s) => s.id === hashToScaleId(hash));
  // The last scale id is shared with the range page, which also offers types this
  // page cannot show: 'major-from' falls back to its base major scale, others are ignored.
  const entry = found?.baseId ? SCALE_CATALOG.find((s) => s.id === found.baseId) : found;
  if (!entry || (entry.type !== 'major' && entry.type !== 'minor')) return;
  // Ensure the required filters are active so the scale is visible
  if (!state.filterType.has(entry.type)) state.filterType.add(entry.type);
  if (entry.accidental !== 'natural' && !state.filterAcc.has(entry.accidental)) {
    state.filterAcc.add(entry.accidental);
  }
  state.scaleId = entry.id;
}
