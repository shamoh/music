import { noteToStaffSlot, accidentalType, computeInlineAccidentals, enharmonicEquivalent } from './music.js';

// Short note label for display on staff: "Fis"→"F#", "Es"→"E♭", "B"→"B♭", "C"→"C"
// lowercase=true converts the base letter to lowercase (minor scales)
function shortNoteLabel(noteName, lowercase = false) {
  if (noteName === 'B') return lowercase ? 'b' : 'B';
  const base = noteName[0];
  const acc = accidentalType(noteName);
  const suffix = acc === 'double-sharp' ? '×' : acc === 'sharp' ? '#' : acc === 'flat' ? '♭' : '';
  return (lowercase ? base.toLowerCase() : base) + suffix;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function profileFontScale() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-scale');
  return parseFloat(v) || 1;
}

function profileNoteColWidth() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--note-col-width');
  return parseFloat(v) || 33;
}

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

function drawLedgerLinesScaled(svg, x, slot, staffTop, ls, nr, halfW = nr * 2.5, stroke = 'currentColor') {
  const ledgerSlots = [];
  if (slot <= -4) for (let s = -4; s >= slot; s -= 2) ledgerSlots.push(s);
  if (slot >= 8)  for (let s = 8;  s <= slot; s += 2) ledgerSlots.push(s);
  for (const s of ledgerSlots) {
    const y = slotToY(s, staffTop, ls);
    svg.appendChild(svgEl('line', {
      x1: x - halfW, y1: y,
      x2: x + halfW, y2: y,
      stroke, 'stroke-width': 1.5,
    }));
  }
}

function drawAccidentalScaled(svg, x, slot, type, staffTop, ls, nr, fill = 'currentColor') {
  const y = slotToY(slot, staffTop, ls);
  const char = type === 'double-sharp' ? '𝄪' : type === 'sharp' ? '♯' : type === 'flat' ? '♭' : '♮';
  svg.appendChild(
    svgText(svgEl('text', {
      x: x - nr * 2.2,
      y: y + nr * 0.5,
      'font-size': ls * 1.4,
      fill,
      'text-anchor': 'middle',
      'font-family': 'serif',
    }), char)
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
  return count > 0 ? count * ls * 0.46 + ls * 1.3 : 0;
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

function drawNoteScaled(svg, x, note, staffTop, ls, nr, { color = 'currentColor', ledgerColor = null, labelColor = null, labelBg = null, showLabel = false, lowercase = false, ledgerHalfW = nr * 2.5, inlineAcc = null, labelY = null } = {}) {
  const slot = noteToStaffSlot(note.name, note.octave);
  const y = slotToY(slot, staffTop, ls);
  const resolvedLedger = ledgerColor ?? color;
  const resolvedLabel  = labelColor  ?? color;

  svg.appendChild(svgEl('ellipse', {
    cx: x, cy: y,
    rx: nr * 1.1, ry: nr * 0.85,
    fill: color,
    transform: `rotate(-15, ${x}, ${y})`,
  }));

  // Ledger lines drawn after the note head so they appear on top of it
  drawLedgerLinesScaled(svg, x, slot, staffTop, ls, nr, ledgerHalfW, resolvedLedger);

  if (inlineAcc) drawAccidentalScaled(svg, x, slot, inlineAcc, staffTop, ls, nr, color);

  if (showLabel) {
    const ly = labelY !== null ? labelY : staffTop + ls * 4 + ls * 2.8;
    if (labelBg) {
      const pillW = ls * 2.4;
      const pillH = ls * 1.5;
      svg.appendChild(svgEl('rect', {
        x: x - pillW / 2,
        y: ly - ls * 1.2,
        width: pillW,
        height: pillH,
        rx: pillH / 2,
        fill: labelBg,
      }));
    }
    svg.appendChild(
      svgText(svgEl('text', {
        x,
        y: ly,
        'font-size': ls * 1.2,
        fill: resolvedLabel,
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
  const tonicName = scaleNotes[0]?.name;
  const containerWidth = containerEl.clientWidth || 400;
  const ls = Math.min(14, Math.max(9, Math.floor(containerWidth / 38))) * profileFontScale();
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
  drawKeySignature(svg, keySig, staffTop, ls, clefWidth + ls * 1.2);

  const inlineAccs = computeInlineAccidentals(scaleNotes.map((n) => n.name), keySig);

  const lowestSlot = Math.min(...scaleNotes.map((n) => noteToStaffSlot(n.name, n.octave)));
  const labelY = Math.max(
    staffTop + ls * 4 + ls * 2.8,
    slotToY(lowestSlot, staffTop, ls) + ls * 1.3,
  );

  scaleNotes.forEach((note, i) => {
    const x = notesStartX + (i + 1) * step;
    const k = note.name === tonicName ? 'tonic' : chordSet.has(note.name) ? 'chord' : 'scale';
    const color       = `var(--note-${k})`;
    const ledgerColor = `var(--note-${k}-ledger)`;
    const labelColor  = `var(--note-${k}-label)`;
    drawNoteScaled(svg, x, note, staffTop, ls, noteRadius, { color, ledgerColor, labelColor, showLabel: true, lowercase: isMinor, inlineAcc: inlineAccs[i], labelY });
  });
}

// Sections are fixed by pitch (frequency), independent of scale or key signature.
// App MIDI = octave*12 + semitone  (C4=48, H3=47).
// Ces/His cross octave boundaries: Ces4 pitchMidi=(4-1)*12+11=47, His3 pitchMidi=(3+1)*12=48.
//
// Sec 1 (≤47):   Ais3/B3  H3/Ces4
// Sec 2 (48–61): His3/C4  Cis4/Des4  D4  Dis4/Es4  E4/Fes4  Eis4/F4  Fis4/Ges4  G4  Gis4/As4  A4  Ais4/B4  H4/Ces5  His4/C5  Cis5/Des5
// Sec 3 (62–73): D5  Dis5/Es5  E5/Fes5  Eis5/F5  Fis5/Ges5  G5  Gis5/As5  A5  Ais5/B5  H5/Ces6  His5/C6  Cis6/Des6
// Sec 4 (≥74):   D6  Dis6/Es6  E6/Fes6  Eis6/F6
const RANGE_SECTION_MIDI_MAX = [47, 61, 73]; // section i = pitchMidi ≤ value[i]; section 3 = remainder


function rangeSection(note) {
  const midi = note.name === 'Ces' ? (note.octave - 1) * 12 + 11
             : note.name === 'His' ? (note.octave + 1) * 12
             : note.octave * 12 + note.semitone;
  const idx = RANGE_SECTION_MIDI_MAX.findIndex((max) => midi <= max);
  return idx === -1 ? 3 : idx;
}

// Build a name set that also includes enharmonic equivalents so that e.g.
// "Fis" in the scale matches "Ges" in the chromatic range display.
function nameSetWithEnharmonics(names) {
  const set = new Set(names);
  for (const name of [...set]) {
    const enh = enharmonicEquivalent(name, 4);
    if (enh) set.add(enh.name);
  }
  return set;
}

export function renderRangeStaff(containerEl, rangeNotes, scaleNotes, chordNoteNames, keySig = 0, isMinor = false) {
  clearEl(containerEl);

  const scaleSet  = nameSetWithEnharmonics(scaleNotes.map((n) => n.name));
  const chordSet  = nameSetWithEnharmonics(chordNoteNames);
  const tonicName = scaleNotes[0]?.name;
  const tonicSet  = nameSetWithEnharmonics(tonicName ? [tonicName] : []);
  const containerWidth = containerEl.clientWidth || 400;
  const fontScale = profileFontScale();
  const noteColWidth = profileNoteColWidth();
  const minWidth = Math.round(rangeNotes.length * noteColWidth) + 60;
  const width = Math.max(containerWidth, minWidth);
  const ls = Math.min(12, Math.max(9, Math.floor(containerWidth / 42))) * fontScale;
  const noteRadius = ls * 0.45;
  const staffTop = ls * 6;
  const totalHeight = staffTop + ls * 4 + ls * 5;
  const clefWidth = ls * 3.5;
  const keySigW = keySignatureWidth(keySig, ls);
  const notesStartX = clefWidth + keySigW;
  const step = (width - notesStartX - ls) / (rangeNotes.length + 1);

  const svg = buildStaffSvg(width, totalHeight, 'Rozsah Alt Saxofonu');
  svg.setAttribute('width', width > containerWidth ? width : '100%');
  containerEl.appendChild(svg);

  // Per-note section background bands with small gap — drawn before staff lines
  const noteGap = Math.max(1.5, step * 0.06);
  rangeNotes.forEach((note, i) => {
    const cx = notesStartX + (i + 1) * step;
    const isChordNote = tonicSet.has(note.name) || chordSet.has(note.name);
    const secIdx = rangeSection(note) + 1;
    const secFill = isChordNote
      ? `var(--section-chord-bg-${secIdx})`
      : `var(--section-bg-${secIdx})`;
    svg.appendChild(svgEl('rect', {
      x: cx - step * 0.5 + noteGap,
      y: 0,
      width: step - noteGap * 2,
      height: totalHeight,
      fill: secFill,
    }));
  });

  drawStaffLinesScaled(svg, clefWidth, width - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(svg, clefWidth - ls * 0.5, staffTop, ls);

  // Ledger lines drawn on top of note heads — cap width so consecutive lines don't merge
  const ledgerHalfW = Math.min(noteRadius * 2.5, step * 0.46);

  const lowestSlot = Math.min(...rangeNotes.map((n) => noteToStaffSlot(n.name, n.octave)));
  const labelY = Math.max(
    staffTop + ls * 4 + ls * 3.5,
    slotToY(lowestSlot, staffTop, ls) + ls * 2.2,
  );

  rangeNotes.forEach((note, i) => {
    const x = notesStartX + (i + 1) * step;
    const isTonic = tonicSet.has(note.name);
    const k = isTonic                 ? 'tonic'
            : chordSet.has(note.name) ? 'chord'
            : scaleSet.has(note.name) ? 'scale'
            :                           'muted';
    const color       = `var(--note-${k})`;
    const ledgerColor = `var(--note-${k}-ledger)`;
    const labelColor  = `var(--note-${k}-label)`;
    const labelBg     = `var(--note-${k}-label-bg, transparent)`;
    const inlineAcc = accidentalType(note.name);
    const enh = enharmonicEquivalent(note.name, note.octave);
    const displayName = (isMinor ? note.name.toLowerCase() : note.name) + note.octave;
    const enhSuffix = enh
      ? ` (=${(isMinor ? enh.name.toLowerCase() : enh.name)}${enh.octave})`
      : '';
    const tooltipLabel = displayName + enhSuffix;

    const g = svgEl('g', { 'data-tooltip': tooltipLabel });
    g.appendChild(svgEl('rect', { x: x - step * 0.5, y: 0, width: step, height: totalHeight, fill: 'transparent' }));
    g.appendChild(svgEl('rect', {
      x: x - step * 0.5 + noteGap, y: 0,
      width: step - noteGap * 2, height: totalHeight,
      fill: 'none', 'data-highlight': '',
    }));
    svg.appendChild(g);

    drawNoteScaled(g, x, note, staffTop, ls, noteRadius, { color, ledgerColor, labelColor, labelBg, ledgerHalfW, showLabel: true, labelY, inlineAcc, lowercase: isMinor });
  });
}
