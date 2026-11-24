// Names, labels, constants and URL codes of the saxophone range page — pure, no DOM.

import { scalePair, scaleAccidentalsLabel, shortScaleName } from './music.js';

export const VALID_TYPES = ['natural', 'harmonic', 'melodic'];
export const TYPE_LABELS = { natural: 'Aiolská', harmonic: 'Harmonická', melodic: 'Melodická' };

// Pseudo scale id for the whole instrument range (all notes, no scale).
// It is shown when the page has no hash.
export const FULL_RANGE_ID = 'full-range';
export const FULL_RANGE_LABEL = 'Celý rozsah';

export const SCALE_HINT      = 'Noty stupnice zvýrazněny barevně, ostatní šedě. Klepnutím na notu nebo hmat zobrazíte název tónu a jeho základní i alternativní hmaty.';
export const FULL_RANGE_HINT = 'Klepnutím na notu nebo hmat zobrazíte názvy tónu, stupnice, které jím začínají, a jeho základní i alternativní hmaty.';

// Scale-type label shown in the title and the combo box.
export const SCALE_TYPE_LABEL = { major: 'dur', minor: 'moll', 'whole-tone': 'celotónová', 'major-from': 'dur' };
export const SCALE_TYPE_GROUP_LABEL = { major: 'Dur', minor: 'Moll', 'whole-tone': 'Celotónové', 'major-from': 'Dur od tónu' };
export const SCALE_TYPE_ORDER = ['major', 'minor', 'whole-tone', 'major-from'];

// "B dur", "a moll", "C celotónová"
export function scaleName(entry) {
  return `${entry.root} ${SCALE_TYPE_LABEL[entry.type]}`;
}

// Short name for the heading, prev/next links and the start-scales panel:
// "A♯ dur | B dur" for enharmonic pairs, otherwise "F♯ dur".
export function pairName(entry) {
  return scalePair(entry).map((s) => shortScaleName(s, SCALE_TYPE_LABEL[s.type])).join(' | ');
}

// "B dur (2♭ : be, es)"
export function scaleNameWithAccidentals(entry) {
  const acc = scaleAccidentalsLabel(entry);

  return acc ? `${scaleName(entry)} (${acc})` : scaleName(entry);
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

// Whole-tone ids already end in the English '-whole-tone' suffix, so no
// translation is needed for that type — only dur/moll get a Czech code.
// '-major-from' does not end with '-major', so the suffixes never collide.
export const ID_CODE_SUFFIXES = [
  ['-major', '-dur'],
  ['-minor', '-moll'],
  ['-major-from', '-dur-od-tonu'],
];

export function scaleIdToCode(id) {
  const found = ID_CODE_SUFFIXES.find(([suf]) => id.endsWith(suf));
  return found ? id.slice(0, -found[0].length) + found[1] : id;
}

export function codeToScaleId(code) {
  const found = ID_CODE_SUFFIXES.find(([, cd]) => code.endsWith(cd));
  return found ? code.slice(0, -found[1].length) + found[0] : code;
}

export function makeHash(entry, type) {
  const code = scaleIdToCode(entry.id);
  const suffix = (entry.type === 'minor' && type !== 'natural') ? '?type=' + type : '';
  return '#' + code + suffix;
}

// Filters remembered between visits (scale-filters.js: the type filter per page, sharp /
// flat shared with the Stupnice page); this page offers all scale types
export const FILTER_STORAGE_KEY = 'scales-range-filters';
export const ALL_FILTERS = { type: SCALE_TYPE_ORDER, acc: ['sharp', 'flat'] };

export const OUTSIDE_SCALE_PREFIX = 'mimo stupnici';
