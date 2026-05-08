# SaxScale

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
index.html          app shell
manifest.json       PWA manifest
service-worker.js   cache-first offline strategy
css/style.css       responsive styles (mobile, landscape, desktop)
js/music.js         music theory — scales, chords, Czech note names
js/notation.js      SVG staff rendering, scales with notation
js/app.js           UI logic, event handling, ResizeObserver
tests/music.test.js unit tests for music.js
icons/              PWA icons (192 × 192 and 512 × 512)
docs/PLAN.md        design decisions and implementation notes
```

### PWA verification (Chrome DevTools)

1. Open DevTools → **Application** → **Manifest** — check it loads correctly
2. **Application** → **Service Workers** — verify SW is registered
3. **Network** tab → set **Offline** → reload — app should load from cache
4. On mobile: Chrome menu → **Add to Home screen**
