// Schematic saxophone key map (fingering-chart style, player's view), shared by the whole family.
//
// Geometry is in the coordinates of VIEWBOX. Each key:
//   id        stable identifier used by fingerings
//   label     short label drawn next to / inside the key
//   name      human-readable description (Czech UI text)
//   group     logical group (octave, palm, lh, lhPinky, rh, side, rhPinky)
//   shape     'circle' | 'pill'
//   x, y      center of the key
//   w, h      size (circle uses w as diameter)
//   labelPos  'inside' | 'left' | 'right' | 'above' | 'below'

export const VIEWBOX = { width: 240, height: 490 };

// Non-interactive outline drawn behind the keys (see fingering-diagram.js)
export const DECORATIONS = [
  { type: 'rect', className: 'body', x: 108, y: 26, width: 44, height: 400, rx: 22 },
  { type: 'line', className: 'split', x1: 96, y1: 270, x2: 164, y2: 270 },
];

export const KEY_GROUPS = [
  { id: 'octave',  name: 'Oktávová klapka (levý palec)' },
  { id: 'palm',    name: 'Palm keys a přední F (levá dlaň)' },
  { id: 'lh',      name: 'Levá ruka — hlavní klapky' },
  { id: 'lhPinky', name: 'Levý malíček' },
  { id: 'rh',      name: 'Pravá ruka — hlavní klapky' },
  { id: 'side',    name: 'Postranní klapky (pravá ruka)' },
  { id: 'rhPinky', name: 'Pravý malíček' },
];

export const KEYS = [
  // Octave key (left thumb)
  { id: 'octave',     label: 'Okt', name: 'Oktávová klapka',         group: 'octave',  shape: 'pill',   x: 94,  y: 96,  w: 22, h: 12, labelPos: 'below' },

  // Palm keys + front F (left hand)
  { id: 'palmEb',     label: 'Es',  name: 'Palm key Es (vysoké Es) — horní',  group: 'palm', shape: 'pill', x: 58, y: 54,  w: 14, h: 26, labelPos: 'left' },
  { id: 'palmD',      label: 'D',   name: 'Palm key D (vysoké D) — prostřední', group: 'palm', shape: 'pill', x: 58, y: 86,  w: 14, h: 26, labelPos: 'left' },
  { id: 'palmF',      label: 'F',   name: 'Palm key F (vysoké F) — dolní',    group: 'palm', shape: 'pill', x: 64, y: 118, w: 14, h: 26, labelPos: 'left' },
  { id: 'frontF',     label: 'Fp',  name: 'Přední F (nejvyšší perleťová klapka)', group: 'palm', shape: 'circle', x: 130, y: 44,  w: 22, h: 22, labelPos: 'right' },

  // Left hand main keys
  { id: 'lh1',        label: '1',   name: 'LH 1 — ukazováček (H)',   group: 'lh',      shape: 'circle', x: 130, y: 80,  w: 34, h: 34, labelPos: 'inside' },
  { id: 'bis',        label: 'Bis', name: 'Bis (B klapka mezi 1 a 2)', group: 'lh',    shape: 'circle', x: 130, y: 108, w: 11, h: 11, labelPos: 'right' },
  { id: 'lh2',        label: '2',   name: 'LH 2 — prostředníček (A)', group: 'lh',     shape: 'circle', x: 130, y: 136, w: 34, h: 34, labelPos: 'inside' },
  { id: 'lh3',        label: '3',   name: 'LH 3 — prsteníček (G)',   group: 'lh',      shape: 'circle', x: 138, y: 182, w: 34, h: 34, labelPos: 'inside' },

  // Left pinky table
  { id: 'gSharp',     label: 'Gis', name: 'Gis klapka',              group: 'lhPinky', shape: 'pill',   x: 181, y: 212, w: 28, h: 12, labelPos: 'right' },
  { id: 'lowCSharp',  label: 'Cis', name: 'Nízké Cis',               group: 'lhPinky', shape: 'pill',   x: 163, y: 232, w: 24, h: 12, labelPos: 'left' },
  { id: 'lowB',       label: 'H',   name: 'Nízké H',                 group: 'lhPinky', shape: 'pill',   x: 199, y: 232, w: 24, h: 12, labelPos: 'right' },
  { id: 'lowBb',      label: 'B',   name: 'Nízké B',                 group: 'lhPinky', shape: 'pill',   x: 181, y: 252, w: 28, h: 12, labelPos: 'right' },

  // Right hand main keys
  { id: 'rh1',        label: '4',   name: 'RH 1 — ukazováček (F)',   group: 'rh',      shape: 'circle', x: 130, y: 310, w: 34, h: 34, labelPos: 'inside' },
  { id: 'rh2',        label: '5',   name: 'RH 2 — prostředníček (E)', group: 'rh',     shape: 'circle', x: 130, y: 356, w: 34, h: 34, labelPos: 'inside' },
  { id: 'rh3',        label: '6',   name: 'RH 3 — prsteníček (D)',   group: 'rh',      shape: 'circle', x: 130, y: 402, w: 34, h: 34, labelPos: 'inside' },

  // Right hand side keys
  { id: 'sideE',      label: 'E',   name: 'Postranní vysoké E',      group: 'side',    shape: 'pill',   x: 180, y: 300, w: 12, h: 22, labelPos: 'right' },
  { id: 'sideC',      label: 'C',   name: 'Postranní C',             group: 'side',    shape: 'pill',   x: 180, y: 326, w: 12, h: 22, labelPos: 'right' },
  { id: 'sideBb',     label: 'B',   name: 'Postranní B',             group: 'side',    shape: 'pill',   x: 180, y: 352, w: 12, h: 22, labelPos: 'right' },
  { id: 'highFSharp', label: 'Fis6', name: 'Vysoké Fis (horní ze dvou spodních bočních)', group: 'side', shape: 'pill', x: 202, y: 374, w: 12, h: 22, labelPos: 'right' },
  { id: 'altFSharp',  label: 'Fis', name: 'Chromatické Fis (dolní ze dvou spodních bočních)', group: 'side', shape: 'pill', x: 202, y: 400, w: 12, h: 22, labelPos: 'right' },

  // Right pinky
  { id: 'lowEb',      label: 'Es',  name: 'Nízké Es',                group: 'rhPinky', shape: 'pill',   x: 168, y: 440, w: 30, h: 12, labelPos: 'right' },
  { id: 'lowC',       label: 'C',   name: 'Nízké C',                 group: 'rhPinky', shape: 'pill',   x: 168, y: 462, w: 30, h: 12, labelPos: 'right' },
];
