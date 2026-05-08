# SaxScale — PWA aplikace pro Alt Saxofon

## Kontext

Aplikace pro učení hudebních stupnic při hře na Alt Saxofon. Zobrazuje noty vybrané stupnice v české notaci (C, D, E, F, G, A, H) pomocí vlastního SVG vykreslování. Funguje jako PWA — lze ji spustit z HTTP serveru, nainstalovat v Chrome a na Android. Bez zvuku, pouze vizuální zobrazení psaných not (transponovaných pro Alt Sax).

## Rozhodnutí

- **Notová osnova**: vlastní SVG (bez externích závislostí)
- **Zvuk**: ne, pouze vizuální
- **Transpozice**: psané noty pro hráče (Alt Sax je Eb nástroj)
- **Notace**: česká (C D E F G A H), s přepínačem v settings v budoucnu
- **Rozsah Alt Saxofonu**: psaný B3 (Bb) — Fis5 (F#)

## Struktura souborů

```text
/index.html               - App shell, PWA entry point
/manifest.json            - PWA manifest
/service-worker.js        - Cache-first offline strategie
/css/style.css            - Responzivní mobile-first design
/js/music.js              - Modul hudební teorie (čisté funkce)
/js/notation.js           - SVG vykreslování notové osnovy
/js/app.js                - Logika aplikace, event handlery
/icons/icon-192.png       - PWA ikona
/icons/icon-512.png       - PWA ikona velká
/tests/music.test.js      - Unit testy (Node.js built-in test runner)
/package.json             - type: module, test script
/docs/PLAN.md             - Tento soubor
```

## Hudební teorie

### Česká notace

| Mezinárodní | Česky |
|-------------|-------|
| B♮          | H     |
| B♭          | B     |
| F#          | Fis   |
| E♭          | Es    |
| A♭          | As    |

### Alt Saxofon — psaný rozsah

- Nejnižší: **B3** (= B♭3, tj. Bb pod středním C)
- Nejvyšší: **Fis5** (= F#5)
- 38 chromatických not

### Stupnice — SCALE_CATALOG

Stupnice jsou definovány jako předem vypočítané seznamy správných názvů not (ne generovány z intervalů).
Katalog obsahuje 13 dur + 13 moll = 26 stupnic. Každá moll stupnice má 3 varianty (přirozená, harmonická, melodická).

- Kříže: C (bez předznamenání), G D A E H Fis dur; a (bez), e h fis cis moll
- Béčka: F B Es As Des Ges dur; d g c f b es moll
- Speciální noty: Eis (E#), His (H#), Ces (Cb), Fes (Fb) jsou platné české názvy

### Výběr stupnic — UI

- Filtry: **Dur/Moll** (toggle chips, oba aktivní = default) + **#/b** (toggle chips, oba aktivní = default)
- `filteredScales(filterType, filterAcc)` — 'natural' stupnice (C, a) vždy zahrnuty
- Výsledný `<select>` se s `<optgroup>` Dur/Moll, když jsou oba typy aktivní
- Moll stupnice zobrazí vždy všechny 3 varianty najednou

### Pozice not v houslové osnově (slot = diatonická vzdálenost od G4=0)

```text
slot  nota
  6   F5  (5. linka)
  5   E5  (4. mezera)
  4   D5  (4. linka)
  3   C5  (3. mezera)
  2   H4  (3. linka)
  1   A4  (2. mezera)
  0   G4  (2. linka)
 -1   F4  (1. mezera)
 -2   E4  (1. linka — dolní)
 -3   D4  (pod osnovou)
 -4   C4  (pomocná linka — střední C)
 -5   H3
 -6   A3
 -7   G3
 -8   F3
 -9   E3
-10   D3
-11   C3
```

## Budoucí rozšíření

- Přepínač notace (česká / německá / anglická / italská)
- Přepínač nástroje (Alt Sax / Tenorový Sax / klavír / ...)
- Cvičení pro danou stupnici
- Akordy (triády, septakordy) pro každý stupeň stupnice

## Průběh implementace

### Iterace 1 — základní PWA

- [x] Projekt setup (manifest, SW, package.json)
- [x] js/music.js + unit testy
- [x] js/notation.js (SVG)
- [x] js/app.js + index.html
- [x] css/style.css (responzivní)
- [x] PWA ikony

### Iterace 2 — katalog stupnic + přepracovaný výběr

- [x] CLAUDE.md
- [x] SCALE_CATALOG (26 stupnic, správné názvy not)
- [x] accidentalType() refaktoring (regex suffix)
- [x] generateScale(scaleId, startOctave, variant)
- [x] filteredScales(filterType, filterAcc)
- [x] Filter chip UI (Dur/Moll + #/b toggle)
- [x] Moll multi-view (3 varianty najednou)
- [x] 55/55 unit testů zelených

### Iterace 3 — kompletní katalog + předznamenání v názvech

- [x] 6 chybějících stupnic: Cis-dur, Ces-dur, gis-moll, dis-moll, ais-moll, as-moll
- [x] Double-sharp noty: Fisis, Gisis, Cisis (NOTE_SEMITONE + accidentalType)
- [x] Zobrazení 𝄪 pro dvojitý křížek v notové osnově
- [x] keySig pole na všech 30 stupnicích (kladné = kříže, záporné = béčka)
- [x] Název stupnice s počtem předznamenání: „G dur (1#)", „F dur (1♭)"
- [x] C dur a a moll bez závorky (keySig = 0)
- [x] Malé „dur" místo „Dur" v názvech dur stupnic
- [x] 72/72 unit testů zelených
