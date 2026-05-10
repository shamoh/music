# Sax Scales

A progressive web app (PWA) for learning musical scales on the Alto Saxophone.

## Features

- **Scale display** — shows 8 notes of any selected scale in Czech notation (C D E F G A H)
- **Scale types** — Major (Dur), Natural Minor, Harmonic Minor, Melodic Minor
- **Chord highlighting** — tonic triad (1st, 3rd, 5th degree) highlighted in each scale
- **Visual staff** — custom SVG treble clef notation, no external libraries
- **Alto Saxophone range** — full written range (B3 – F#5) with scale notes highlighted
- **Offline support** — installable as a PWA in Chrome and on Android, works without internet
- **Responsive** — adapts to mobile portrait, landscape, and wide desktop layouts

## For Developers

### Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Chrome.

> Note: the app must be served over HTTP (not `file://`) for the Service Worker and PWA install prompt to work.

### Run tests

```bash
node --test 'tests/**/*.test.js'
```

Tests use the Node.js built-in test runner (Node 18+), no dependencies needed.

### Project structure

```
index.html               redirect to /scales/
scales/
  index.html             app shell
  manifest.json          PWA manifest
  service-worker.js      cache-first offline strategy
  css/style.css          responsive styles (mobile, landscape, desktop)
  js/music.js            music theory — scales, chords, Czech note names
  js/notation.js         SVG staff rendering
  js/app.js              UI logic, event handling, ResizeObserver
  js/themes.js           visual profiles (colors, font scale)
  icons/                 PWA icons (SVG + 192×192 and 512×512 PNG)
tests/music.test.js      unit tests for music.js
docs/PLAN.md             design decisions and implementation notes
```

### Visual profiles

All visual configuration lives in `scales/js/themes.js` in the `VISUAL_PROFILES` array.
The selected profile is persisted in `localStorage` under the key `sax-scales-profile`.

#### Currently defined profiles

| ID | Name | Colors | Font scale |
| --- | --- | --- | --- |
| `dark` | Tmavý | dark background (`#1a1a2e`) | 1× (default) |
| `light` | Světlý | light background (`#f4f4f8`) | 1× |
| `dark-large` | Tmavý · větší | dark background | 1.2× |
| `light-large` | Světlý · větší | light background | 1.2× |

#### CSS variables in each profile

| Variable | Affects |
| --- | --- |
| `--bg` | page background |
| `--bg-card` | card backgrounds (scale section, range section) |
| `--bg-input` | selects and inactive filter chips |
| `--text` | body text; also staff lines, clef, accidentals (via `currentColor`) |
| `--text-muted` | labels, secondary text |
| `--accent` | active filter chips, focus outlines |
| `--accent2` | minor variant headings (Harmonic, Melodic) |
| `--border` | card and input borders |
| `--note-tonic` | tonic note — note head, label, chip |
| `--note-chord` | other chord notes |
| `--note-scale` | remaining scale notes |
| `--note-muted` | out-of-scale notes in the range staff |
| `--font-scale` | multiplier for all rem-based text and SVG staff sizes (`1` or `1.2`) |

#### Adding a new profile

Add an entry to the `VISUAL_PROFILES` array in `scales/js/themes.js`:

```js
{
  id: 'my-profile',       // unique identifier stored in localStorage
  name: 'My Profile',     // label shown in the UI selector
  vars: {
    '--bg':         '#…',
    '--bg-card':    '#…',
    '--bg-input':   '#…',
    '--text':       '#…',
    '--text-muted': '#…',
    '--accent':     '#…',
    '--accent2':    '#…',
    '--border':     '#…',
    '--note-tonic': '#…',
    '--note-chord': '#…',
    '--note-scale': '#…',
    '--note-muted': '#…',
    '--font-scale': '1',  // or '1.2' for larger text
  },
},
```

No other changes are needed — the UI selector is populated automatically from the array.

#### Adding a new CSS variable to all profiles

1. Define the variable in `:root` in `scales/css/style.css` (default/dark value).
2. Use it in the relevant CSS rule, e.g. `color: var(--my-new-var)`.
3. Add `'--my-new-var': '#…'` to the `vars` object of every profile in `VISUAL_PROFILES`.
4. Add the early-apply inline script in `scales/index.html` will pick it up automatically
   (it copies all stored vars to `:root` before first paint).

### PWA verification (Chrome DevTools)

1. Open DevTools → **Application** → **Manifest** — check it loads correctly
2. **Application** → **Service Workers** — verify SW is registered
3. **Network** tab → set **Offline** → reload — app should load from cache
4. On mobile: Chrome menu → **Add to Home screen**
