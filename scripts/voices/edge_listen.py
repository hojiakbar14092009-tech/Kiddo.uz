"""Listening test from docs/MASTER_PROMPT_V3.md: which spelling Madina / Sardor read with a real q, gʻ and k,
and how the character presets (mascots, family) sound. Writes clips + index.html for a native speaker.

    python scripts/voices/edge_listen.py            # → %USERPROFILE%\\voice-test\\v3\\index.html

Nothing in the app is touched. The chosen spelling goes to normalize_uz.DEFAULT, the presets to the generator.
"""
from __future__ import annotations

import asyncio
import html
import sys
from pathlib import Path

import edge_tts

sys.path.insert(0, str(Path(__file__).resolve().parent))
from normalize_uz import to_uzbek_cyrillic, with_apostrophe  # noqa: E402

OUT = Path.home() / 'voice-test' / 'v3'
WORDS = ["qo'l", 'qush', 'qizil', "g'oz", "g'isht", "tog'", "o'rdak", "ko'k", 'kitob', 'quyosh', "bog'",
         'qa', "g'e", 'ka']  # the last three: letter names, the riskiest clips
PAIRS = [('kitob', 'qizil'), ("ko'k", "qo'l")]
SPELLINGS = {
    'U+02BB ʻ': lambda w: with_apostrophe(w, 'ʻ'),
    'U+2019 ’': lambda w: with_apostrophe(w, '’'),
    "U+0027 '": lambda w: with_apostrophe(w, "'"),
    'kirill': to_uzbek_cyrillic,
}
UZ = {'girl': 'uz-UZ-MadinaNeural', 'boy': 'uz-UZ-SardorNeural'}
# Report table midpoints. edge-tts takes pitch only in Hz: % of a ~220 Hz (Madina) / ~120 Hz (Sardor) voice.
# shortcut: the base pitches are rough guesses, tune the Hz values by ear.
PRESETS = [  # (character, voice, rate, pitch)
    ('Qiz maskot (Mini)', 'uz-UZ-MadinaNeural', '-12%', '+26Hz'),
    ("O'g'il maskot (Piku)", 'uz-UZ-SardorNeural', '-12%', '+19Hz'),
    ('Ona', 'uz-UZ-MadinaNeural', '-5%', '+0Hz'),
    ('Ota', 'uz-UZ-SardorNeural', '+0%', '+0Hz'),
    ('Buvi', 'uz-UZ-MadinaNeural', '-18%', '-22Hz'),
    ('Bobo', 'uz-UZ-SardorNeural', '-18%', '-15Hz'),
    ('Qiz maskot ru', 'ru-RU-SvetlanaNeural', '-12%', '+26Hz'),
    ("O'g'il maskot ru", 'ru-RU-DmitryNeural', '-12%', '+19Hz'),
    ('Qiz maskot en (Ana)', 'en-US-AnaNeural', '-12%', '+0Hz'),
]
LINES = {'uz': "Salom! Bugun qizil qush va g'oz haqida o'qiymiz.", 'ru': 'Привет! Сегодня мы читаем про птичку.',
         'en': "Hi! Today we'll read about a little red bird."}

assert with_apostrophe("g'oz", 'ʻ') == 'gʻoz' and to_uzbek_cyrillic("qo'l") == 'қўл'


async def say(text: str, voice: str, path: Path, rate: str = '-10%', pitch: str = '+0Hz') -> None:
    if not path.exists() or not path.stat().st_size:  # a crashed save leaves an empty file
        try:
            await asyncio.wait_for(edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(path)), 30)
        except (edge_tts.exceptions.NoAudioReceived, TimeoutError):  # uz-UZ voices give nothing for Cyrillic
            path.unlink(missing_ok=True)


def audio(name: str) -> str:
    if not (OUT / name).exists() or not (OUT / name).stat().st_size:
        return "<i>ovoz yo'q</i>"
    return f'<audio controls preload="none" src="{html.escape(name)}"></audio>'


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [say(f(w), voice, OUT / f'w_{wi:02d}_{si}_{who}.mp3')
            for wi, w in enumerate(WORDS) for si, f in enumerate(SPELLINGS.values()) for who, voice in UZ.items()]
    jobs += [say(LINES[v[:2]], v, OUT / f'p_{i}.mp3', rate, pitch) for i, (_, v, rate, pitch) in enumerate(PRESETS)]
    for i in range(0, len(jobs), 8):  # small batches: the free channel drops bursts
        await asyncio.gather(*jobs[i:i + 8])
    rows = ''.join(f'<tr><th>{html.escape(w)}</th>' + ''.join(
        f'<td>{audio(f"w_{wi:02d}_{si}_{who}.mp3")}</td>' for si in range(len(SPELLINGS)) for who in UZ) + '</tr>'
        for wi, w in enumerate(WORDS))
    head = ''.join(f'<th>{html.escape(l)}<br>Madina</th><th>{html.escape(l)}<br>Sardor</th>' for l in SPELLINGS)
    pair_rows = ''.join(f'<tr><th>{a} / {b}</th><td>{audio(f"w_{WORDS.index(a):02d}_0_girl.mp3")}</td>'
                        f'<td>{audio(f"w_{WORDS.index(b):02d}_0_girl.mp3")}</td></tr>' for a, b in PAIRS)
    preset_rows = ''.join(f'<tr><th>{html.escape(who)}</th><td>{v} rate {rate} pitch {pitch}</td><td>{audio(f"p_{i}.mp3")}</td></tr>'
                          for i, (who, v, rate, pitch) in enumerate(PRESETS))
    (OUT / 'index.html').write_text(f"""<!doctype html><meta charset="utf-8"><title>Kiddo ovoz testi v3</title>
<style>body{{font:15px system-ui;margin:24px}}table{{border-collapse:collapse;margin-bottom:32px}}td,th{{border:1px solid #ccc;padding:4px 6px}}audio{{width:150px}}</style>
<h1>Q / Gʻ / K tinglash testi</h1><p>Har so'z uchun q, gʻ, k to'g'ri eshitilgan ustunni belgilang. Tinglovchi: o'zbek tilida so'zlashuvchi (iloji bo'lsa o'qituvchi).</p>
<table><tr><th>so'z</th>{head}</tr>{rows}</table>
<h2>K va Q juftlari (Madina, ʻ)</h2><table>{pair_rows}</table>
<h2>Personaj presetlari (taxminiy, quloq bilan tasdiqlang; "metall" ovoz chiqsa pitch'ni kamaytiring)</h2>
<table>{preset_rows}</table>""", encoding='utf-8')
    print(OUT / 'index.html', len(list(OUT.glob('*.mp3'))), 'clips')


if __name__ == '__main__':
    asyncio.run(main())
