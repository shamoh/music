// Fingering chart and the fingerings panel of the saxophone range page, and marking of the
// selected / highlighted note in them.

import { SCALE_CATALOG, findSamePitch, shortNoteName, altSaxRangeSection, notePitchMidi, pitchSpellings, scaleNeighborsLabel, noteNameToSemitone } from './music.js';
import { FULL_RANGE_ID, OUTSIDE_SCALE_PREFIX } from './range-names.js';
import { renderKeyDiagram } from './fingering-diagram.js';
import { fingeringFor, fingeringRows, columnLabels } from './fingering.js';
import { SAXOPHONE_ALTO } from './instrument/saxophone/alto/instrument.js';
import { markHighlightedNote } from './note-highlight.js';

// Grey staff notes outside the scale get one more tooltip line telling where they lie:
// "mimo stupnici · mezi E a F♯" (staffScaleNotes: the scale notes of this staff).
export function annotateOutsideNotes(staffEl, staffScaleNotes, lowercase) {
  for (const g of staffEl.querySelectorAll('[data-layer="muted-notes"] [data-note]')) {
    const note = { name: g.dataset.note, octave: Number(g.dataset.octave) };
    g.dataset.tooltip += `\n${outsideScaleText(staffScaleNotes, note, lowercase)}`;
  }
}

// "mimo stupnici · mezi E a F♯" — staff tooltip and the fingerings panel
export function outsideScaleText(scaleNotes, note, lowercase) {
  const where = scaleNeighborsLabel(scaleNotes, note, lowercase);

  return where ? `${OUTSIDE_SCALE_PREFIX} · ${where}` : OUTSIDE_SCALE_PREFIX;
}

export function createRangeFingerings({ doc, $, state, selectedNote }) {
  // ─── Full range: fingerings ──────────────────────────────────────────────────

  const FINGERING_CELL_WIDTH  = 60;   // default size; CSS scales it with the cell
  const FINGERING_PANEL_WIDTH = 56;

  // All names of a fingering's note, as the staff tooltip lists them: natural first, sharps
  // above flats, e.g. [Cis4, Des4], [H3, Ces4], [G4, Fisis4].
  function rangeSpellings(f) {
    return pitchSpellings(f.note, f.octave);
  }

  // "C♯" + smaller muted octave number, like the tooltip
  function noteNameElement(tag, className, { name, octave }) {
    const el = Object.assign(doc.createElement(tag), { className, textContent: shortNoteName(name) });
    el.appendChild(Object.assign(doc.createElement('span'), { className: 'note-octave', textContent: String(octave) }));

    return el;
  }

  // Basic fingerings in rows by range section (same colors as the staff bands); a column
  // always holds the same note (C under C, F♯ under F♯). Positions without a fingering
  // are slots: grey outside the instrument's range, empty for notes outside the scale.
  // scaleNotes: notes of a scale within the range (in the scale's spelling) — only
  // these are shown, the tonic's name is marked like on the staff; null = full range,
  // every note in sharp and flat spelling. A click on a fingering selects its note.
  // rangeNotes (scale page): all range notes in the staff's spelling — names the notes
  // outside the scale, whose empty slots can be clicked to show their fingerings.
  // allNames (scale page): name the columns with all names of their notes, like the full
  // range (whole-tone and "dur od tónu" scales — an enharmonic pair's names are among
  // them); otherwise with the scale's spelling only.
  function renderFingeringChart(scaleNotes = null, tonicName = null, chordNames = [], lowercase = false, rangeNotes = [], allNames = false) {
    const chart = $('fingering-chart');
    chart.replaceChildren();
    chart.hidden = false;
    chart.appendChild(Object.assign(doc.createElement('h3'), { textContent: scaleNotes ? 'Hmaty tónů stupnice' : 'Hmaty' }));

    const scaleByPitch = scaleNotes && new Map(scaleNotes.map((n) => [notePitchMidi(n.name, n.octave), n]));
    const rangeByPitch = new Map(rangeNotes.map((n) => [notePitchMidi(n.name, n.octave), n]));
    // Column names of the tonic and of the chord notes are boxed in the staff label colors
    const roles = { tonic: tonicName ? noteNameToSemitone(tonicName) : null, chord: new Set(chordNames.map(noteNameToSemitone)), lowercase };
    const grid = Object.assign(doc.createElement('div'), { className: 'fingering-grid' });
    const { columns, rows } = fingeringRows(SAXOPHONE_ALTO.fingerings, (f) => altSaxRangeSection(f.note, f.octave));
    grid.style.setProperty('--fingering-columns', columns);
    // Spellings shown for a fingering: the scale's name, or sharp and flat in the full range;
    // null for a note outside the scale (not drawn)
    const spellingsOf = (f) => {
      if (!scaleByPitch) return rangeSpellings(f);
      const note = scaleByPitch.get(notePitchMidi(f.note, f.octave));
      if (!note) return null;

      return allNames ? rangeSpellings(f) : [note];
    };
    // Column names above and below the chart — only for columns with a fingering shown
    const labels = columnLabels(rows, spellingsOf);
    grid.appendChild(fingeringHeader(labels, 'top', roles));
    // Every row fills all columns: a fingering, an empty slot for a note outside the shown
    // scale, or a grey slot where the instrument has no note at all (outside its range)
    for (const row of rows) {
      const rowEl = Object.assign(doc.createElement('div'), { className: 'fingering-row' });
      for (let column = 1; column <= columns; column++) {
        const f = row.entries[row.columns.indexOf(column)];
        const spellings = f && spellingsOf(f);
        const outside = f && !spellings
          ? rangeByPitch.get(notePitchMidi(f.note, f.octave)) ?? { name: f.note, octave: f.octave }
          : null;
        rowEl.appendChild(spellings
          ? fingeringCell(f, spellings, row.section, column)
          : fingeringSlot(outside ? 'unused' : 'missing', column, outside));
      }
      grid.appendChild(rowEl);
    }
    grid.appendChild(fingeringHeader(labels, 'bottom', roles));
    chart.appendChild(grid);
    markSelectedNote();
  }

  // Row above / below the chart (position 'top' | 'bottom') naming the note of each column
  // (C, C♯ D♭, …) — without octaves, a column holds the same note in every octave. The
  // fingerings themselves carry no names. The full range names a column with all names of
  // its note (natural first, sharps above flats), a scale page in the scale's spelling — lowercase
  // for minor scales, like the labels under the staff notes.
  // roles: { tonic: semitone | null, chord: Set, lowercase } — on a scale page the tonic's
  // name is boxed red, the chord notes' black (staff colors).
  function fingeringHeader(labels, position, { tonic = null, chord = new Set(), lowercase = false } = {}) {
    const header = Object.assign(doc.createElement('div'), { className: `fingering-row fingering-header ${position}` });
    for (const [column, spellings] of labels) {
      // A click highlights the fingerings of this note in every octave
      const semitone = noteNameToSemitone(spellings[0].name);
      const role = semitone === tonic ? ' tonic' : chord.has(semitone) ? ' chord' : '';
      const cell = Object.assign(doc.createElement('button'), { type: 'button', className: `fingering-header-cell${role}` });
      cell.dataset.semitone = semitone;
      const names = spellings.map((sp) => (lowercase ? shortNoteName(sp.name).toLowerCase() : shortNoteName(sp.name)));
      cell.setAttribute('aria-label', `Zvýraznit hmaty tónu ${names.join(' / ')}`);
      // One grid row: the labels come in data order (the lowest row's columns first)
      cell.style.gridRow = '1';
      cell.style.gridColumnStart = column;
      for (const name of names) {
        cell.appendChild(Object.assign(doc.createElement('span'), { className: 'fingering-header-name', textContent: name }));
      }
      header.appendChild(cell);
    }

    return header;
  }

  // Placeholder keeping a grid position as large as a fingering: kind 'missing' (grey —
  // no such note on the instrument) or 'unused' (empty — `note` outside the shown scale;
  // a click selects it and shows its fingerings, e.g. for chromatic passing notes).
  // Holds an invisible diagram, so it has exactly the height of a fingering.
  function fingeringSlot(kind, column, note = null) {
    const slot = note
      ? Object.assign(doc.createElement('button'), { type: 'button', className: `fingering-slot ${kind}` })
      : Object.assign(doc.createElement('div'), { className: `fingering-slot ${kind}` });
    if (note) {
      slot.dataset.note = note.name;
      slot.dataset.octave = note.octave;
      slot.setAttribute('aria-label', `Hmat ${note.name}${note.octave} (mimo stupnici)`);
    } else {
      slot.setAttribute('aria-hidden', 'true');
    }
    slot.style.gridColumnStart = column;
    slot.insertAdjacentHTML('beforeend', renderKeyDiagram(SAXOPHONE_ALTO, [], { width: FINGERING_CELL_WIDTH, crop: true }));

    return slot;
  }

  // A fingering without a written name — the column names above and below say the note
  // (the octave follows from the row); screen readers get the full name.
  function fingeringCell(f, spellings, section, column) {
    const cell = Object.assign(doc.createElement('button'), { type: 'button', className: 'fingering-cell' });
    const [main] = spellings;
    cell.dataset.note = main.name;
    cell.dataset.octave = main.octave;
    cell.style.background = `var(--section-bg-${section + 1})`;
    cell.style.gridColumnStart = column;
    cell.setAttribute('aria-label', `Hmat ${spellings.map((s) => s.name + s.octave).join(' / ')}`);
    cell.insertAdjacentHTML('beforeend', renderKeyDiagram(SAXOPHONE_ALTO, f.variants[0].keys, { width: FINGERING_CELL_WIDTH, crop: true }));

    return cell;
  }

  // Marks the selected note (any spelling) in the fingering chart and on both staves.
  // Also marks the highlighted column note: its fingerings, column names and staff notes.
  function markSelectedNote() {
    const note = selectedNote();
    const pitch = note ? notePitchMidi(note.name, note.octave) : null;
    const isSelected = (el) => pitch !== null && notePitchMidi(el.dataset.note, Number(el.dataset.octave)) === pitch;
    const column = state.columnNote;
    const cells = $('fingering-chart').querySelectorAll('.fingering-cell');
    const staffNotes = ['range-staff', 'range-staff-twin', 'range-staff-desc'].flatMap((id) => [...$(id).querySelectorAll('[data-note]')]);
    for (const cell of [...cells, ...$('fingering-chart').querySelectorAll('.fingering-slot.unused')]) {
      const selected = isSelected(cell);
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
    }
    for (const g of staffNotes) g.classList.toggle('selected', isSelected(g));

    markHighlightedNote(cells, column);
    markHighlightedNote(staffNotes, column);
    markHighlightedNote(doc.querySelectorAll('.subtitle-note'), column, { className: 'active', pressable: true });
    markHighlightedNote($('fingering-chart').querySelectorAll('.fingering-header-cell'), column, { className: 'active', pressable: true });
  }

  // Basic and alternative fingerings of the selected note, next to its start scales.
  function renderNoteFingerings() {
    const panel = $('note-fingerings');
    panel.replaceChildren();
    const note = selectedNote();
    const entry = note && fingeringFor(SAXOPHONE_ALTO.fingerings, note.name, note.octave);
    panel.hidden = !entry;
    if (!entry) return;

    const title = Object.assign(doc.createElement('p'), { className: 'note-fingerings-title', textContent: 'Hmaty tónu ' });
    title.appendChild(noteNameElement('span', '', note));
    panel.appendChild(title);
    // A note picked on a scale page outside the scale (empty slot, ↑/↓ from such a note)
    // — with its place in the scale, below the title like in the staff tooltip
    if (state.scaleId !== FULL_RANGE_ID && !findSamePitch(state.scaleNotes, note)) {
      const isMinor = SCALE_CATALOG.find((s) => s.id === state.scaleId)?.type === 'minor';
      panel.appendChild(Object.assign(doc.createElement('p'), {
        className: 'note-extra note-fingerings-outside',
        textContent: outsideScaleText(state.scaleNotes, note, isMinor),
      }));
    }

    // Basic and alternative fingerings side by side on one row (wraps on narrow screens)
    const groups = Object.assign(doc.createElement('div'), { className: 'note-fingerings-groups' });
    const [basic, ...alternatives] = entry.variants;
    appendFingeringGroup(groups, 'Základní', [basic]);
    if (alternatives.length > 0) appendFingeringGroup(groups, 'Alternativní', alternatives);
    panel.appendChild(groups);
  }

  function appendFingeringGroup(groups, label, variants) {
    const group = Object.assign(doc.createElement('div'), { className: 'note-fingerings-group' });
    group.appendChild(Object.assign(doc.createElement('p'), { className: 'note-fingerings-label', textContent: label }));
    const list = Object.assign(doc.createElement('div'), { className: 'note-fingerings-list' });
    for (const v of variants) {
      const figure = Object.assign(doc.createElement('figure'), { className: 'fingering-variant' });
      figure.innerHTML = renderKeyDiagram(SAXOPHONE_ALTO, v.keys, { width: FINGERING_PANEL_WIDTH, crop: true });
      // The basic variant is often just named "Základní" — don't repeat the group label
      if (v.name !== label) figure.appendChild(Object.assign(doc.createElement('figcaption'), { textContent: v.name }));
      list.appendChild(figure);
    }
    group.appendChild(list);
    groups.appendChild(group);
  }

  return { renderFingeringChart, renderNoteFingerings, markSelectedNote };
}
