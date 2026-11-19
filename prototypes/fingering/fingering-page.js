// Instrument-agnostic prototype page: interactive key map + grid of all fingerings.
import { renderKeyDiagram } from '../../docs/js/fingering-diagram.js';
import { noteSpellingLabels } from '../../docs/js/fingering.js';

export function mountKeymap(instrument, diagramEl, legendEl) {
  const pressed = new Set();

  function render() {
    diagramEl.innerHTML = renderKeyDiagram(instrument, [...pressed], { showLabels: true, width: 320 });
    legendEl.innerHTML = instrument.keyGroups.map(group => {
      const items = instrument.keys.filter(k => k.group === group.id).map(k =>
        `<li data-key="${k.id}" class="${pressed.has(k.id) ? 'on' : ''}">`
        + `<b>${k.label}</b> — ${k.name} <code>${k.id}</code></li>`).join('');

      return `<h3>${group.name}</h3><ul>${items}</ul>`;
    }).join('')
      + `<div class="pressed-list">keys: [${[...pressed].map(id => `'${id}'`).join(', ')}]</div>`;
  }

  function toggle(event) {
    const id = event.target.closest('[data-key]')?.dataset.key;
    if (!id) return;
    if (pressed.has(id)) pressed.delete(id);
    else pressed.add(id);
    render();
  }

  diagramEl.addEventListener('click', toggle);
  legendEl.addEventListener('click', toggle);
  render();
}

// HTML of note cards with fingering variants. The first variant of a note is its basic
// fingering; basicOnly: true leaves the alternatives out.
export function fingeringGridHtml(instrument, { basicOnly = false } = {}) {
  return instrument.fingerings.map(f => {
    const [main, ...others] = noteSpellingLabels(f.note, f.octave);
    const shown = basicOnly ? f.variants.slice(0, 1) : f.variants;
    const variants = shown.map(v =>
      `<div class="variant">${renderKeyDiagram(instrument, v.keys, { width: 90 })}`
      + `<div class="name">${v.name}</div>`
      + (v.verify ? '<span class="verify">ověřit</span>' : '')
      + `</div>`).join('');

    return `<div class="note-card${shown.length > 1 ? ' multi' : ''}">`
      + `<div class="note-title">${main} ${others.length ? `<span class="alt">· ${others.join(' · ')}</span>` : ''}</div>`
      + `<div class="variants">${variants}</div></div>`;
  }).join('');
}

export function renderFingeringGrid(instrument, gridEl, options) {
  gridEl.innerHTML = fingeringGridHtml(instrument, options);
}
