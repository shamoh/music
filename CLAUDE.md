# Scales — CLAUDE.md

Read this file at the start of every session. The working plan is in [PLAN.md](PLAN.md).

## Project

Educational PWA app for learning the basics of music theory, focused on the Alto Saxophone.
Czech notation (C D E F G A H), custom SVG staff notation, installable offline (PWA).

## Key context

- **Scope grows over time** — always consider extensibility when making changes; record future ideas in `PLAN.md`
- **Alto Saxophone transposition** — notes displayed are written pitch (what the player reads), not concert pitch
- **Minor scales** — always show all 3 variants together (natural, harmonic, melodic) on one page
- **Czech note names**: C Cis Des D Dis Es E F Fis Ges G Gis As A Ais B H (B = Bb, H = B♮)
- **Scale catalog** — scales have predefined correct note names per key; not generated from intervals
- Source code always in English; all communication in Czech

## Running the app

```bash
python3 server.py   # serves from docs/, then open http://localhost:8023
```

## Tests

```bash
node --test tests/music.test.js
```

## Architecture overview

```
docs/                               GitHub Pages publishing root
  index.html                        circle of fifths page
  history.html                      version history
  favicon.ico
  manifest.json                     PWA manifest (scope: /)
  service-worker.js                 cache-first PWA offline support
  css/style.css                     responsive styles (mobile portrait/landscape, desktop)
  icons/                            PWA icons (svg, 192, 512)
  js/
    music.js                        SCALE_CATALOG + music theory (pure functions, no DOM)
    notation.js                     SVG staff rendering
    app.js                          scales page UI state, filter logic, rendering
    themes.js                       visual profiles Kompaktní / Větší (auto: Kompaktní on phones, Větší on larger screens)
    defaults.js                     APP_VERSION, DEFAULT_SCALE_ID, DEFAULT_PROFILE_ID
    analytics.js                    Google Analytics integration
    fingering-diagram.js            SVG key diagram of an instrument (string, no DOM)
    fingering.js                    fingering helpers: lookup by note, rows of the fingering chart
    instrument/saxophone/           key map + fingerings shared by saxophones; alto/instrument.js = descriptor
  scales/
    index.html                      main page — scale staff
    instrument/saxophone-alto/      range staff page with URL routing (#a-moll?type=harmonic)
  fonts/
    ScalesMusic.woff                Bravura subset (clef, note head, accidentals) — rebuild via tools/
    Bravura-OFL.txt                 SIL OFL license, must stay next to the font
tools/
  subset-music-font.py              builds ScalesMusic.woff; add new SMuFL glyphs here AND in notation.js
tests/
  music.test.js                     unit tests for music theory functions
```

## Version bump — REQUIRED on every change

Three values must always be updated together:

| File | Key | Current |
| --- | --- | --- |
| `docs/js/defaults.js` | `APP_VERSION` | `'1.0.52'` |
| `docs/js/defaults.js` | `BUILD_DATE` | `'2026-11-19 13:52'` |
| `docs/service-worker.js` | `CACHE_NAME` | `'scales-1.0.52'` |

`APP_VERSION` and `BUILD_DATE` drive the footer display (`Scales vX.Y.Z · YYYY-MM-DD HH:MM`).
`CACHE_NAME` forces the browser to drop the old PWA cache and re-fetch all assets.
`APP_VERSION` and `CACHE_NAME` must always match.

### Versioning rules

- **Every change** → always update `BUILD_DATE` to the current date and time (`YYYY-MM-DD HH:MM`). Run `date` via Bash — never estimate.
- **`APP_VERSION` increments ONCE per conversation** — bump the patch digit on the **first change of a new conversation** (`1.0.41` → `1.0.42`). Keep that version for all further changes within the same conversation. Each digit is an independent integer — no carries (`1.0.9` → `1.0.10`, never `1.1.0`). To determine the right next version: check `git show HEAD:docs/js/defaults.js` for the last committed version, then look at the current `APP_VERSION` — the next version is `current + 1`.
- **A pushed version is final** — once the current `APP_VERSION` has been pushed (published), the next change gets a new patch version, even within the same conversation or on the same day. Every published build must have a unique version, so it is visible on a device that the new one was downloaded. Check with `git show origin/main:docs/js/defaults.js`: if it has the current `APP_VERSION`, bump it. Never change the history entry of a pushed version — start a new entry instead.
- **`CACHE_NAME` always matches `APP_VERSION`** — update together when `APP_VERSION` changes.
- **Explicit request only** — when the user writes "zvedni verzi" → bump the minor digit and reset patch (`1.0.x` → `1.1.0`).

### history.html — one entry per conversation

- Maintain a **single entry** for the current `APP_VERSION` at the top of the `<section>`.
- As changes accumulate within a conversation, **update (merge) that entry** — do not add new entries for each incremental change. Exception: a pushed version's entry is final (see *A pushed version is final*).
- The entry should reflect what changed **from the user's perspective**. Changes that were made and then reverted within the same conversation leave no trace.
- If all changes are **purely technical** (refactor, cleanup, internal fix invisible to users) → skip the history entry entirely.

Entry template:
```html
<div class="history-entry">
  <p class="history-version">X.Y.Z · YYYY-MM-DD</p>
  <p class="history-desc">Stručný popis změny pro uživatele.</p>
</div>
```
