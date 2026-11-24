// The panel "Stupnice od tónu …" of the full range: scales that start on the selected note.

import { dedupePairs, shortNoteName, scalesStartingAt } from './music.js';
import { makeHash, pairName } from './range-names.js';

export function createRangeStartScales({ doc, $, state }) {
  const START_SCALE_GROUPS = [
    ['major', 'Dur'],
    ['minor', 'Moll'],
    ['whole-tone', 'Celotónová'],
    ['major-from', 'Dur od tónu'],
  ];

  function renderStartScales() {
    const panel = $('start-scales');
    panel.replaceChildren();
    const note = state.startNote;
    panel.hidden = !note;
    if (!note) return;

    // "Stupnice od tónu C♯4" — written like the tooltip: full-size accidental,
    // smaller muted octave number
    const title = Object.assign(doc.createElement('p'), {
      className: 'start-scales-title',
      textContent: `Stupnice od tónu ${shortNoteName(note.name)}`,
    });
    title.appendChild(Object.assign(doc.createElement('span'), { className: 'note-octave', textContent: String(note.octave) }));
    panel.appendChild(title);
    const scales = dedupePairs(scalesStartingAt(note.name, note.octave));
    const list = doc.createElement('dl');
    for (const [type, label] of START_SCALE_GROUPS) {
      const ofType = scales.filter((s) => s.type === type);
      if (ofType.length === 0) continue;
      list.appendChild(Object.assign(doc.createElement('dt'), { textContent: label }));
      const dd = doc.createElement('dd');
      ofType.forEach((s, i) => {
        if (i > 0) dd.appendChild(Object.assign(doc.createElement('span'), { className: 'start-scales-sep', textContent: '•' }));
        dd.appendChild(Object.assign(doc.createElement('a'), { href: makeHash(s, 'natural'), textContent: pairName(s) }));
      });
      list.appendChild(dd);
    }
    panel.appendChild(list);
  }

  return { renderStartScales };
}
