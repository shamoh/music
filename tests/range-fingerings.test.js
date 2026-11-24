import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRangeFingerings, outsideScaleText, annotateOutsideNotes } from '../docs/js/range-fingerings.js';
import { OUTSIDE_SCALE_PREFIX, FULL_RANGE_ID } from '../docs/js/range-names.js';
import { SAXOPHONE_ALTO } from '../docs/js/instrument/saxophone/alto/instrument.js';
import { buildAltSaxRange, generateScale, rangeScaleNotes } from '../docs/js/music.js';

// Element with just what the chart code uses; querySelectorAll finds descendants by class
// (".a" or ".a.b").
function element(tagName = 'div') {
  const toggled = new Set();
  const attrs = {};

  return {
    tagName,
    className: '',
    children: [],
    dataset: {},
    style: { setProperty() {} },
    html: [],
    hidden: false,
    textContent: '',
    attrs,
    toggled,
    classList: { toggle: (name, on) => (on ? toggled.add(name) : toggled.delete(name)) },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    setAttribute(name, value) { attrs[name] = value; },
    insertAdjacentHTML(_where, html) { this.html.push(html); },
    querySelectorAll(selector) {
      const wanted = selector.split('.').filter(Boolean);
      const found = [];
      const visit = (el) => {
        for (const child of el.children) {
          const classes = child.className.split(' ');
          if (wanted.every((c) => classes.includes(c))) found.push(child);
          visit(child);
        }
      };
      visit(this);

      return found;
    },
  };
}

function setup({ scaleId = FULL_RANGE_ID, selected = null, scaleNotes = [] } = {}) {
  const cache = {};
  const doc = { createElement: element, createTextNode: (text) => ({ text }), querySelectorAll: () => [] };
  const $ = (id) => (cache[id] ??= element());
  const state = { scaleId, scaleNotes, columnNote: null };
  const fingerings = createRangeFingerings({ doc, $, state, selectedNote: () => selected });

  return { ...fingerings, $, state, chart: $('fingering-chart'), panel: $('note-fingerings') };
}

const rowsOf = (chart) => chart.children[1].children.filter((c) => c.className === 'fingering-row');
const headers = (chart) => chart.children[1].children.filter((c) => c.className.startsWith('fingering-row fingering-header'));
const cellsOf = (chart) => rowsOf(chart).flatMap((row) => row.children).filter((c) => c.className === 'fingering-cell');
const slotsOf = (chart, kind) => rowsOf(chart).flatMap((row) => row.children).filter((c) => c.className === `fingering-slot ${kind}`);

describe('renderFingeringChart: full range', () => {
  it('draws a titled grid with a name row above and below', () => {
    const { renderFingeringChart, chart } = setup();
    renderFingeringChart();
    assert.equal(chart.hidden, false);
    assert.equal(chart.children[0].textContent, 'Hmaty');
    assert.deepEqual(headers(chart).map((h) => h.className), ['fingering-row fingering-header top', 'fingering-row fingering-header bottom']);
  });
  it('shows a fingering cell for every fingering of the instrument', () => {
    const { renderFingeringChart, chart } = setup();
    renderFingeringChart();
    assert.equal(cellsOf(chart).length, SAXOPHONE_ALTO.fingerings.length);
    const cell = cellsOf(chart)[0];
    assert.ok(cell.dataset.note && cell.dataset.octave);
    assert.match(cell.attrs['aria-label'], /^Hmat /);
    assert.match(cell.style.background, /^var\(--section-bg-\d+\)$/);
    assert.equal(cell.html.length, 1);
  });
  it('fills every row to the full width, the rest as grey slots outside the instrument', () => {
    const { renderFingeringChart, chart } = setup();
    renderFingeringChart();
    const widths = new Set(rowsOf(chart).map((row) => row.children.length));
    assert.equal(widths.size, 1);
    const missing = slotsOf(chart, 'missing');
    assert.ok(missing.length > 0);
    assert.equal(missing[0].attrs['aria-hidden'], 'true');
  });
  it('names the columns with all names of their notes and boxes nothing', () => {
    const { renderFingeringChart, chart } = setup();
    renderFingeringChart();
    const top = headers(chart)[0];
    assert.ok(top.children.length > 0);
    assert.ok(top.children.some((cell) => cell.children.length > 1));
    assert.ok(top.children.every((cell) => !/tonic|chord/.test(cell.className)));
    assert.match(top.children[0].attrs['aria-label'], /^Zvýraznit hmaty tónu /);
  });
});

describe('renderFingeringChart: scale', () => {
  const scale = generateScale('C-major', 4, 'natural');
  const range = buildAltSaxRange(false);
  const scaleNotes = rangeScaleNotes(range, scale);
  const render = (extra = {}) => {
    const page = setup({ scaleId: 'C-major', scaleNotes });
    page.renderFingeringChart(scaleNotes, 'C', ['C', 'E', 'G'], false, range, false);
    Object.assign(page, extra);

    return page;
  };

  it('titles the chart for the scale and shows only the fingerings of its notes', () => {
    const { chart } = render();
    assert.equal(chart.children[0].textContent, 'Hmaty tónů stupnice');
    assert.equal(cellsOf(chart).length, scaleNotes.length);
  });
  it('leaves clickable empty slots for notes outside the scale, named in the range spelling', () => {
    const { chart } = render();
    const unused = slotsOf(chart, 'unused');
    assert.ok(unused.length > 0);
    assert.equal(unused[0].tagName, 'button');
    assert.match(unused[0].attrs['aria-label'], /\(mimo stupnici\)$/);
    assert.ok(unused[0].dataset.note && unused[0].dataset.octave);
  });
  it('boxes the tonic and the chord notes in the column names', () => {
    const { chart } = render();
    const roles = Object.fromEntries(headers(chart)[0].children.map((cell) => [cell.dataset.semitone, cell.className]));
    assert.match(roles[0], /tonic/);
    assert.match(roles[4], /chord/);
    assert.match(roles[7], /chord/);
    assert.doesNotMatch(roles[2] ?? '', /tonic|chord/);
  });
  it('writes the column names of a minor scale lowercase', () => {
    const page = setup({ scaleId: 'a-minor' });
    const minor = rangeScaleNotes(range, generateScale('a-minor', 4, 'natural'));
    page.renderFingeringChart(minor, 'A', ['A', 'C', 'E'], true, range, false);
    const labels = headers(page.chart)[0].children.map((cell) => cell.attrs['aria-label']);
    assert.ok(labels.some((label) => label.endsWith('tónu a')));
  });
  it('names the fingerings with all names of the note when asked', () => {
    const page = setup({ scaleId: 'C-major' });
    page.renderFingeringChart(scaleNotes, 'C', [], false, range, true);
    assert.ok(cellsOf(page.chart).some((cell) => cell.attrs['aria-label'].includes(' / ')));
  });
});

describe('selected note', () => {
  it('marks the fingering and the empty slot of the selected pitch', () => {
    const page = setup({ selected: { name: 'C', octave: 4 } });
    page.renderFingeringChart();
    const selected = cellsOf(page.chart).filter((cell) => cell.toggled.has('selected'));
    assert.deepEqual(selected.map((cell) => [cell.dataset.note, cell.dataset.octave]), [['C', 4]]);
    assert.equal(selected[0].attrs['aria-pressed'], 'true');
  });
  it('marks nothing without a selection', () => {
    const page = setup();
    page.renderFingeringChart();
    assert.equal(cellsOf(page.chart).filter((cell) => cell.toggled.has('selected')).length, 0);
  });
  it('lights the cells and the column name of the highlighted column note', () => {
    const page = setup();
    page.state.columnNote = 0;
    page.renderFingeringChart();
    const lit = cellsOf(page.chart).filter((cell) => cell.toggled.has('same-note'));
    assert.ok(lit.length > 1);
    assert.ok(headers(page.chart)[0].children.some((cell) => cell.toggled.has('active')));
  });
});

describe('renderNoteFingerings', () => {
  const withAlternatives = SAXOPHONE_ALTO.fingerings.find((f) => f.variants.length > 1);

  it('hides the panel without a selected note or fingering', () => {
    const page = setup();
    page.renderNoteFingerings();
    assert.equal(page.panel.hidden, true);
    assert.equal(page.panel.children.length, 0);
  });
  it('shows the basic fingering and the alternatives of the selected note', () => {
    const page = setup({ selected: { name: withAlternatives.note, octave: withAlternatives.octave } });
    page.renderNoteFingerings();
    assert.equal(page.panel.hidden, false);
    assert.equal(page.panel.children[0].textContent, 'Hmaty tónu ');
    const groups = page.panel.children[1].children;
    assert.deepEqual(groups.map((g) => g.children[0].textContent), ['Základní', 'Alternativní']);
    const alternatives = groups[1].children[1].children;
    assert.equal(alternatives.length, withAlternatives.variants.length - 1);
    assert.equal(alternatives[0].innerHTML.includes('<svg'), true);
  });
  it('says where a note outside the scale lies', () => {
    const scale = rangeScaleNotes(buildAltSaxRange(false), generateScale('C-major', 4, 'natural'));
    const outside = SAXOPHONE_ALTO.fingerings.find((f) => f.note === 'Cis');
    const page = setup({ scaleId: 'C-major', scaleNotes: scale, selected: { name: outside.note, octave: outside.octave } });
    page.renderNoteFingerings();
    const extra = page.panel.children.find((c) => c.className.includes('note-fingerings-outside'));
    assert.ok(extra.textContent.startsWith(OUTSIDE_SCALE_PREFIX));
  });
});

describe('outside-scale text', () => {
  const scale = rangeScaleNotes(buildAltSaxRange(false), generateScale('C-major', 4, 'natural'));

  it('tells between which scale notes a note lies', () => {
    const text = outsideScaleText(scale, { name: 'Fis', octave: 4 }, false);
    assert.match(text, /^mimo stupnici · /);
  });
  it('is just the prefix when the note has no neighbours', () => {
    assert.equal(outsideScaleText([], { name: 'Fis', octave: 4 }, false), OUTSIDE_SCALE_PREFIX);
  });
  it('adds the text to the tooltips of the grey notes of a staff', () => {
    const note = { dataset: { note: 'Fis', octave: '4', tooltip: 'F♯4' } };
    const staff = { querySelectorAll: (selector) => (selector === '[data-layer="muted-notes"] [data-note]' ? [note] : []) };
    annotateOutsideNotes(staff, scale, false);
    assert.match(note.dataset.tooltip, /^F♯4\nmimo stupnici/);
  });
});
