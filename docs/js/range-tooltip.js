// Note tooltip of the saxophone range page: the multi-line label of a staff note shown at the
// pointer. Works on any document (tests pass a stand-in).

import { splitOctaveNumbers } from './music.js';
import { OUTSIDE_SCALE_PREFIX } from './range-names.js';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

// Fills the tooltip with the multi-line label; octave numbers get a muted span
// (the note name matters more than its octave).
// One block per line; the "mimo stupnici …" line (annotateOutsideNotes) is a note about
// the tone, not one of its names — drawn smaller and muted.

export function setTooltipContent(el, label, doc = globalThis.doc) {
  el.replaceChildren();
  for (const line of label.split('\n')) {
    const lineEl = doc.createElement('div');
    if (line.startsWith(OUTSIDE_SCALE_PREFIX)) {
      lineEl.className = 'note-extra';
      lineEl.textContent = line;
    } else {
      for (const { text, octave } of splitOctaveNumbers(line)) {
        lineEl.appendChild(octave
          ? Object.assign(doc.createElement('span'), { className: 'note-octave', textContent: text })
          : doc.createTextNode(text));
      }
    }
    el.appendChild(lineEl);
  }
}

export function initTooltip(doc = globalThis.doc) {
  const rangeEl = doc.querySelector('.range-section');
  if (!rangeEl) return;

  const tooltip = doc.createElement('div');
  tooltip.className = 'note-tooltip';
  tooltip.hidden = true;
  doc.body.appendChild(tooltip);

  let timer = null;
  let activeHighlight = null;

  function clearHighlight() {
    if (activeHighlight) { activeHighlight.setAttribute('fill', 'none'); activeHighlight = null; }
  }

  function hide() { tooltip.hidden = true; clearHighlight(); }

  function show(e) {
    const g = e.target.closest('[data-tooltip]');
    const isTouch = e.pointerType === 'touch';
    if (g) {
      setTooltipContent(tooltip, g.dataset.tooltip, doc);
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top  = (e.clientY - (isTouch ? 60 : 0)) + 'px';
      tooltip.hidden = false;
      clearHighlight();
      activeHighlight = g.querySelector('[data-highlight]');
      if (activeHighlight) activeHighlight.setAttribute('fill', 'rgba(255,255,255,0.22)');
      if (isTouch) { clearTimeout(timer); timer = setTimeout(hide, 5000); }
    } else if (e.type === 'pointermove') {
      hide();
    }
  }

  rangeEl.addEventListener('pointermove', show);
  rangeEl.addEventListener('pointerdown', show);
  rangeEl.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hide(); });
  rangeEl.addEventListener('pointerup',   (e) => { if (e.pointerType !== 'touch') setTimeout(hide, 1200); });
}
