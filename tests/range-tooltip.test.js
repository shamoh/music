import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { initTooltip, setTooltipContent } from '../docs/js/range-tooltip.js';
import { fakeEventTarget } from './helpers/fake-dom.js';

function element(tagName = 'div') {
  return { tagName, children: [], style: {}, hidden: false, className: '', textContent: '', appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; } };
}

const doc = (rangeEl) => ({
  createElement: element,
  createTextNode: (text) => ({ text }),
  querySelector: (selector) => (selector === '.range-section' ? rangeEl : null),
  body: element('body'),
});

describe('setTooltipContent', () => {
  it('writes one block per line and mutes the octave numbers', () => {
    const el = element();
    setTooltipContent(el, 'C♯4\nD♭4', doc());
    assert.equal(el.children.length, 2);
    const octave = el.children[0].children.find((c) => c.className === 'note-octave');
    assert.equal(octave.textContent, '4');
  });
  it('draws the "mimo stupnici" line smaller and muted, as plain text', () => {
    const el = element();
    setTooltipContent(el, 'F4\nmimo stupnici · mezi E a F♯', doc());
    assert.equal(el.children[1].className, 'note-extra');
    assert.equal(el.children[1].textContent, 'mimo stupnici · mezi E a F♯');
  });
  it('replaces the previous content', () => {
    const el = element();
    setTooltipContent(el, 'A4', doc());
    setTooltipContent(el, 'B4', doc());
    assert.equal(el.children.length, 1);
  });
});

describe('initTooltip', () => {
  const noteTarget = (tooltip) => {
    const highlight = { fill: null, setAttribute(name, value) { this.fill = value; } };
    const g = { dataset: { tooltip }, querySelector: (selector) => (selector === '[data-highlight]' ? highlight : null) };

    return { highlight, target: { closest: (selector) => (selector === '[data-tooltip]' ? g : null) } };
  };
  const emptyTarget = { closest: () => null };

  it('does nothing without a range section', () => {
    const d = doc(null);
    initTooltip(d);
    assert.equal(d.body.children.length, 0);
  });
  it('adds a hidden tooltip to the body', () => {
    const d = doc(fakeEventTarget());
    initTooltip(d);
    assert.equal(d.body.children[0].className, 'note-tooltip');
    assert.equal(d.body.children[0].hidden, true);
  });
  it('shows the label at the pointer and lights the note', () => {
    const range = fakeEventTarget();
    const d = doc(range);
    initTooltip(d);
    const { highlight, target } = noteTarget('G4');
    range.dispatch('pointermove', { type: 'pointermove', target, clientX: 30, clientY: 50, pointerType: 'mouse' });
    const tooltip = d.body.children[0];
    assert.equal(tooltip.hidden, false);
    assert.deepEqual([tooltip.style.left, tooltip.style.top], ['30px', '50px']);
    assert.equal(highlight.fill, 'rgba(255,255,255,0.22)');
  });
  it('moving to another note clears the first highlight; leaving the notes hides the tooltip', () => {
    const range = fakeEventTarget();
    const d = doc(range);
    initTooltip(d);
    const first = noteTarget('G4');
    const second = noteTarget('A4');
    range.dispatch('pointermove', { type: 'pointermove', target: first.target, clientX: 0, clientY: 0 });
    range.dispatch('pointermove', { type: 'pointermove', target: second.target, clientX: 0, clientY: 0 });
    assert.equal(first.highlight.fill, 'none');
    range.dispatch('pointermove', { type: 'pointermove', target: emptyTarget, clientX: 0, clientY: 0 });
    assert.equal(d.body.children[0].hidden, true);
    assert.equal(second.highlight.fill, 'none');
  });
  it('a touch shows the tooltip higher and hides it after 5 seconds', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const range = fakeEventTarget();
      const d = doc(range);
      initTooltip(d);
      range.dispatch('pointerdown', { type: 'pointerdown', target: noteTarget('G4').target, clientX: 10, clientY: 100, pointerType: 'touch' });
      const tooltip = d.body.children[0];
      assert.equal(tooltip.style.top, '40px');
      mock.timers.tick(4999);
      assert.equal(tooltip.hidden, false);
      mock.timers.tick(1);
      assert.equal(tooltip.hidden, true);
    } finally {
      mock.timers.reset();
    }
  });
  it('a pointer leaving hides the tooltip, a touch leaving does not; pointerup hides it after a moment', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const range = fakeEventTarget();
      const d = doc(range);
      initTooltip(d);
      const tooltip = d.body.children[0];
      range.dispatch('pointermove', { type: 'pointermove', target: noteTarget('G4').target, clientX: 0, clientY: 0, pointerType: 'mouse' });
      range.dispatch('pointerleave', { pointerType: 'touch' });
      assert.equal(tooltip.hidden, false);
      range.dispatch('pointerup', { pointerType: 'mouse' });
      mock.timers.tick(1200);
      assert.equal(tooltip.hidden, true);
      range.dispatch('pointermove', { type: 'pointermove', target: noteTarget('G4').target, clientX: 0, clientY: 0, pointerType: 'mouse' });
      range.dispatch('pointerleave', { pointerType: 'mouse' });
      assert.equal(tooltip.hidden, true);
    } finally {
      mock.timers.reset();
    }
  });
});
