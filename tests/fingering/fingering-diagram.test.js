import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderKeyDiagram, diagramBounds } from '../../docs/js/fingering-diagram.js';
import { SAXOPHONE_ALTO } from '../../docs/js/instrument/saxophone/alto/instrument.js';

// Minimal fake instrument — the renderer must not depend on any real instrument
const TOY = {
  viewBox: { width: 100, height: 200 },
  decorations: [
    { type: 'rect', className: 'body', x: 10, y: 10, width: 20, height: 100, rx: 10 },
    { type: 'line', className: 'split', x1: 0, y1: 50, x2: 40, y2: 50 },
  ],
  keys: [
    { id: 'a', label: '1', shape: 'circle', x: 20, y: 20, w: 10, h: 10, labelPos: 'inside' },
    { id: 'b', label: 'B', shape: 'pill', x: 20, y: 40, w: 12, h: 6, labelPos: 'right' },
    { id: 'c', label: 'C', shape: 'pill', x: 20, y: 60, w: 12, h: 6, labelPos: 'below' },
  ],
};

describe('renderKeyDiagram', () => {
  it('draws every key exactly once', () => {
    const svg = renderKeyDiagram(TOY);
    for (const k of TOY.keys) assert.equal(svg.split(`data-key="${k.id}"`).length - 1, 1, k.id);
  });

  it('draws circles and pills with the right geometry', () => {
    const svg = renderKeyDiagram(TOY);
    assert.match(svg, /<circle class="key" data-key="a" cx="20" cy="20" r="5"\/>/);
    assert.match(svg, /<rect class="key" data-key="b" x="14" y="37" width="12" height="6" rx="3"\/>/);
  });

  it('draws decorations from the instrument', () => {
    const svg = renderKeyDiagram(TOY);
    assert.match(svg, /<rect class="body" x="10" y="10" width="20" height="100" rx="10"\/>/);
    assert.match(svg, /<line class="split" x1="0" y1="50" x2="40" y2="50"\/>/);
  });

  it('works without decorations', () => {
    const svg = renderKeyDiagram({ ...TOY, decorations: undefined });
    assert.doesNotMatch(svg, /class="body"/);
  });

  it('marks pressed and highlighted keys', () => {
    const svg = renderKeyDiagram(TOY, ['a'], { highlight: ['b'] });
    assert.match(svg, /class="key pressed\s*" data-key="a"/);
    assert.match(svg, /class="key\s+highlight" data-key="b"/);
    assert.match(svg, /class="key" data-key="c"/);
  });

  it('ignores unknown pressed ids', () => {
    assert.equal(renderKeyDiagram(TOY, ['nope']), renderKeyDiagram(TOY));
  });

  it('draws labels only when requested, inverted inside pressed keys', () => {
    assert.doesNotMatch(renderKeyDiagram(TOY), /<text/);
    const svg = renderKeyDiagram(TOY, ['a'], { showLabels: true });
    assert.match(svg, /class="key-label inside pressed"[^>]*>1</);
    assert.match(svg, /text-anchor="start"[^>]*>B</);
    assert.match(svg, /dominant-baseline="hanging">C</);
  });

  it('keeps the viewBox aspect ratio for the requested width', () => {
    assert.match(renderKeyDiagram(TOY, [], { width: 50 }), /width="50" height="100"/);
  });
});

describe('diagramBounds', () => {
  it('covers keys and decorations', () => {
    // body rect 10..30 x 10..110, split line 0..40 at y 50, keys within
    assert.deepEqual(diagramBounds(TOY), { x: 0, y: 10, width: 40, height: 100 });
  });

  it('grows by the padding on every side', () => {
    assert.deepEqual(diagramBounds(TOY, 2), { x: -2, y: 8, width: 44, height: 104 });
  });

  it('works with keys only', () => {
    assert.deepEqual(diagramBounds({ ...TOY, decorations: undefined }), { x: 14, y: 15, width: 12, height: 48 });
  });

  it('fits inside the full viewBox of the alto sax', () => {
    const b = diagramBounds(SAXOPHONE_ALTO);
    assert.ok(b.x >= 0 && b.y >= 0);
    assert.ok(b.x + b.width <= SAXOPHONE_ALTO.viewBox.width && b.y + b.height <= SAXOPHONE_ALTO.viewBox.height);
    assert.ok(b.width < SAXOPHONE_ALTO.viewBox.width * 0.8, 'the label margins are dropped');
  });
});

describe('renderKeyDiagram — crop', () => {
  it('uses the full viewBox by default', () => {
    assert.match(renderKeyDiagram(TOY), /viewBox="0 0 100 200"/);
  });

  it('crops the viewBox to the drawing and keeps the aspect ratio', () => {
    const svg = renderKeyDiagram(TOY, [], { crop: true, width: 46 });
    assert.match(svg, /viewBox="-3 7 46 106"/);
    assert.match(svg, /width="46" height="106"/);
  });
});
