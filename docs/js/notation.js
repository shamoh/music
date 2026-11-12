import { noteToStaffSlot, accidentalType, computeInlineAccidentals, enharmonicEquivalent, notePitchMidi, noteTooltipLines, noteLabelParts } from './music.js';

// Accidental sign in the note label is drawn smaller, raised and not bold —
// the letter is what matters ("F" + small raised "♯").
const LABEL_ACC_FONT_SCALE = 0.7;
const LABEL_ACC_RAISE_EM   = 0.45;

// Label chip (pill) around the note name, in staff spaces relative to the text
// baseline: the top leaves room above the raised accidental.
const LABEL_PILL_TOP_LS    = 1.8;
const LABEL_PILL_BOTTOM_LS = 0.65;

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

// ─── Music font (ScalesMusic = Bravura subset, SMuFL) ────────────────────────
//
// /fonts/ScalesMusic.woff is a subset of Bravura (SIL OFL, renamed as the license
// requires) containing ONLY the glyphs in SMUFL below. Using another glyph means
// adding it to SMUFL and to tools/subset-music-font.py and rebuilding the font
// (a unit test keeps both lists in sync). SMuFL glyphs are scaled so that the
// font size equals the staff height (4 line spacings), and each glyph's baseline
// is its staff position (G clef: the G4 line; accidentals: the note's line/space).
const MUSIC_FONT_NAME = 'ScalesMusic';
const MUSIC_FONT = `${MUSIC_FONT_NAME}, serif`;
export const SMUFL = {
  gClef:        '\uE050',
  noteheadBlack: '\uE0A4',
  flat:         '\uE260',
  natural:      '\uE261',
  sharp:        '\uE262',
  'double-sharp': '\uE263',
};

function musicFontSize(ls) { return ls * 4; }

// Resolves once the music font is loaded, so the first staff render does not
// flash empty boxes (SMuFL code points are missing in fallback fonts).
// Never rejects and never waits longer than timeoutMs (font missing offline,
// FontFaceSet API unavailable) — the staff is then drawn anyway.
// fonts: a FontFaceSet (document.fonts), injectable for tests.
export function whenMusicFontReady(fonts = globalThis.document?.fonts, timeoutMs = 3000) {
  if (!fonts?.load) return Promise.resolve();
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs); });
  const loaded = Promise.resolve()
    .then(() => fonts.load(`16px ${MUSIC_FONT_NAME}`, SMUFL.gClef))
    .catch(() => {});

  return Promise.race([loaded, timeout]).then(() => clearTimeout(timer));
}

// Staff lines start left of the clef (the Bravura G clef is about 2.7 line spacings wide).
const STAFF_START_LS = 1.2;

// G clef: baseline on the G4 line (slot 0), centered at x.
function drawTrebleClefScaled(svg, x, staffTop, ls) {
  svg.appendChild(
    svgText(svgEl('text', {
      x,
      y: slotToY(0, staffTop, ls),
      'font-size': musicFontSize(ls),
      fill: 'currentColor',
      'font-family': MUSIC_FONT,
      'text-anchor': 'middle',
    }), SMUFL.gClef)
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

// Accidental glyph (type: 'sharp' | 'flat' | 'natural' | 'double-sharp') centered
// at cx, baseline on the staff slot. The halo (a stroke in the background color)
// is drawn as a separate underlay copy so the glyph itself stays crisp.
function drawAccidentalGlyph(svg, cx, slot, type, staffTop, ls, fill, halo) {
  const attrs = {
    x: cx,
    y: slotToY(slot, staffTop, ls),
    'font-size': musicFontSize(ls),
    fill,
    'text-anchor': 'middle',
    'font-family': MUSIC_FONT,
  };
  if (halo) svg.appendChild(svgText(svgEl('text', { ...attrs, ...haloAttrs(ls), fill: 'var(--bg)' }), SMUFL[type]));
  svg.appendChild(svgText(svgEl('text', attrs), SMUFL[type]));
}

// Black note head glyph centered at (x, y). The halo is an underlay copy with a
// background-colored stroke. The shine is a gradient ellipse slightly smaller
// than the glyph (the gradient fades out before its edge, so it never spills
// outside the note head).
function drawNoteheadGlyph(svg, x, y, ls, color, halo, shine) {
  const attrs = {
    x,
    y,
    'font-size': musicFontSize(ls),
    fill: color,
    'text-anchor': 'middle',
    'font-family': MUSIC_FONT,
  };
  if (halo) svg.appendChild(svgText(svgEl('text', { ...attrs, ...haloAttrs(ls), fill: 'var(--bg)' }), SMUFL.noteheadBlack));
  svg.appendChild(svgText(svgEl('text', attrs), SMUFL.noteheadBlack));
  if (shine) {
    svg.appendChild(svgEl('ellipse', {
      cx: x, cy: y,
      rx: ls * SHINE_RX_LS, ry: ls * SHINE_RY_LS,
      transform: `rotate(-20, ${x}, ${y})`,
      fill: shine,
    }));
  }
}

// Shine ellipse size, a bit smaller than the Bravura note head (≈1.18 × 1 ls).
const SHINE_RX_LS = 0.5;
const SHINE_RY_LS = 0.36;

// Distance between the note center and the center of its accidental.
const INLINE_ACC_OFFSET_LS = 1.55;

function drawAccidentalScaled(svg, x, slot, type, staffTop, ls, fill = 'currentColor', halo = false) {
  drawAccidentalGlyph(svg, x - ls * INLINE_ACC_OFFSET_LS, slot, type, staffTop, ls, fill, halo);
}

// Key signature accidentals are about one line spacing wide.
const KEY_SIG_SPACING_LS = 1.05;

function keySignatureWidth(keySig, ls) {
  const count = Math.abs(keySig);
  return count > 0 ? count * ls * KEY_SIG_SPACING_LS + ls * 1.3 : 0;
}

function drawKeySignature(svg, keySig, staffTop, ls, startX) {
  if (keySig === 0) return;
  const isSharp = keySig > 0;
  const slots = isSharp ? SHARP_KEY_SIG_SLOTS : FLAT_KEY_SIG_SLOTS;
  const count = Math.abs(keySig);
  const type = isSharp ? 'sharp' : 'flat';
  const spacing = ls * KEY_SIG_SPACING_LS;

  for (let i = 0; i < count; i++) {
    drawAccidentalGlyph(svg, startX + i * spacing + spacing * 0.5, slots[i], type, staffTop, ls, 'currentColor', true);
  }
}

// halo=true: thin outline in the page background color around the note head and
// its accidental, so staff lines stop just short of them.
// shine: url() of the shine gradient — overlay making the note head look slightly convex.
// ledgerLayer: where ledger lines go (the staff layer, below the note heads).
function drawNoteScaled(svg, x, note, staffTop, ls, nr, { color = 'currentColor', ledgerColor = null, labelColor = null, labelBg = null, showLabel = false, lowercase = false, ledgerHalfW = nr * 2.5, inlineAcc = null, labelY = null, pillW = ls * 3.5, halo = false, shine = null, ledgerLayer = svg } = {}) {
  const slot = noteToStaffSlot(note.name, note.octave);
  const y = slotToY(slot, staffTop, ls);
  const resolvedLedger = ledgerColor ?? color;
  const resolvedLabel  = labelColor  ?? color;

  drawNoteheadGlyph(svg, x, y, ls, color, halo, shine);

  // Ledger lines belong to the staff: drawn into ledgerLayer (the staff layer), so
  // they sit at the same height as the staff lines — below the note heads.
  drawLedgerLinesScaled(ledgerLayer, x, slot, staffTop, ls, nr, ledgerHalfW, resolvedLedger);

  if (inlineAcc) drawAccidentalScaled(svg, x, slot, inlineAcc, staffTop, ls, color, halo);

  if (showLabel) {
    const ly = labelY !== null ? labelY : staffTop + ls * 4 + ls * 2.8;
    if (labelBg) {
      svg.appendChild(svgEl('rect', {
        x: x - pillW / 2,
        y: ly - ls * LABEL_PILL_TOP_LS,
        width: pillW,
        height: ls * (LABEL_PILL_TOP_LS + LABEL_PILL_BOTTOM_LS),
        rx: Math.round(ls * 0.4),
        fill: labelBg,
      }));
    }
    const { letter, accidental } = noteLabelParts(note.name, lowercase);
    const label = svgText(svgEl('text', {
      x,
      y: ly,
      'font-size': ls * 1.6,
      fill: resolvedLabel,
      'text-anchor': 'middle',
      'font-family': 'sans-serif',
      'font-weight': 'bold',
    }), letter);
    if (accidental) {
      const accFontSize = ls * 1.6 * LABEL_ACC_FONT_SCALE;
      label.appendChild(svgText(svgEl('tspan', {
        dy: -accFontSize * LABEL_ACC_RAISE_EM,
        'font-size': accFontSize,
        'font-weight': 'normal',
        opacity: 0.8,
      }), accidental));
    }
    svg.appendChild(label);
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

// ─── Plastic look: halo + drop shadow ────────────────────────────────────────

// Halo width and drop shadow geometry, relative to the staff line spacing (ls).
const HALO_WIDTH_LS  = 0.14;
const SHADOW_DX_LS   = 0.06;
const SHADOW_DY_LS   = 0.1;
const SHADOW_BLUR_LS = 0.08;

// Stroke in the page background color painted under the fill (paint-order),
// so the shape keeps its size and only gets a thin separating outline.
function haloAttrs(ls) {
  return {
    stroke: 'var(--bg)',
    'stroke-width': ls * HALO_WIDTH_LS,
    'stroke-linejoin': 'round',
    'paint-order': 'stroke',
  };
}

// Unique def ids — a page can show several staffs at once.
let staffDefsSeq = 0;

// Adds the drop-shadow filter and the note-head shine gradient to the SVG and
// returns their url() references. Shadow color comes from the visual profile
// (--note-shadow). The shine is color-neutral (white highlight top-left, slight
// dark rim bottom-right), laid over the note head in its own color.
function addStaffDefs(svg, ls) {
  const seq = ++staffDefsSeq;
  const id = `note-shadow-${seq}`;
  const shineId = `note-shine-${seq}`;
  const defs = svgEl('defs', {});
  const gradient = svgEl('radialGradient', { id: shineId, cx: '0.4', cy: '0.35', r: '0.7', fx: '0.32', fy: '0.25' });
  for (const [offset, color, opacity] of [[0, '#fff', 0.55], [0.45, '#fff', 0], [0.7, '#000', 0], [1, '#000', 0.3]]) {
    gradient.appendChild(svgEl('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }));
  }
  defs.appendChild(gradient);
  const filter = svgEl('filter', { id, x: '-20%', y: '-20%', width: '140%', height: '140%' });
  filter.appendChild(svgEl('feDropShadow', {
    dx: ls * SHADOW_DX_LS,
    dy: ls * SHADOW_DY_LS,
    stdDeviation: ls * SHADOW_BLUR_LS,
    style: 'flood-color: var(--note-shadow, rgba(0,0,0,0.35))',
  }));
  defs.appendChild(filter);
  svg.appendChild(defs);

  return { shadow: `url(#${id})`, shine: `url(#${shineId})` };
}

// SVG has no z-index — paint order is DOM order. These layers fix the order
// regardless of when an element is drawn:
//   muted notes → staff lines → clef + key signature → scale notes.
// Clef, key signature and scale notes get a drop shadow (one filter per layer,
// not per note); muted notes stay flat. The staff and symbol layers ignore
// pointer events so note tooltips under them still work.
function createStaffLayers(svg, ls) {
  const { shadow, shine } = addStaffDefs(svg, ls);
  const mutedLayer   = svgEl('g', { 'data-layer': 'muted-notes' });
  const staffLayer   = svgEl('g', { 'data-layer': 'staff', 'pointer-events': 'none' });
  const symbolsLayer = svgEl('g', { 'data-layer': 'clef-key-signature', 'pointer-events': 'none', filter: shadow });
  const notesLayer   = svgEl('g', { 'data-layer': 'scale-notes', filter: shadow });
  svg.append(mutedLayer, staffLayer, symbolsLayer, notesLayer);

  return { mutedLayer, staffLayer, symbolsLayer, notesLayer, shine };
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
  const { staffLayer, symbolsLayer, notesLayer, shine } = createStaffLayers(svg, ls);
  drawStaffLinesScaled(staffLayer, ls * STAFF_START_LS, containerWidth - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(symbolsLayer, clefWidth - ls * 0.5, staffTop, ls);
  drawKeySignature(symbolsLayer, keySig, staffTop, ls, clefWidth + ls * 1.2);

  const inlineAccs = computeInlineAccidentals(scaleNotes.map((n) => n.name), keySig);

  const lowestSlot = Math.min(...scaleNotes.map((n) => noteToStaffSlot(n.name, n.octave)));
  const labelY = Math.max(
    staffTop + ls * 4 + ls * 2.8,
    slotToY(lowestSlot, staffTop, ls) + ls * 2.8,
  );

  const pillW = Math.min(ls * 3.5, step * 0.9);
  scaleNotes.forEach((note, i) => {
    const x = notesStartX + (i + 1) * step;
    const k = note.name === tonicName ? 'tonic' : chordSet.has(note.name) ? 'chord' : 'scale';
    const color       = `var(--note-${k})`;
    const ledgerColor = `var(--note-${k}-ledger)`;
    const labelColor  = `var(--note-${k}-label)`;
    const labelBg     = `var(--note-${k}-label-bg, transparent)`;
    drawNoteScaled(notesLayer, x, note, staffTop, ls, noteRadius, { color, ledgerColor, labelColor, labelBg, pillW, showLabel: true, lowercase: isMinor, inlineAcc: inlineAccs[i], labelY, halo: true, shine, ledgerLayer: staffLayer });
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
  const midi = notePitchMidi(note.name, note.octave);
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

// showTonic=false draws no tonic highlight (e.g. the full instrument range).
export function renderRangeStaff(containerEl, rangeNotes, scaleNotes, chordNoteNames, keySig = 0, isMinor = false, { showTonic = true } = {}) {
  clearEl(containerEl);

  const scaleSet  = nameSetWithEnharmonics(scaleNotes.map((n) => n.name));
  const chordSet  = nameSetWithEnharmonics(chordNoteNames);
  const tonicName = showTonic ? scaleNotes[0]?.name : undefined;
  const tonicSet  = nameSetWithEnharmonics(tonicName ? [tonicName] : []);
  const containerWidth = containerEl.clientWidth || 400;
  const fontScale = profileFontScale();
  const noteColWidth = profileNoteColWidth();
  const minWidth = Math.round(rangeNotes.length * noteColWidth) + 60;
  const width = Math.max(containerWidth, minWidth);
  const ls = Math.min(12, Math.max(9, Math.floor(containerWidth / 42))) * fontScale;
  const noteRadius = ls * 0.45;
  const staffTop = ls * 5;
  const totalHeight = staffTop + ls * 4 + ls * 6;
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
    const secIdx = rangeSection(note) + 1;
    const secFill = chordSet.has(note.name)
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

  const { mutedLayer, staffLayer, symbolsLayer, notesLayer, shine } = createStaffLayers(svg, ls);

  drawStaffLinesScaled(staffLayer, ls * STAFF_START_LS, width - ls * 0.5, staffTop, ls);
  drawTrebleClefScaled(symbolsLayer, clefWidth - ls * 0.5, staffTop, ls);

  // Ledger line half-width — capped so lines of neighbouring notes don't merge
  const ledgerHalfW = Math.min(noteRadius * 2.5, step * 0.46);

  const lowestSlot = Math.min(...rangeNotes.map((n) => noteToStaffSlot(n.name, n.octave)));
  const labelY = Math.max(
    staffTop + ls * 4 + ls * 4.5,
    slotToY(lowestSlot, staffTop, ls) + ls * 3.2,
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
    const tooltipLabel = noteTooltipLines(note.name, note.octave, isMinor).join('\n');

    const g = svgEl('g', { 'data-tooltip': tooltipLabel, 'data-note': note.name, 'data-octave': note.octave });
    g.appendChild(svgEl('rect', { x: x - step * 0.5, y: 0, width: step, height: totalHeight, fill: 'transparent' }));
    g.appendChild(svgEl('rect', {
      x: x - step * 0.5 + noteGap, y: 0,
      width: step - noteGap * 2, height: totalHeight,
      fill: 'none', 'data-highlight': '',
    }));
    (k === 'muted' ? mutedLayer : notesLayer).appendChild(g);

    const pillW = Math.min(ls * 3.5, step * 0.9);
    drawNoteScaled(g, x, note, staffTop, ls, noteRadius, { color, ledgerColor, labelColor, labelBg, pillW, ledgerHalfW, showLabel: true, labelY, inlineAcc, lowercase: isMinor, halo: k !== 'muted', shine: k !== 'muted' ? shine : null, ledgerLayer: staffLayer });
  });
}
