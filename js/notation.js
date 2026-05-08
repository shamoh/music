import { noteToStaffSlot, accidentalType } from './music.js';

// Short note label for display on staff: "Fis"→"F#", "Es"→"E♭", "B"→"B♭", "C"→"C"
// lowercase=true converts the base letter to lowercase (minor scales)
function shortNoteLabel(noteName, lowercase = false) {
  let base, suffix;
  if (noteName === 'B') {
    base = 'B'; suffix = '♭';
  } else {
    base = noteName[0];
    const acc = accidentalType(noteName);
    suffix = acc === 'sharp' ? '#' : acc === 'flat' ? '♭' : '';
  }
  return (lowercase ? base.toLowerCase() : base) + suffix;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

const STAFF_LINE_SLOTS = [-2, 0, 2, 4, 6]; // E4, G4, H4, D5, F5

// Treble clef key signature accidental positions (slot numbers)
// Sharps: Fis Cis Gis Dis Ais Eis His
const SHARP_KEY_SIG_SLOTS = [6, 3, 7, 4, 1, 5, 2]; // Fis Cis Gis Dis Ais Eis His
// Flats: B Es As Des Ges Ces Fes
const FLAT_KEY_SIG_SLOTS  = [2, 5, 1, 4, 0, 3, -1];

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ls = line spacing (px between adjacent staff lines)
function slotToY(slot, staffTop, ls) {
  return staffTop + (6 - slot) * (ls / 2);
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function svgText(el, content) {
  el.textContent = content;
  return el;
}

function drawStaffLinesScaled(svg, x1, x2, staffTop, ls) {
  for (const slot of STAFF_LINE_SLOTS) {
    const y = slotToY(slot, staffTop, ls);
    svg.appendChild(svgEl('line', { x1, y1: y, x2, y2: y, stroke: 'currentColor', 'stroke-width': 1 }));
  }
}

// Baseline at E4 (bottom staff line) so the curl sits near G4 and the clef
// extends naturally above the staff top.
function drawTrebleClefScaled(svg, x, staffTop, ls) {
  svg.appendChild(
    svgText(svgEl('text', {
      x,
      y: slotToY(-2, staffTop, ls),
      'font-size': ls * 5.5,
      fill: 'currentColor',
      'font-family': 'serif',
      'text-anchor': 'middle',
    }), '𝄞')
  );
}

function drawLedgerLinesScaled(svg, x, slot, staffTop, ls, nr, halfW = nr * 2.5) {
  const ledgerSlots = [];
  if (slot <= -4) for (let s = -4; s >= slot; s -= 2) ledgerSlots.push(s);
  if (slot >= 8)  for (let s = 8;  s <= slot; s += 2) ledgerSlots.push(s);
  for (const s of ledgerSlots) {
    const y = slotToY(s, staffTop, ls);
    svg.appendChild(svgEl('line', {
      x1: x - halfW, y1: y,
      x2: x + halfW, y2: y,
      stroke: 'currentColor', 'stroke-width': 1.5,
    }));
  }
}

function drawAccidentalScaled(svg, x, slot, type, staffTop, ls, nr) {
  const y = slotToY(slot, staffTop, ls);
  svg.appendChild(
    svgText(svgEl('text', {
      x: x - nr * 2.2,
      y: y + nr * 0.5,
      'font-size': ls * 1.4,
      fill: 'currentColor',
      'text-anchor': 'middle',
      'font-family': 'serif',
    }), type === 'sharp' ? '♯' : '♭')
  );
}

// Draw a key signature accidental centered at cx (used for key sig symbols,
// not note-attached accidentals — no nr offset).
// Flat symbols are drawn at 99% of their natural rendered width (requires SVG in DOM).
function drawKeySigAccidental(svg, cx, slot, type, staffTop, ls) {
  const y = slotToY(slot, staffTop, ls);
  const attrs = {
    x: cx,
    y: y + ls * 0.3,
    'font-size': ls * 1.4,
    fill: 'currentColor',
    'text-anchor': 'middle',
    'font-family': 'serif',
    'lengthAdjust': 'spacingAndGlyphs',
  };
  if (type === 'sharp') attrs['textLength'] = ls * 0.6;
  const el = svgText(svgEl('text', attrs), type === 'sharp' ? '♯' : '♭');
  svg.appendChild(el);
  if (type === 'flat') {
    const w = el.getComputedTextLength();
    if (w > 0) el.setAttribute('textLength', w * 0.99);
  }
}

function keySignatureWidth(keySig, ls) {
  const count = Math.abs(keySig);
  return count > 0 ? count * ls * 0.46 + ls * 0.4 : 0;
}

function drawKeySignature(svg, keySig, staffTop, ls, startX) {
  if (keySig === 0) return;
  const isSharp = keySig > 0;
  const slots = isSharp ? SHARP_KEY_SIG_SLOTS : FLAT_KEY_SIG_SLOTS;
  const count = Math.abs(keySig);
  const type = isSharp ? 'sharp' : 'flat';
  const spacing = ls * 0.46;

  for (let i = 0; i < count; i++) {
    drawKeySigAccidental(svg, startX + i * spacing + spacing * 0.5, slots[i], type, staffTop, ls);
  }
}

function drawNoteScaled(svg, x, note, staffTop, ls, nr, { color = 'currentColor', showLabel = false, lowercase = false, ledgerHalfW = nr * 2.5 } = {}) {
  const slot = noteToStaffSlot(note.name, note.octave);
  const y = slotToY(slot, staffTop, ls);

  svg.appendChild(svgEl('ellipse', {
    cx: x, cy: y,
    rx: nr * 1.1, ry: nr * 0.85,
    fill: color,
    transform: `rotate(-15, ${x}, ${y})`,
  }));

  // Ledger lines drawn after the note head so they appear on top of it
  drawLedgerLinesScaled(svg, x, slot, staffTop, ls, nr, ledgerHalfW);

  if (showLabel) {
    // Fixed baseline below the bottom staff line (slot -2) — consistent for all notes
    const labelY = staffTop + ls * 4 + ls * 2.8;
    svg.appendChild(
      svgText(svgEl('text', {
        x,
        y: labelY,
        'font-size': ls * 0.95,
        fill: color,
        'text-anchor': 'middle',
        'font-family': 'sans-serif',
      'font-weight': 'bold',
      }), shortNoteLabel(note.name, lowercase))
    );
  }
}

function buildStaffSvg(width, totalHeight, label) {
  return svgEl('svg', {
    width: '100%',
    height: totalHeight,
    viewBox: `0 0 ${width} ${totalHeight}`,
    'aria-label': label,
  });
}

export function renderScaleStaff(containerEl, scaleNotes, chordNoteNames, keySig = 0, isMinor = false) {
  clearEl(containerEl);

  const chordSet = new Set(chordNoteNames);
  const containerWidth = containerEl.clientWidth || 400;
  const ls = Math.min(14, Math.max(9, Math.floor(containerWidth / 38)));
  const noteRadius = ls * 0.45;
  const staffTop = ls * 6;
  const totalHeight = staffTop + ls * 4 + ls * 7;
  const clefWidth = ls * 3.5;
  const keySigW = keySignatureWidth(keySig, ls);
  const notesStartX = clefWidth + keySigW;
  const step = (containerWidth - notesStartX - ls) / (scaleNotes.length + 1);

  const svg = buildStaffSvg(containerWidth, totalHeight, 'Notová osnova stupnice');
  containerEl.appendChild(svg);
  drawStaffLinesScaled(svg, clefWidth, containerWidth - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(svg, clefWidth - ls * 0.5, staffTop, ls);
  drawKeySignature(svg, keySig, staffTop, ls, clefWidth + ls * 0.3);

  scaleNotes.forEach((note, i) => {
    const x = notesStartX + (i + 1) * step;
    const color = chordSet.has(note.name) ? 'var(--accent)' : 'var(--text)';
    drawNoteScaled(svg, x, note, staffTop, ls, noteRadius, { color, showLabel: true, lowercase: isMinor });
  });
}

export function renderRangeStaff(containerEl, rangeNotes, scaleNotes, keySig = 0) {
  clearEl(containerEl);

  const scaleSet = new Set(scaleNotes.map((n) => `${n.name}${n.octave}`));
  const containerWidth = containerEl.clientWidth || 400;
  const minWidth = rangeNotes.length * 14 + 60;
  const width = Math.max(containerWidth, minWidth);

  const ls = Math.min(12, Math.max(9, Math.floor(containerWidth / 42)));
  const noteRadius = ls * 0.45;
  const staffTop = ls * 8;
  const totalHeight = staffTop + ls * 4 + ls * 4;
  const clefWidth = ls * 3.5;
  const keySigW = keySignatureWidth(keySig, ls);
  const notesStartX = clefWidth + keySigW;
  const step = (width - notesStartX - ls) / (rangeNotes.length + 1);

  const svg = buildStaffSvg(width, totalHeight, 'Rozsah Alt Saxofonu');
  svg.setAttribute('width', width > containerWidth ? width : '100%');
  containerEl.appendChild(svg);
  drawStaffLinesScaled(svg, clefWidth, width - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(svg, clefWidth - ls * 0.5, staffTop, ls);
  drawKeySignature(svg, keySig, staffTop, ls, clefWidth + ls * 0.3);

  // Ledger lines drawn on top of note heads — cap width so consecutive lines don't merge
  const ledgerHalfW = Math.min(noteRadius * 2.5, step * 0.46);

  rangeNotes.forEach((note, i) => {
    const x = notesStartX + (i + 1) * step;
    const color = scaleSet.has(`${note.name}${note.octave}`)
      ? 'var(--accent)'
      : 'var(--text-muted)';
    drawNoteScaled(svg, x, note, staffTop, ls, noteRadius, { color, ledgerHalfW });
  });
}
