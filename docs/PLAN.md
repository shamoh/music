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

### Stupnice (intervaly v půltónech)

- Dur: `[2,2,1,2,2,2,1]`
- Přirozená moll: `[2,1,2,2,1,2,2]`
- Harmonická moll: `[2,1,2,2,1,3,1]`
- Melodická moll (vzestupná): `[2,1,2,2,2,2,1]`

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

## Průběh implementace

- [x] Krok 1: Projekt setup (manifest, SW, package.json, adresáře)
- [x] Krok 2: docs/PLAN.md
- [x] Krok 3: js/music.js + unit testy (24/24 zelených)
- [x] Krok 4: js/notation.js (SVG)
- [x] Krok 5: js/app.js + index.html
- [x] Krok 6: css/style.css
- [x] Krok 7: PWA ikony
- [ ] Krok 8: Ověření v prohlížeči a testování
