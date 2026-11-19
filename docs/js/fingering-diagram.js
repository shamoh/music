// Renders an instrument key diagram as an SVG string (no DOM).
// Instrument-agnostic: geometry comes from the instrument descriptor
// ({ viewBox, decorations, keys }), see instrument/<family>/<instrument>/instrument.js.

const STYLE = `
  .body { fill: none; stroke: var(--fingering-body, #c8c8c8); stroke-width: 1.5; }
  .split { stroke: var(--fingering-body, #c8c8c8); stroke-width: 1.5; stroke-dasharray: 4 4; }
  .key { fill: var(--fingering-key-open, #fff); stroke: var(--fingering-key-stroke, #111); stroke-width: 2; }
  .key.pressed { fill: var(--fingering-key-pressed, #111); }
  .key.highlight { stroke: var(--fingering-key-highlight, #e0457b); stroke-width: 3.5; }
  .key-label { font: 600 10px system-ui, sans-serif; fill: var(--fingering-label, #444); }
  .key-label.inside { font-size: 14px; fill: var(--fingering-key-stroke, #111); }
  .key-label.inside.pressed { fill: var(--fingering-key-open, #fff); }
`;

const LABEL_GAP = 4;
const CROP_PADDING = 3;   // room for the key outline (stroke) around the cropped drawing

function decoration(d) {
  if (d.type === 'line') {
    return `<line class="${d.className}" x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}"/>`;
  }

  return `<rect class="${d.className}" x="${d.x}" y="${d.y}" width="${d.width}" height="${d.height}" rx="${d.rx ?? 0}"/>`;
}

function keyShape(key, classes) {
  const cls = `key ${classes}`.trim();
  if (key.shape === 'circle') {
    return `<circle class="${cls}" data-key="${key.id}" cx="${key.x}" cy="${key.y}" r="${key.w / 2}"/>`;
  }
  const rx = Math.min(key.w, key.h) / 2;

  return `<rect class="${cls}" data-key="${key.id}" x="${key.x - key.w / 2}" y="${key.y - key.h / 2}" `
    + `width="${key.w}" height="${key.h}" rx="${rx}"/>`;
}

function keyLabel(key, isPressed) {
  const halfW = key.w / 2;
  const halfH = key.h / 2;

  switch (key.labelPos) {
    case 'inside':
      return `<text class="key-label inside${isPressed ? ' pressed' : ''}" x="${key.x}" y="${key.y}" `
        + `text-anchor="middle" dominant-baseline="central">${key.label}</text>`;
    case 'left':
      return `<text class="key-label" x="${key.x - halfW - LABEL_GAP}" y="${key.y}" `
        + `text-anchor="end" dominant-baseline="central">${key.label}</text>`;
    case 'right':
      return `<text class="key-label" x="${key.x + halfW + LABEL_GAP}" y="${key.y}" `
        + `text-anchor="start" dominant-baseline="central">${key.label}</text>`;
    case 'above':
      return `<text class="key-label" x="${key.x}" y="${key.y - halfH - LABEL_GAP}" `
        + `text-anchor="middle">${key.label}</text>`;
    default:
      return `<text class="key-label" x="${key.x}" y="${key.y + halfH + LABEL_GAP}" `
        + `text-anchor="middle" dominant-baseline="hanging">${key.label}</text>`;
  }
}

// Bounding box { x, y, width, height } of the keys and decorations (labels are not
// included), grown by `padding` on every side.
export function diagramBounds(instrument, padding = 0) {
  const boxes = instrument.keys.map((k) => [k.x - k.w / 2, k.y - k.h / 2, k.x + k.w / 2, k.y + k.h / 2]);
  for (const d of instrument.decorations ?? []) {
    boxes.push(d.type === 'line'
      ? [Math.min(d.x1, d.x2), Math.min(d.y1, d.y2), Math.max(d.x1, d.x2), Math.max(d.y1, d.y2)]
      : [d.x, d.y, d.x + d.width, d.y + d.height]);
  }
  const x = Math.min(...boxes.map((b) => b[0])) - padding;
  const y = Math.min(...boxes.map((b) => b[1])) - padding;

  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b[2])) + padding - x,
    height: Math.max(...boxes.map((b) => b[3])) + padding - y,
  };
}

// instrument: descriptor with { viewBox, decorations, keys }
// pressed:    array of key ids drawn as pressed (filled)
// highlight:  array of key ids drawn with an accent outline
// showLabels: draw key labels
// width:      rendered width in px (height follows the aspect ratio)
// crop:       drop the empty margins of the viewBox (kept for labels) — the keys fill
//             the image; meant for small diagrams without labels
export function renderKeyDiagram(instrument, pressed = [], { highlight = [], showLabels = false, width = 120, crop = false } = {}) {
  const pressedSet = new Set(pressed);
  const highlightSet = new Set(highlight);
  const { x: vx, y: vy, width: vw, height: vh } = crop
    ? diagramBounds(instrument, CROP_PADDING)
    : { x: 0, y: 0, ...instrument.viewBox };
  const height = Math.round(width * vh / vw);

  const keys = instrument.keys.map(key => {
    const isPressed = pressedSet.has(key.id);
    const classes = [isPressed ? 'pressed' : '', highlightSet.has(key.id) ? 'highlight' : ''].join(' ');
    const shape = keyShape(key, classes);

    return showLabels ? shape + keyLabel(key, isPressed) : shape;
  });

  return `<svg class="key-diagram" xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" `
    + `width="${width}" height="${height}" role="img">`
    + `<style>${STYLE}</style>`
    + (instrument.decorations ?? []).map(decoration).join('')
    + keys.join('')
    + `</svg>`;
}
