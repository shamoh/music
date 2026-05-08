import { noteToStaffSlot, accidentalType } from './music.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STAFF_LINE_SLOTS = [-2, 0, 2, 4, 6]; // E4, G4, H4, D5, F5

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

function drawTrebleClefScaled(svg, x, staffTop, ls) {
  svg.appendChild(
    svgText(svgEl('text', {
      x,
      y: slotToY(-2, staffTop, ls) + ls * 1.5,
      'font-size': ls * 5.5,
      fill: 'currentColor',
      'font-family': 'serif',
      'text-anchor': 'middle',
    }), '𝄞')
  );
}

function drawLedgerLinesScaled(svg, x, slot, staffTop, ls, nr) {
  const ledgerSlots = [];
  if (slot <= -4) for (let s = -4; s >= slot; s -= 2) ledgerSlots.push(s);
  if (slot >= 8)  for (let s = 8;  s <= slot; s += 2) ledgerSlots.push(s);
  for (const s of ledgerSlots) {
    const y = slotToY(s, staffTop, ls);
    svg.appendChild(svgEl('line', {
      x1: x - nr * 1.8, y1: y,
      x2: x + nr * 1.8, y2: y,
      stroke: 'currentColor', 'stroke-width': 1,
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
    }), type === 'double-sharp' ? '𝄪' : type === 'sharp' ? '♯' : '♭')
  );
}

function drawNoteScaled(svg, x, note, staffTop, ls, nr, { color = 'currentColor', showLabel = false } = {}) {
  const slot = noteToStaffSlot(note.name, note.octave);
  const y = slotToY(slot, staffTop, ls);

  drawLedgerLinesScaled(svg, x, slot, staffTop, ls, nr);

  const accType = accidentalType(note.name);
  if (accType) drawAccidentalScaled(svg, x, slot, accType, staffTop, ls, nr);

  svg.appendChild(svgEl('ellipse', {
    cx: x, cy: y,
    rx: nr * 1.1, ry: nr * 0.85,
    fill: color,
    transform: `rotate(-15, ${x}, ${y})`,
  }));

  if (showLabel) {
    svg.appendChild(
      svgText(svgEl('text', {
        x,
        y: slotToY(slot - 2.5, staffTop, ls),
        'font-size': ls * 1.0,
        fill: color,
        'text-anchor': 'middle',
        'font-family': 'sans-serif',
      }), note.name)
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

export function renderScaleStaff(containerEl, scaleNotes, chordNoteNames) {
  clearEl(containerEl);

  const chordSet = new Set(chordNoteNames);
  const containerWidth = containerEl.clientWidth || 400;
  // Scale line spacing: larger on wide screens, min 9, max 14
  const ls = Math.min(14, Math.max(9, Math.floor(containerWidth / 38)));
  const noteRadius = ls * 0.45;
  const staffTop = ls * 6;
  const totalHeight = staffTop + ls * 4 + ls * 7;
  const clefWidth = ls * 3.5;
  const step = (containerWidth - clefWidth - ls) / (scaleNotes.length + 1);

  const svg = buildStaffSvg(containerWidth, totalHeight, 'Notová osnova stupnice');
  drawStaffLinesScaled(svg, clefWidth, containerWidth - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(svg, clefWidth - ls * 0.5, staffTop, ls);

  scaleNotes.forEach((note, i) => {
    const x = clefWidth + (i + 1) * step;
    const color = chordSet.has(note.name) ? 'var(--accent)' : 'var(--text)';
    drawNoteScaled(svg, x, note, staffTop, ls, noteRadius, { color, showLabel: true });
  });

  containerEl.appendChild(svg);
}

export function renderRangeStaff(containerEl, rangeNotes, scaleNotes) {
  clearEl(containerEl);

  const scaleSet = new Set(scaleNotes.map((n) => `${n.name}${n.octave}`));
  const containerWidth = containerEl.clientWidth || 400;
  // Each note needs at least 14px; enforce minimum width to avoid crowding
  const minWidth = rangeNotes.length * 14 + 60;
  const width = Math.max(containerWidth, minWidth);

  const ls = Math.min(12, Math.max(9, Math.floor(containerWidth / 42)));
  const noteRadius = ls * 0.45;
  const staffTop = ls * 8;
  const totalHeight = staffTop + ls * 4 + ls * 4;
  const clefWidth = ls * 3.5;
  const step = (width - clefWidth - ls) / (rangeNotes.length + 1);

  const svg = buildStaffSvg(width, totalHeight, 'Rozsah Alt Saxofonu');
  // When wider than container, don't stretch — scroll instead
  svg.setAttribute('width', width > containerWidth ? width : '100%');
  drawStaffLinesScaled(svg, clefWidth, width - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(svg, clefWidth - ls * 0.5, staffTop, ls);

  rangeNotes.forEach((note, i) => {
    const x = clefWidth + (i + 1) * step;
    const color = scaleSet.has(`${note.name}${note.octave}`)
      ? 'var(--accent)'
      : 'var(--text-muted)';
    drawNoteScaled(svg, x, note, staffTop, ls, noteRadius, { color });
  });

  containerEl.appendChild(svg);
}
