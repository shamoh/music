# SaxScale — CLAUDE.md

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
js/music.js      SCALE_CATALOG + music theory (pure functions, no DOM)
js/notation.js   SVG staff rendering
js/app.js        UI state, filter logic, rendering orchestration
css/style.css    Responsive styles (mobile portrait/landscape, desktop)
service-worker   Cache-first PWA offline support
```
