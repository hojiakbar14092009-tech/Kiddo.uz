"""Builds two tiny fonts that draw the Uzbek ʻ (U+02BB) and ʼ (U+02BC) with
the ‘ and ’ shapes of Rubik and Nunito (both SIL OFL 1.1). Rubik has no ʻ at
all, and Nunito's is a wide spacing mark that looks like a gap inside oʻ/gʻ.

    pip install fonttools brotli && python3 scripts/make-okina-fonts.py
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FILES = ROOT / 'node_modules' / '@fontsource'
OUT = ROOT / 'public' / 'fonts'
SOURCES = {
    'okina-rubik.woff2': FILES / 'rubik/files/rubik-latin-800-normal.woff2',
    'okina-nunito.woff2': FILES / 'nunito/files/nunito-latin-800-normal.woff2',
}

for name, source in SOURCES.items():
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=[0x2018, 0x2019])
    sub.subset(font)
    for table in font['cmap'].tables:
        if not table.isUnicode():
            continue
        cmap = table.cmap
        cmap[0x02BB] = cmap[0x2018]
        cmap[0x02BC] = cmap[0x2019]
    OUT.mkdir(parents=True, exist_ok=True)
    font.flavor = 'woff2'
    font.save(OUT / name)
    print(name, (OUT / name).stat().st_size, 'bytes')
