// Variant switcher, heading and subtitles of the saxophone range page.

import { generateScale, splitOctaveNumbers, scaleStartOctave, scaleNoteLabels } from './music.js';
import { VALID_TYPES, TYPE_LABELS, FULL_RANGE_LABEL, SCALE_TYPE_GROUP_LABEL, SCALE_TYPE_ORDER, scaleName, pairName, makeHash } from './range-names.js';

export function createRangeHeader({ doc, $, visibleScales, renderHeading }) {
  // ─── Type sub-nav ─────────────────────────────────────────────────────────────

  // Variant switcher: Aiolská | Harmonická | Melodická. On touch devices it has ‹ / ›
  // buttons at its sides (CSS) — the previous / next variant, disabled at the ends —
  // which also show that the switcher takes a swipe.
  function updateTypeNav(entry, currentType) {
    const nav = $('type-nav');
    if (entry?.type !== 'minor') {
      nav.hidden = true;
      return;
    }
    nav.hidden = false;
    nav.replaceChildren();
    const currentIndex = VALID_TYPES.indexOf(currentType);
    nav.appendChild(makeVariantArrow({ step: -1, disabled: currentIndex === 0 }));
    VALID_TYPES.forEach((type, i) => {
      if (i > 0) {
        nav.appendChild(Object.assign(doc.createElement('span'), { className: 'type-nav-sep' }));
      }
      if (type === currentType) {
        nav.appendChild(Object.assign(doc.createElement('strong'), { textContent: TYPE_LABELS[type] }));
      } else {
        const link = Object.assign(doc.createElement('a'), { href: makeHash(entry, type), textContent: TYPE_LABELS[type] });
        link.dataset.variantStep = String(i - currentIndex);
        nav.appendChild(link);
      }
    });
    nav.appendChild(makeVariantArrow({ step: 1, disabled: currentIndex === VALID_TYPES.length - 1 }));
  }

  function makeVariantArrow({ step, disabled }) {
    const button = Object.assign(doc.createElement('button'), {
      type: 'button',
      className: 'type-nav-arrow',
      textContent: step < 0 ? '‹' : '›',
      disabled,
    });
    button.dataset.variantStep = String(step);
    button.setAttribute('aria-label', step < 0 ? 'Předchozí varianta' : 'Další varianta');

    return button;
  }

  // ─── Heading: ‹ previous | current | next › ──────────────────────────────────

  // Previous / next scale in the order of the scale select (scale-nav.js); the full range
  // has only its title. The hints about switching don't apply there.
  function updateScaleHeading(entry) {
    renderHeading(scaleNavHeading(), {
      current: entry ?? null,
      scales: visibleScales(),
      typeOrder: SCALE_TYPE_ORDER,
      scaleLabel: pairName,
      groupLabel: (type) => SCALE_TYPE_GROUP_LABEL[type],
      href: (target) => makeHash(target, 'natural'),
      emptyTitle: FULL_RANGE_LABEL,
    });
    const isMinor = entry?.type === 'minor';
    $('touch-hint').hidden = !entry;
    $('touch-hint-variant').hidden = !isMinor;
    $('scale-switch-key-hint').hidden = !entry;
    $('variant-switch-key-hint').hidden = !isMinor;
  }

  const scaleNavHeading = () => ({ root: $('scale-heading'), prev: $('scale-nav-prev'), title: $('range-title'), next: $('scale-nav-next') });

  // ─── Subtitle: "B dur: B3 C4 … B4 (2♭ : be, es)" ─────────────────────────────

  // "**Fis dur**: F♯ G♯ A♯ H C♯ D♯ E♯ F♯" — bold name, then the text.
  // Octave numbers in the text (full range bounds) are drawn as a smaller subscript.
  function setSubtitle(el, name, text, suffix = '') {
    el.replaceChildren();
    el.appendChild(Object.assign(doc.createElement('strong'), { textContent: name }));
    el.appendChild(doc.createTextNode(': '));
    for (const part of splitOctaveNumbers(text)) {
      el.appendChild(part.octave
        ? Object.assign(doc.createElement('span'), { className: 'range-subtitle-octave', textContent: part.text })
        : doc.createTextNode(part.text));
    }
    if (suffix) el.appendChild(doc.createTextNode(suffix));
  }

  // "**Fis dur**: F♯ · G♯ · …" — every note is a button that highlights that note in
  // every octave (staves, fingerings), like a fingering column name.
  function setScaleSubtitle(el, entry, variant) {
    const notes = generateScale(entry.id, scaleStartOctave(entry.id), variant);
    el.replaceChildren();
    el.appendChild(Object.assign(doc.createElement('strong'), { textContent: scaleName(entry) }));
    el.appendChild(doc.createTextNode(': '));
    scaleNoteLabels(notes, entry.type === 'minor').forEach(({ label, semitone }, i) => {
      if (i > 0) el.appendChild(doc.createTextNode(' · '));
      const note = Object.assign(doc.createElement('button'), { type: 'button', className: 'subtitle-note', textContent: label });
      note.dataset.semitone = semitone;
      el.appendChild(note);
    });
  }

  return { scaleNavHeading, updateTypeNav, updateScaleHeading, setSubtitle, setScaleSubtitle };
}
