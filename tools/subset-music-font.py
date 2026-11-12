#!/usr/bin/env python3
"""
Builds docs/fonts/ScalesMusic.woff — a subset of the Bravura music font with
only the glyphs the app draws on the staff.

Bravura (c) Steinberg Media Technologies GmbH is licensed under the SIL Open
Font License 1.1 with the Reserved Font Name "Bravura". A subset is a modified
version, so OFL requires a different name: the subset is called "ScalesMusic".
The OFL license text must stay next to the font (docs/fonts/Bravura-OFL.txt).

When the app needs another glyph (e.g. a rest, a different note head), add its
SMuFL code point to GLYPHS below AND to SMUFL in docs/js/notation.js, then run
this script again. A unit test checks that both lists match.

Usage (needs fontTools: pip install fonttools):
  python3 tools/subset-music-font.py path/to/Bravura.otf|woff|woff2

Source font: https://github.com/steinbergmedia/bravura (redist/), e.g.
  https://cdn.jsdelivr.net/gh/steinbergmedia/bravura@bravura-1.392/redist/woff/Bravura.woff2
Reading .woff2 needs the brotli module; .otf / .woff do not.
"""

import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

# SMuFL code points used by docs/js/notation.js (keep in sync with SMUFL there).
GLYPHS = {
    0xE050: 'gClef',
    0xE0A4: 'noteheadBlack',
    0xE260: 'accidentalFlat',
    0xE261: 'accidentalNatural',
    0xE262: 'accidentalSharp',
    0xE263: 'accidentalDoubleSharp',
}

NEW_FAMILY = 'ScalesMusic'
RESERVED_NAME = 'Bravura'

# Name table records that carry the font name (family, full name, PostScript
# name, unique id, typographic family, ...). Copyright / license records stay.
NAME_IDS_TO_RENAME = {1, 3, 4, 6, 16, 17, 18, 21, 22}

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'fonts', 'ScalesMusic.woff')


def rename(font):
    for record in font['name'].names:
        if record.nameID not in NAME_IDS_TO_RENAME:
            continue
        text = record.toUnicode()
        if record.nameID == 6:
            renamed = NEW_FAMILY  # PostScript name: no spaces
        else:
            renamed = text.replace(RESERVED_NAME, NEW_FAMILY)
        record.string = renamed


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    font = TTFont(sys.argv[1])
    options = subset.Options()
    options.layout_features = []
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    options.flavor = 'woff'

    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=GLYPHS.keys())
    subsetter.subset(font)

    missing = [hex(cp) for cp in GLYPHS if cp not in font.getBestCmap()]
    if missing:
        sys.exit(f'Glyphs missing in the subset: {missing}')

    rename(font)
    font.flavor = 'woff'
    font.save(OUTPUT)
    print(f'Wrote {os.path.normpath(OUTPUT)} ({os.path.getsize(OUTPUT)} bytes, {len(GLYPHS)} glyphs)')


if __name__ == '__main__':
    main()
