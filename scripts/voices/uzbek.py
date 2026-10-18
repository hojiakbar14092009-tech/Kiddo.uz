"""Uzbek (Latin) text → phonemes for a Turkic Piper voice.

Uzbek spelling is nearly phonemic, so a few rules are enough: digraphs
(sh, ch, ng, oʻ, gʻ), the tutuq belgisi (ʼ) as a glottal stop, numbers read
out as words, stress on the last syllable (on the one before for the
unstressed question/emphasis endings -mi, -chi, -ku), and punctuation kept
so the voice rises for questions and lifts for exclamations.
"""
from __future__ import annotations

import re

APOSTROPHES = "ʻʼ'`‘’"

ONES = ['nol', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz']
TENS = ['', 'oʻn', 'yigirma', 'oʻttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'toʻqson']


def number_words(n: int) -> str:
    if n < 10:
        return ONES[n]
    if n < 100:
        tens, ones = divmod(n, 10)
        return TENS[tens] + ('' if ones == 0 else ' ' + ONES[ones])
    hundreds, rest = divmod(n, 100)
    head = 'yuz' if hundreds == 1 else ONES[hundreds] + ' yuz'
    return head + ('' if rest == 0 else ' ' + number_words(rest))


# Words borrowed with their foreign spelling, written the way they are said.
SAY_AS = {
    'coin': 'koyn', 'coinlar': 'koynlar', 'coinlarni': 'koynlarni', 'coinni': 'koynni',
    'pro': 'pro', 'kiddo': 'kiddo', 'ok': 'okey',
}

VOWELS = {'a': 'a', 'e': 'e', 'i': 'i', 'o': 'o', 'u': 'u', 'ö': 'o'}
# Phonemes as the Turkish voice knows them: q → k, x → h, gʻ → ɡ, ng → n+ɡ.
CONSONANTS = {
    'sh': ['ʃ'], 'ch': ['t', 'ʃ'], 'ng': ['n', 'ɡ'], 'ğ': ['ɡ'],
    'b': ['b'], 'd': ['d'], 'f': ['f'], 'g': ['ɡ'], 'h': ['h'], 'j': ['d', 'ʒ'],
    'k': ['k'], 'l': ['l'], 'm': ['m'], 'n': ['n'], 'p': ['p'], 'q': ['k'],
    'r': ['ɾ'], 's': ['s'], 't': ['t'], 'v': ['v'], 'x': ['h'], 'y': ['j'], 'z': ['z'],
    'c': ['s'], 'w': ['v'],
}
FRONT = set('ei')
UNSTRESSED_ENDINGS = ('mi', 'chi', 'ku')


def normalize(text: str) -> str:
    """Lower case; oʻ → ö and gʻ → ğ as single letters; other apostrophes → ʼ."""
    t = re.sub(r'\d+', lambda m: ' ' + number_words(int(m.group())) + ' ', text.lower())
    for a in APOSTROPHES:
        t = t.replace('o' + a, 'ö').replace('g' + a, 'ğ')
    for a in APOSTROPHES:
        t = t.replace(a, 'ʼ')
    t = t.replace('–', ' ').replace('+', ' ').replace('/', ' ')
    return t


def _syllable_vowels(word: str) -> list[int]:
    return [i for i, ch in enumerate(word) if ch in VOWELS]


def word_phonemes(word: str) -> list[str]:
    word = SAY_AS.get(word, word)
    out: list[str] = []
    vowel_at: list[int] = []
    i = 0
    while i < len(word):
        two = word[i:i + 2]
        if two in ('sh', 'ch') or (two == 'ng' and (i + 2 >= len(word) or word[i + 2] not in VOWELS)):
            out.extend(CONSONANTS[two])
            i += 2
            continue
        ch = word[i]
        if ch in VOWELS:
            vowel_at.append(len(out))
            out.append(VOWELS[ch])
        elif ch in CONSONANTS:
            out.extend(CONSONANTS[ch])
        elif ch == 'ʼ':
            out.append('ʔ')
        i += 1

    # Light and dark l, as in Turkic languages: light next to front vowels.
    for k, p in enumerate(out):
        if p == 'l':
            near = {out[j] for j in (k - 1, k + 1) if 0 <= j < len(out)}
            out[k] = 'l' if near & FRONT else 'ɫ'

    if vowel_at:
        stressed = vowel_at[-1]
        if len(vowel_at) > 1 and word.endswith(UNSTRESSED_ENDINGS):
            stressed = vowel_at[-2]
        # The stress mark goes before the syllable's first consonant.
        onset = stressed - 1 if stressed > 0 and out[stressed - 1] not in VOWELS.values() else stressed
        if onset > 0 and out[onset - 1] in ('t', 'd') and out[onset] in ('ʃ', 'ʒ'):
            onset -= 1
        out.insert(onset, 'ˈ')
    return out


def to_phonemes(text: str) -> list[str]:
    """Phonemes of a whole sentence, keeping spaces and punctuation for rhythm and melody."""
    t = normalize(text)
    phonemes: list[str] = []
    for token in re.findall(r"[a-zöğʼ]+|[.,!?;:…—-]|\s+", t):
        if token.isspace():
            if phonemes and phonemes[-1] != ' ':
                phonemes.append(' ')
        elif token in '.,!?;:…—-':
            mark = {'—': ',', '-': ' ', '…': '.', ';': ',', ':': ','}.get(token, token)
            if phonemes and phonemes[-1] == ' ':
                phonemes.pop()
            phonemes.append(mark)
        else:
            phonemes.extend(word_phonemes(SAY_AS.get(token, token)))
    while phonemes and phonemes[-1] == ' ':
        phonemes.pop()
    if not phonemes or phonemes[-1] not in '.!?':
        phonemes.append('.')
    return [p for p in phonemes if p != 'ʔ']


# --- Uzbek for the Kazakh voice ---------------------------------------------
# The Kazakh Piper voice (ISSAI, female speakers) reads Kazakh Cyrillic with its
# own rules. Uzbek Latin maps onto it almost letter for letter: q → қ, gʻ → ғ,
# oʻ → ө, ng → ң, x → х, h → һ… so the voice stays in the sounds it was trained on.
KAZAKH_LETTERS = [
    ('sh', 'ш'), ('ch', 'ч'), ('ng', 'ң'), ('ö', 'ө'), ('ğ', 'ғ'),
    ('ye', 'е'), ('yo', 'йо'), ('yu', 'ю'), ('ya', 'я'),
    ('a', 'а'), ('b', 'б'), ('d', 'д'), ('e', 'е'), ('f', 'ф'), ('g', 'г'), ('h', 'х'),
    ('i', 'і'), ('j', 'ж'), ('k', 'к'), ('l', 'л'), ('m', 'м'), ('n', 'н'), ('o', 'о'),
    ('p', 'п'), ('q', 'қ'), ('r', 'р'), ('s', 'с'), ('t', 'т'), ('u', 'у'), ('v', 'в'),
    ('x', 'х'), ('y', 'й'), ('z', 'з'), ('c', 'с'), ('w', 'у'),
]


def to_kazakh_cyrillic(text: str) -> str:
    """“Salom! Gʻoz, choynak” → “Салом! Ғоз, чойнак” (numbers read out in Uzbek first)."""
    t = re.sub(r'\d+', lambda m: number_words(int(m.group())), text)
    for word, said in SAY_AS.items():
        t = re.sub(rf'\b{word}\b', said, t, flags=re.IGNORECASE)
    t = t.replace('+', ' ').replace('/', ' ').replace('–', ' ')
    out: list[str] = []
    for part in re.split(r'([^\wʻʼ\'`‘’]+)', t):
        lower = part.lower()
        for a in APOSTROPHES:
            lower = lower.replace('o' + a, 'ö').replace('g' + a, 'ğ')
        for a in APOSTROPHES:
            lower = lower.replace(a, '')
        result = ''
        i = 0
        while i < len(lower):
            for source, target in KAZAKH_LETTERS:
                if lower.startswith(source, i):
                    result += target
                    i += len(source)
                    break
            else:
                result += lower[i]
                i += 1
        if part[:1].isupper() and result:
            result = result[0].upper() + result[1:]
        out.append(result)
    return ''.join(out)
