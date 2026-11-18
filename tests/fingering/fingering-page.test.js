import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fingeringGridHtml } from '../../prototypes/fingering/fingering-page.js';

const TOY = {
  viewBox: { width: 100, height: 50 },
  keys: [
    { id: 'a', label: 'A', group: 'g', shape: 'circle', x: 20, y: 10, w: 10, h: 10, labelPos: 'inside' },
    { id: 'b', label: 'B', group: 'g', shape: 'circle', x: 50, y: 10, w: 10, h: 10, labelPos: 'inside' },
  ],
  fingerings: [
    { note: 'G', octave: 4, variants: [{ id: 'std', name: 'Základní', keys: ['a'] }] },
    { note: 'B', octave: 4, variants: [
      { id: 'basic', name: 'Basic', keys: ['a'] },
      { id: 'alt1', name: 'Alt one', keys: ['b'], verify: true },
      { id: 'alt2', name: 'Alt two', keys: ['a', 'b'] },
    ] },
  ],
};

const count = (html, re) => (html.match(re) ?? []).length;

describe('fingeringGridHtml', () => {
  it('renders one card per note with all variants by default', () => {
    const html = fingeringGridHtml(TOY);
    assert.equal(count(html, /class="note-card/g), 2);
    assert.equal(count(html, /class="variant"/g), 4);
    assert.match(html, /Alt one/);
    assert.match(html, /Alt two/);
    assert.match(html, /class="verify"/);
  });

  it('marks only cards with several shown variants as multi', () => {
    const html = fingeringGridHtml(TOY);
    assert.equal(count(html, /note-card multi/g), 1);
  });

  it('shows just the first (basic) variant with basicOnly', () => {
    const html = fingeringGridHtml(TOY, { basicOnly: true });
    assert.equal(count(html, /class="note-card/g), 2);
    assert.equal(count(html, /class="variant"/g), 2);
    assert.match(html, /Basic/);
    assert.doesNotMatch(html, /Alt one|Alt two|class="verify"/);
    assert.equal(count(html, /note-card multi/g), 0);
  });

  it('titles cards with all spellings of the note', () => {
    assert.match(fingeringGridHtml(TOY), /B4 <span class="alt">· Ais4<\/span>/);
  });
});
