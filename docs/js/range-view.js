// Rendering of the shown scale (or of the full range) on the saxophone range page: staves,
// subtitles, hints, links, tracking and the fingerings below.

import { SCALE_CATALOG, generateScale, getChordNotes, buildAltSaxRange, rangeScaleNotes, findSamePitch, accidentalType, scalePair, shortNoteName } from './music.js';
import { FULL_RANGE_ID, SCALE_HINT, FULL_RANGE_HINT, scaleName, scaleIdToCode } from './range-names.js';
import { annotateOutsideNotes } from './range-fingerings.js';

// Replace flat/sharp names in the chromatic range with the scale's proper note names.
// useFlats controls whether non-scale notes use flat or sharp names.
// His and Ces cross octave boundaries (His3=C4 pitch, Ces5=H4 pitch), so octave
// must be adjusted when the scale renames a note to His or Ces.
export function buildFullSaxRange(variantScale, useFlats) {
  const baseNotes = buildAltSaxRange(useFlats);
  const scaleNameBySemitone = new Map();
  for (const n of variantScale.slice(0, 7)) {
    if (!scaleNameBySemitone.has(n.semitone)) scaleNameBySemitone.set(n.semitone, n.name);
  }
  return baseNotes.map((note) => {
    const scaleName = scaleNameBySemitone.get(note.semitone);
    if (!scaleName) return note;
    let octave = note.octave;
    if (scaleName === 'His') octave--;
    else if (scaleName === 'Ces') octave++;
    return { ...note, name: scaleName, octave };
  });
}

export function createRangeView({ doc, $, state, renderStaff, trackView, header, fingerings, renderNoteDetails, pushHash, clearHash }) {
  const { updateTypeNav, updateScaleHeading, setSubtitle, setScaleSubtitle } = header;
  const { renderFingeringChart, renderNoteFingerings } = fingerings;

  // 'major-from' scale: full sax range, all scale notes highlighted.
  // An enharmonic pair (e.g. Ais/B dur) is shown as two staves, sharp spelling first —
  // same pitches, so the colors match; only the note names differ.
  // Returns { scaleNotes, rangeNotes } of the first staff (for the fingering chart).
  function renderMajorFromStaves(entry) {
    const [first, twin] = scalePair(entry);
    setScaleSubtitle($('range-subtitle'), first, 'natural');
    const notes = renderMajorFromStaff($('range-staff'), first);
    $('twin-block').hidden = !twin;
    if (twin) {
      setScaleSubtitle($('twin-subtitle'), twin, 'natural');
      renderMajorFromStaff($('range-staff-twin'), twin);
    }

    return notes;
  }

  // Returns { scaleNotes, rangeNotes }: the scale notes within the range and all range
  // notes, in the staff's spelling.
  function renderMajorFromStaff(staffEl, entry) {
    const scale      = generateScale(entry.id, 4, 'natural');
    const chordNames = getChordNotes(scale).map((n) => n.name);
    const useFlats   = entry.accidental === 'flat';
    const range      = buildFullSaxRange(scale, useFlats);
    renderStaff(staffEl, range, scale, chordNames, 0, false);
    const scaleNotes = rangeScaleNotes(range, scale);
    annotateOutsideNotes(staffEl, scaleNotes, false);

    return { scaleNotes, rangeNotes: range };
  }

  // The whole instrument range: every note, none of them highlighted as a tonic.
  function renderFullRange() {
    clearHash();
    $('nav-scales-link').href = '/scales/';
    updateScaleHeading(null);
    updateTypeNav(null);
    // Same pitches twice, like an enharmonic pair: sharp names first, then flat names.
    // The twin block must be visible before drawing — a hidden staff has no width.
    $('twin-block').hidden = false;
    renderFullRangeStaff($('range-staff'), $('range-subtitle'), 'Křížky', buildAltSaxRange(false));
    renderFullRangeStaff($('range-staff-twin'), $('twin-subtitle'), 'Béčka', buildAltSaxRange(true));
    $('asc-label').hidden = true;
    $('desc-block').hidden = true;
    $('range-hint').textContent = FULL_RANGE_HINT;
    $('note-details').appendChild($('note-fingerings'));
    renderFingeringChart();
    renderNoteDetails();
    trackView(FULL_RANGE_ID, 'natural');
  }

  function renderFullRangeStaff(staffEl, subtitleEl, name, range) {
    const bounds = (n) => shortNoteName(n.name) + n.octave;
    setSubtitle(subtitleEl, name, `${bounds(range[0])} – ${bounds(range[range.length - 1])}`, ` · ${range.length} tónů`);
    renderStaff(staffEl, range, range, [], 0, false, { showTonic: false });
  }

  function update() {
    if (state.scaleId === FULL_RANGE_ID) {
      renderFullRange();
      return;
    }
    const entry = SCALE_CATALOG.find((s) => s.id === state.scaleId);
    if (!entry) return;
    $('range-hint').textContent = SCALE_HINT;
    $('start-scales').hidden = true;

    pushHash(entry, state.variantType);
    const navScalesLink = doc.getElementById('nav-scales-link');
    if (navScalesLink) {
      // The scales page shows only dur/moll — theoretical keys and whole-tone link to its default
      const scalesId = entry.baseId ?? (['major', 'minor'].includes(entry.type) ? entry.id : null);
      navScalesLink.href = scalesId ? '/scales/#' + scaleIdToCode(scalesId) : '/scales/';
    }
    updateTypeNav(entry, state.variantType);
    updateScaleHeading(entry);

    const naturalScale = generateScale(entry.id, 4, 'natural');
    const chordNames   = getChordNotes(naturalScale).map((n) => n.name);
    const isMinor      = entry.type === 'minor';
    const variantScale = isMinor ? generateScale(entry.id, 4, state.variantType) : naturalScale;
    // Whole-tone scales are classified as 'natural' (they sit outside the sharp/flat
    // filter), so infer the fill-note spelling from the scale's own accidentals instead.
    const useFlats = entry.accidental === 'flat'
      || entry.notes.some((n) => accidentalType(n) === 'flat');

    let scaleNotes;
    let rangeNotes;   // every note of the range in the staff's spelling (also outside the scale)
    // Whole-tone and "dur od tónu" scales name the fingering columns with all names of a note
    const allNames = entry.type === 'whole-tone' || entry.startOctave !== undefined;
    if (entry.startOctave !== undefined) {
      ({ scaleNotes, rangeNotes } = renderMajorFromStaves(entry));
    } else {
      setScaleSubtitle($('range-subtitle'), entry, isMinor ? state.variantType : 'natural');
      $('twin-block').hidden = true;
      rangeNotes = buildFullSaxRange(variantScale, useFlats);
      renderStaff($('range-staff'), rangeNotes, variantScale, chordNames, 0, isMinor);
      scaleNotes = rangeScaleNotes(rangeNotes, variantScale);
      annotateOutsideNotes($('range-staff'), scaleNotes, isMinor);
    }
    trackView(entry.id, state.variantType);

    const isMelodic = isMinor && state.variantType === 'melodic';
    $('asc-label').hidden = !isMelodic;
    $('desc-block').hidden = !isMelodic;

    if (isMelodic) {
      const descRange = buildFullSaxRange(naturalScale, useFlats);
      renderStaff($('range-staff-desc'), descRange.slice().reverse(), naturalScale, chordNames, 0, isMinor);
      const descScaleNotes = rangeScaleNotes(descRange, naturalScale);
      annotateOutsideNotes($('range-staff-desc'), descScaleNotes, isMinor);
      // Fingerings of both directions; a note in both keeps the ascending spelling
      scaleNotes = [...descScaleNotes, ...scaleNotes];
    }
    state.scaleNotes = scaleNotes;
    state.rangeNotes = rangeNotes;
    // Another scale keeps the clicked note only while it is in it (e.g. switching the minor
    // variant); redrawing the same scale (resize) keeps also a note outside the scale,
    // picked from an empty fingering slot
    const scaleKey = `${entry.id}/${state.variantType}`;
    if (state.scaleNoteKey !== scaleKey) {
      if (state.scaleNote && !findSamePitch(scaleNotes, state.scaleNote)) state.scaleNote = null;
      state.scaleNoteKey = scaleKey;
    }
    // Melodic minor has the descending staff in between — keep the panel next to the fingerings
    const panelHost = $(isMelodic ? 'note-details-bottom' : 'note-details');
    if ($('note-fingerings').parentNode !== panelHost) panelHost.appendChild($('note-fingerings'));
    renderFingeringChart(scaleNotes, variantScale[0].name, chordNames, isMinor, rangeNotes, allNames);
    renderNoteFingerings();
  }

  return { update };
}
