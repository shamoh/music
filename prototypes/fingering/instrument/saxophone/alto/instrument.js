// Alto saxophone — instrument descriptor consumed by the generic fingering modules.
// Key map and written fingerings are shared by the whole saxophone family (../).
import { VIEWBOX, DECORATIONS, KEY_GROUPS, KEYS } from '../keys.js';
import { FINGERINGS } from '../fingerings.js';

export const SAXOPHONE_ALTO = {
  id: 'saxophone-alto',
  name: 'Alt saxofon',
  viewBox: VIEWBOX,
  decorations: DECORATIONS,
  keyGroups: KEY_GROUPS,
  keys: KEYS,
  fingerings: FINGERINGS,
};
