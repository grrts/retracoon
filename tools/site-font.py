#!/usr/bin/env python3
"""Turns the game's 5x7 pixel font (src/gfx/font.ts) into a web font for the website, so
headings use the same letters as the game. Every ink pixel becomes a square, so the font
stays sharp at any multiple of 7px.

    python3 tools/site-font.py   # writes server/public/site/retracoon-px.woff2

Needs fontTools and brotli (pip install fonttools brotli). The output is committed.
"""
import re
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/gfx/font.ts"
OUT = ROOT / "server/public/site/retracoon-px.woff2"
PX = 100  # font units per game pixel; the cap height is 7 pixels
GLYPH_H = 7

# One glyph per line: `A: ['.###.', ...],` or `'0': [...]` or `"'": [...]`.
glyphs = {}
for q1, q2, bare, rows in re.findall(r"^\s*(?:'(.)'|\"(.)\"|(\w)):\s*\[([^\]]*)\]", SRC.read_text(), re.M):
    glyphs[q1 or q2 or bare] = re.findall(r"'([.#]+)'", rows)
# Lowercase keys are inline icons in the game (x is the multiply sign); on the web,
# lowercase letters show the capitals instead.
glyphs = {k: v for k, v in glyphs.items() if not k.islower()}

names = {".notdef": None}
cmap = {}
for ch in glyphs:
    names[f"u{ord(ch):04X}"] = ch
    cmap[ord(ch)] = f"u{ord(ch):04X}"
    if ch.isalpha() and ch.upper() == ch:
        cmap[ord(ch.lower())] = f"u{ord(ch):04X}"  # the game only has capitals
if " " not in glyphs:
    names["space"] = " "
    cmap[32] = "space"

fb = FontBuilder(PX * 10, isTTF=True)
fb.setupGlyphOrder(list(names))
fb.setupCharacterMap(cmap)

outlines, metrics = {}, {}
for name, ch in names.items():
    pen = TTGlyphPen(None)
    rows = glyphs.get(ch) if ch else None
    width = len(rows[0]) if rows else 3  # the game advances by the glyph width plus 1
    if rows:
        for y, row in enumerate(rows):
            for x, cell in enumerate(row):
                if cell != "#":
                    continue
                top = (GLYPH_H - y) * PX
                pen.moveTo((x * PX, top - PX))
                pen.lineTo((x * PX, top))
                pen.lineTo(((x + 1) * PX, top))
                pen.lineTo(((x + 1) * PX, top - PX))
                pen.closePath()
    outlines[name] = pen.glyph()
    metrics[name] = ((width + 1) * PX, 0)

fb.setupGlyf(outlines)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=GLYPH_H * PX + PX, descent=-2 * PX)
fb.setupNameTable({"familyName": "Retracoon Pixel", "styleName": "Regular"})
fb.setupOS2(sTypoAscender=GLYPH_H * PX + PX, sTypoDescender=-2 * PX, sTypoLineGap=0, usWinAscent=GLYPH_H * PX + PX, usWinDescent=2 * PX, sCapHeight=GLYPH_H * PX, sxHeight=GLYPH_H * PX)
fb.setupPost()
fb.font.flavor = "woff2"
OUT.parent.mkdir(parents=True, exist_ok=True)
fb.save(str(OUT))
print(f"wrote {OUT.relative_to(ROOT)} ({len(glyphs)} glyphs, {OUT.stat().st_size} bytes)")
