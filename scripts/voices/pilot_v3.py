"""Uzbek pronunciation pilot: writes mp3s to ~/voice-test/v3 for a human to listen to. Run: python scripts/voices/pilot_v3.py"""
import asyncio, json, os, re, sys
from pathlib import Path
import edge_tts
sys.path.insert(0, str(Path(__file__).parent))
from normalize_uz import with_apostrophe, to_uzbek_cyrillic

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ['USERPROFILE']) / 'voice-test' / 'v3'
WORDS = ('qoʻl, koʻl, qir, kir, qum, kum, qozon, qovun, quyosh, kitob, kalit, gʻoz, gʻisht, togʻ, bogʻ, '
         'oʻrdak, shamol, choy, tong, ming, qoʻngʻiroq')
SPELL = {'02bb': lambda t: with_apostrophe(t, 'ʻ'), '2019': lambda t: with_apostrophe(t, '’'),
         'ascii': lambda t: with_apostrophe(t, "'"), 'cyr': to_uzbek_cyrillic}
VOICES = {'madina': 'uz-UZ-MadinaNeural', 'sardor': 'uz-UZ-SardorNeural'}
RATES = {'r90': '-10%', 'r80': '-20%', 'r70': '-30%'}
KEYS = ('barakalla', 'toʻgʻri', 'yana', 'qani', 'ofarin', 'topding', 'bos')

def pick30():
    u = json.load(open(ROOT / 'scripts/voices/phrases.json', encoding='utf-8'))['uz']
    seen, c = set(), []
    for s in u:
        s = with_apostrophe(s, 'ʻ').strip()
        n = re.sub(r'\W', '', s.lower())
        if n in seen or re.search(r'\d|…|\.\.\.', s) or not 8 <= len(s) <= 45: continue
        seen.add(n)
        if re.search(r'[qQ]|oʻ|gʻ', s) or any(k in n for k in KEYS): c.append(s)
    # praise/instruction keywords first, at most 3 "Yana ..." filler sentences
    c.sort(key=lambda s: (not any(k in s.lower() for k in KEYS[:1] + KEYS[1:2] + KEYS[3:6]), len(s)))
    return [s for s in c if not s.startswith('Yana')][:27] + [s for s in c if s.startswith('Yana')][:3]

async def tts(name, text, voice, rate, pitch='+0Hz'):
    for attempt in (1, 2):
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(OUT / name))
            if (OUT / name).stat().st_size > 0: return None
        except Exception as e:
            err = e
    (OUT / name).unlink(missing_ok=True)  # no empty files left behind
    return f'{name}: {err}'

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [(f'edge_{v}_{sp}_{rk}.mp3', f(WORDS), vn, rv) for v, vn in VOICES.items()
            for sp, f in SPELL.items() for rk, rv in RATES.items()]
    cfg = json.load(open(ROOT / 'src/services/audio/voiceConfig.json', encoding='utf-8'))
    ph = ' ... '.join(pick30())
    jobs += [(f'edge_{r}_phrases30_r80.mp3', ph, c['voices']['uz'], '-20%', c['pitch']) for r, c in cfg.items()]
    fails = [f for f in [await tts(*j) for j in jobs] if f]
    print(len(jobs) - len(fails), 'ok; failed:', fails)
    (OUT / 'phrases30.txt').write_text('\n'.join(pick30()), encoding='utf-8')

if __name__ == '__main__':
    asyncio.run(main())
