# Scales — CLAUDE.md

Read this file at the start of every session. The working plan is in [docs/PLAN.md](docs/PLAN.md).

## Project

Educational PWA app for learning the basics of music theory, focused on the Alto Saxophone.
Czech notation (C D E F G A H), custom SVG staff notation, installable offline (PWA).

## Key context

- **Scope grows over time** — always consider extensibility when making changes; record future ideas in `docs/PLAN.md`
- **Alto Saxophone transposition** — notes displayed are written pitch (what the player reads), not concert pitch
- **Minor scales** — always show all 3 variants together (natural, harmonic, melodic) on one page
- **Czech note names**: C Cis Des D Dis Es E F Fis Ges G Gis As A Ais B H (B = Bb, H = B♮)
- **Scale catalog** — scales have predefined correct note names per key; not generated from intervals
- Source code always in English; all communication in Czech

## Running the app

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## Tests

```bash
node --test tests/music.test.js
```

## Architecture overview

```
scales/
  index.html                        main page — scale staff only
  instrument/saxophone-alto/        range staff page with URL routing (#a-moll?type=harmonic)
  js/music.js                       SCALE_CATALOG + music theory (pure functions, no DOM)
  js/notation.js                    SVG staff rendering
  js/app.js                         main page UI state, filter logic, rendering
  js/themes.js                      visual profiles (colors, font scale)
  js/defaults.js                    APP_VERSION, DEFAULT_SCALE_ID, DEFAULT_PROFILE_ID
  css/style.css                     responsive styles (mobile portrait/landscape, desktop)
  service-worker.js                 cache-first PWA offline support
```

## Version bump — REQUIRED on every change

Two files must always be updated together:

| File | Key | Current |
| --- | --- | --- |
| `scales/js/defaults.js` | `APP_VERSION` | `'1.0.1'` |
| `scales/service-worker.js` | `CACHE_NAME` | `'scales-1.0.1'` |

`APP_VERSION` drives the footer display. `CACHE_NAME` forces the browser to drop the old PWA cache and re-fetch all assets. They must always match.

### Versioning rules

- **Every change** → bump the patch digit automatically (`1.0.1` → `1.0.2`). No exceptions.
- **Explicit request only** — when the user writes "zvedni verzi" → bump the minor digit and reset patch (`1.0.x` → `1.1.0`).
- Never leave the version unchanged after making any code or content edit.
