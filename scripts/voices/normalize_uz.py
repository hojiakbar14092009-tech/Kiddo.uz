"""Uzbek text as the VoiceStudio voice should read it (one place for every Uzbek clip).

The pilot (docs/voice/PILOT.md) tried each spelling below on the same twelve Q / Gʻ words and
checked the clips with transcribe; DEFAULT is the one that kept q (not k) and gʻ best.

    normalize_uz("Qo'l, g‘oz, 3 ta")          # DEFAULT spelling
    normalize_uz("Qo'l, g‘oz", 'cyrillic')    # → "Қўл, ғоз"
"""
from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from uzbek import APOSTROPHES, number_words, to_kazakh_cyrillic  # noqa: E402

_OG = re.compile(rf'([oOgG])[{APOSTROPHES}]')
_TUTUQ = re.compile(rf'(?<=\w)[{APOSTROPHES}](?=\w)')

# Uzbek Latin → Uzbek Cyrillic, longest first; e at a word start is э.
CYRILLIC = [
    ('oʻ', 'ў'), ('gʻ', 'ғ'), ('sh', 'ш'), ('ch', 'ч'), ('ye', 'е'), ('yo', 'ё'), ('yu', 'ю'),
    ('ya', 'я'), ('ʼ', 'ъ'),
    ('a', 'а'), ('b', 'б'), ('d', 'д'), ('e', 'е'), ('f', 'ф'), ('g', 'г'), ('h', 'ҳ'), ('i', 'и'),
    ('j', 'ж'), ('k', 'к'), ('l', 'л'), ('m', 'м'), ('n', 'н'), ('o', 'о'), ('p', 'п'), ('q', 'қ'),
    ('r', 'р'), ('s', 'с'), ('t', 'т'), ('u', 'у'), ('v', 'в'), ('x', 'х'), ('y', 'й'), ('z', 'з'),
]


def _numbers(text: str) -> str:
    return re.sub(r'\d+', lambda m: number_words(int(m.group())), text)


def with_apostrophe(text: str, mark: str) -> str:
    """oʻ / gʻ written with `mark`; the tutuq belgisi elsewhere becomes ʼ."""
    text = _OG.sub(lambda m: m.group(1) + '\x00', unicodedata.normalize('NFC', text))
    return _TUTUQ.sub('ʼ', text).replace('\x00', mark)


def to_uzbek_cyrillic(text: str) -> str:
    """“Qoʻl, gʻoz, eshik” → “Қўл, ғоз, эшик”."""
    text = with_apostrophe(_numbers(text), 'ʻ')
    out = []
    for word in re.split(r'(\W+)', text):
        low, res, i = word.lower(), '', 0
        while i < len(low):
            for src, dst in CYRILLIC:
                if low.startswith(src, i):
                    res += 'э' if src == 'e' and i == 0 else dst
                    i += len(src)
                    break
            else:
                res += low[i]
                i += 1
        out.append(res[:1].upper() + res[1:] if word[:1].isupper() else res)
    return ''.join(out)


def mixed_qg(text: str) -> str:
    """Latin text where only q and gʻ are written in Cyrillic (қ, ғ): the sounds the voice drops."""
    t = with_apostrophe(_numbers(text), 'ʻ')
    for a, b in (('gʻ', 'ғ'), ('Gʻ', 'Ғ'), ('q', 'қ'), ('Q', 'Қ')):
        t = t.replace(a, b)
    return t


def framed(text: str) -> str:
    """The word inside a short sentence ("Mana, qoʻl."): the voice gives it a natural stress."""
    t = with_apostrophe(_numbers(text), 'ʻ')
    return 'Mana, ' + t[:1].lower() + t[1:]


# method → (text transform, language code for generate_speech)
METHODS = {
    'apos_ascii': (lambda t: with_apostrophe(_numbers(t), "'"), 'uz'),
    'apos_02bb': (lambda t: with_apostrophe(_numbers(t), 'ʻ'), 'uz'),
    'apos_2018': (lambda t: with_apostrophe(_numbers(t), '‘'), 'uz'),
    'apos_2018_latn': (lambda t: with_apostrophe(_numbers(t), '‘'), 'uz-Latn'),
    'cyrillic': (to_uzbek_cyrillic, 'uz'),
    'cyrillic_cyrl': (to_uzbek_cyrillic, 'uz-Cyrl'),
    'kazakh': (to_kazakh_cyrillic, 'kk'),
    'frame_02bb': (framed, 'uz'),
    'mixed_qg': (mixed_qg, 'uz'),
}
DEFAULT = 'apos_02bb'  # set from the pilot result


def normalize_uz(text: str, method: str = DEFAULT) -> tuple[str, str]:
    """(text to send, language code) for one Uzbek sentence."""
    transform, language = METHODS[method]
    return transform(text), language


if __name__ == '__main__':
    assert to_uzbek_cyrillic("Qo'l, g‘oz, eshik, yog‘och") == 'Қўл, ғоз, эшик, ёғоч'
    assert with_apostrophe("o'q va she'r", '‘') == 'o‘q va sheʼr'
    assert normalize_uz('3 ta qush', 'apos_02bb') == ('uch ta qush', 'uz')
    assert mixed_qg("Qo'l, g'oz") == 'Қoʻl, ғoz' and framed("Qo'l.") == 'Mana, qoʻl.'
    print('ok')
