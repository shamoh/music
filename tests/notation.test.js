import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderStavesWhenFontReady, noteKindColors } from '../docs/js/notation.js';

// Font set whose load resolves at once
const readyFonts = { load: () => Promise.resolve([]) };

// Stand-in for ResizeObserver: remembers the observed elements and lets a test fire a resize
function fakeResizeObserverClass() {
  const instances = [];

  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      instances.push(this);
    }

    observe(element) { this.observed.push(element); }
  }

  return { FakeResizeObserver, instances };
}

describe('renderStavesWhenFontReady', () => {
  it('renders once the font is ready and again on a resize of the observed elements', async () => {
    let renders = 0;
    const { FakeResizeObserver, instances } = fakeResizeObserverClass();
    await renderStavesWhenFontReady(() => { renders += 1; }, ['staff-a', 'staff-b'], { fonts: readyFonts, ResizeObserverClass: FakeResizeObserver });

    assert.equal(renders, 1);
    assert.equal(instances.length, 1);
    assert.deepEqual(instances[0].observed, ['staff-a', 'staff-b']);
    instances[0].callback();
    assert.equal(renders, 2);
  });

  it('falls back to window resize without ResizeObserver', async () => {
    let renders = 0;
    const resizeListeners = [];
    const windowRef = { addEventListener: (type, listener) => { if (type === 'resize') resizeListeners.push(listener); } };
    await renderStavesWhenFontReady(() => { renders += 1; }, ['staff'], { fonts: readyFonts, ResizeObserverClass: undefined, windowRef });

    assert.equal(renders, 1);
    resizeListeners.forEach((listener) => listener());
    assert.equal(renders, 2);
  });

  it('does not render before the font is ready', async () => {
    let renders = 0;
    let fontLoaded;
    const slowFonts = { load: () => new Promise((resolve) => { fontLoaded = resolve; }) };
    const { FakeResizeObserver } = fakeResizeObserverClass();
    const rendered = renderStavesWhenFontReady(() => { renders += 1; }, [], { fonts: slowFonts, ResizeObserverClass: FakeResizeObserver });

    await Promise.resolve();
    assert.equal(renders, 0);
    fontLoaded([]);
    await rendered;
    assert.equal(renders, 1);
  });
});

describe('noteKindColors', () => {
  it('uses the profile variables of the note kind', () => {
    assert.deepEqual(noteKindColors('tonic'), {
      color: 'var(--note-tonic)',
      ledgerColor: 'var(--note-tonic-ledger)',
      labelColor: 'var(--note-tonic-label)',
      labelBg: 'var(--note-tonic-label-bg, transparent)',
    });
    assert.equal(noteKindColors('muted').color, 'var(--note-muted)');
  });
});
