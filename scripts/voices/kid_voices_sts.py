"""Children's voices in Uzbek, the hybrid way: a neural Uzbek voice (edge-tts) is turned into
the girl's / boy's character voice with ElevenLabs Speech-to-Speech.

  girl: uz-UZ-MadinaNeural -> STS -> "Mini"  (nUX4UWK0Tf1qh5zvFZWR)
  boy : uz-UZ-SardorNeural -> STS -> "Piku"  (EeQEodFZVtBkjtgK3HBc)

The English-only character voices read Uzbek letter by letter when they speak it themselves
(kid_voices.py); here the Uzbek words are pronounced by an Uzbek voice and only the timbre
changes. Emotion tags do not work in STS, so the mood comes from the source voice: edge-tts
rate/pitch per kind of sentence (praise / greeting, question, comfort, explanation, a piece).

    pip install edge-tts
    export ELEVENLABS_API_KEY=sk_...   # Text to Speech, Speech to Speech and user_read
    python scripts/voices/kid_voices_sts.py --plan                      # counts per tier, no credits
    python scripts/voices/kid_voices_sts.py --budget 21500 --reserve 1500

Clips are written over the old ones only when the new clip is complete (os.replace). A ledger
(~/kid-voices-sts/log.jsonl: key, voice, credits) says which clips are new, so a rerun resumes.
Order of recording: TIERS below. Stops at the first 401 / quota / HTTP error (no retries).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

os.environ.setdefault('PYTHONDONTWRITEBYTECODE', '1')
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kid_voices import SILENT_KEYS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'audio' / 'voice' / 'kid'
MANIFEST = ROOT / 'src' / 'services' / 'audio' / 'kidVoiceManifest.json'
HOME = Path.home() / 'kid-voices-sts'
LEDGER = HOME / 'log.jsonl'
VOICES = {
    'girl': ('uz-UZ-MadinaNeural', 'nUX4UWK0Tf1qh5zvFZWR', 'Mini'),
    'boy': ('uz-UZ-SardorNeural', 'EeQEodFZVtBkjtgK3HBc', 'Piku'),
}
STS_MODEL = 'eleven_multilingual_sts_v2'
STS_SETTINGS = {'stability': 0.5, 'similarity_boost': 0.8}
PAUSE = 0.12  # seconds of silence between the pieces of one clip
LETTERS = dict(A='a', B='be', D='de', E='e', F='ef', G='ge', H='ha', I='i', J='je', K='ka', L='el', M='em', N='en',
               O='o', P='pe', Q='qa', R='er', S='es', T='te', U='u', V='ve', X='xa', Y='ye', Z='ze')
APOSTROPHES = ('‘', 'ʻ', '’', '`', 'ʼ')

SCIENCE = [f'sciGames.{g}.{k}' for g in ('water', 'magnet', 'float', 'scale', 'robot', 'train', 'shop', 'shapes', 'habitats', 'plate')
           for k in ('intro', 'say', 'need', 'made', 'hint')]
# (tier, label, collect.ts parts). 'known' = the sentences the old voices already have, 'rest' = everything else.
TIERS: list[tuple[int, str, list[str]]] = [
    (1, 'mascot', ['mascot']), (1, 'attention', ['attention.say']), (1, 'reward', ['reward']),
    (1, 'welcome', ['welcome']), (1, 'findHome', ['findHome.say']),
    (2, 'mathLab', ['mathLab']), (2, 'alphabet', ['content.alphabet']), (2, 'numbers', ['content.numbers']),
    (2, 'sciGames', ['sciGames.done'] + SCIENCE), (2, 'shop', ['shop']),
    (3, 'task', ['task']),
    (4, 'known', []),
    (5, 'feelings', ['feelings']), (5, 'learnFirst', ['learnFirst']), (5, 'tutor', ['tutor']),
    (5, 'myStory', ['myStory.say']), (5, 'rest', ['rest']), (5, 'exam', ['exam']), (5, 'birthday', ['birthday']),
    (6, 'rest-of-all', []),
]
OTHER_PARTS = ['learn', 'age', 'language', 'pro.celebrateSay', 'letter', 'tour', 'uzbekistan', 'threeWords.say', 'shorts.say',
               'content']


def run_collect(parts: list[str]) -> list[str]:
    out = subprocess.run(
        [shutil.which('npx') or 'npx', 'tsx', '--tsconfig', 'tsconfig.app.json', 'scripts/voices/collect.ts',
         '--parts', ','.join(parts), '--except', ','.join(SILENT_KEYS)],
        cwd=ROOT, check=True, capture_output=True, text=True, encoding='utf-8').stdout
    return json.loads(out).get('uz', [])


# --- the same rules as src/services/audio/phrases.ts (generate.py) ---------------------------------
import unicodedata  # noqa: E402


def _pictograph(ch: str) -> bool:
    cp = ord(ch)
    return 0x2190 <= cp <= 0x21FF or 0x2300 <= cp <= 0x2BFF or 0x1F000 <= cp <= 0x1FFFF or cp in (0xFE0F, 0x200D, 0x20E3)


def clean(text: str) -> str:
    return ' '.join(''.join(c for c in unicodedata.normalize('NFC', text) if not _pictograph(c)).split())


def phrase_key(language: str, text: str) -> str:
    h = 0x811C9DC5
    for byte in f'{language}\u0000{clean(text)}'.encode('utf-8'):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return f'{h:08x}'


# --- the mood of a sentence --------------------------------------------------------------------------
GREET = re.compile(r"salom|xayrli|xush kelib|xayr\b|ko.rishguncha|hayrli|assalom|ertaga ko.rish|yaxshi dam", re.I)
PRAISE = re.compile(r"barakalla|zo.r\b|ajoyib|qoyil|juda yaxshi|aqllisan|boshqa gap|o.rganding|tug.ilgan|bayram|a.lo\b|ofarin|"
                    r"yashasin|tabrik|ura\b|mukammal|g.alaba|yutding|topding|to.g.ri|bajarding|do.stmiz|marhamat", re.I)
COMFORT = re.compile(r"hechqisi yo|sal qoldi|yana urin|diqqat|kech bo|dam ol|xafa|qo.rqma|tinch|sekin|nafas|xotirjam|afsus", re.I)


def category(text: str) -> tuple[str, str, str]:
    """(kind, edge-tts rate, edge-tts pitch)."""
    t = text.strip()
    if t.endswith('?'): return 'question', '+0%', '+2Hz'
    if GREET.search(t): return 'greeting', '+0%', '+4Hz'
    if PRAISE.search(t): return 'praise', '+0%', '+4Hz'
    if COMFORT.search(t): return 'comfort', '-20%', '-2Hz'
    if len(t.split()) == 1 and not t.endswith(('!', '.')): return 'piece', '-25%', '+0Hz'
    return 'explain', '-15%', '+0Hz'


# --- audio ----------------------------------------------------------------------------------------------
TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
LN = 'loudnorm=I=-16:TP=-1.5:LRA=11'


def ffmpeg(args: list[str]) -> None:
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[:300])


def normalize(src: Path, dst: Path, final: bool) -> None:
    """Trim the silence at both ends and bring the clip to -16 LUFS (two passes).

    A clip shorter than loudnorm's 400 ms gate is padded for the measurement and trimmed again.
    """
    pre = 'apad=pad_dur=1.5,'
    a = f'{pre}{LN}'
    err = subprocess.run(['ffmpeg', '-y', '-i', str(src), '-af', f'{TRIM},{a}:print_format=json', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    m = json.JSONDecoder().raw_decode(err[err.rindex('{'):])[0]
    if not all(abs(float(m[k])) < 1e4 for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset')):
        raise RuntimeError('loudness not measurable')
    f = (f"{TRIM},{a}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
         f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,areverse,"
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse')
    if final: f += ',adelay=60,apad=pad_dur=0.12'  # the same lead and tail as generate.py write_from_mp3
    ffmpeg(['-i', str(src), '-af', f, '-ar', '22050' if final else '44100', '-ac', '1', '-c:a', 'libmp3lame',
            '-b:a', '48k' if final else '128k', str(dst)])


def spoken(text: str) -> str:
    text = clean(text)
    for c in APOSTROPHES: text = text.replace(c, "'")
    return text


def source_clip(voice: str, text: str, rate: str, pitch: str, dst: Path, tmp: Path) -> None:
    import edge_tts

    s = text.strip()
    parts = [(LETTERS[s.upper()], '-25%')] if len(s) == 1 and s.upper() in LETTERS else [(text, rate)]
    files = []
    for i, (t, r) in enumerate(parts):
        p = tmp / f'p{i}.mp3'
        asyncio.run(edge_tts.Communicate(spoken(t), voice, rate=r, pitch=pitch).save(str(p)))
        files.append(p)
    normalize(files[0], dst, False)


def sts(voice_id: str, src: Path) -> tuple[bytes, int]:
    bd = uuid.uuid4().hex
    fields = [('model_id', STS_MODEL), ('voice_settings', json.dumps(STS_SETTINGS))]
    body = b''.join(f'--{bd}\r\nContent-Disposition: form-data; name="{a}"\r\n\r\n{b}\r\n'.encode() for a, b in fields)
    body += (f'--{bd}\r\nContent-Disposition: form-data; name="audio"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()
             + src.read_bytes() + f'\r\n--{bd}--\r\n'.encode())
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}?output_format=mp3_44100_128', body,
        {'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': f'multipart/form-data; boundary={bd}'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read(), int(r.headers.get('character-cost') or 0)
    except urllib.error.HTTPError as e:
        raise Stop(f'ElevenLabs HTTP {e.code}: {e.read()[:200]!r}') from e


def subscription() -> tuple[int, int]:
    req = urllib.request.Request('https://api.elevenlabs.io/v1/user/subscription', headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        raise Stop(f'subscription HTTP {e.code}') from e
    return d['character_count'], d['character_limit']


class Stop(Exception):
    pass


# --- the plan ---------------------------------------------------------------------------------------------
def build_plan(done_keys: set[str]) -> list[tuple[int, str, str]]:
    """(tier, label, text) in recording order, a sentence once; the 'known' tier = what the old voices had."""
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    known = set(manifest.get('girl', {}).get('uz', [])) | set(manifest.get('boy', {}).get('uz', []))
    seen: set[str] = set()
    plan: list[tuple[int, str, str]] = []
    universe = run_collect(OTHER_PARTS + [p for _, _, ps in TIERS for p in ps])
    for tier, label, parts in TIERS:
        if label == 'known': texts = [t for t in universe if phrase_key('uz', t) in known]
        elif label == 'rest-of-all': texts = universe
        else: texts = run_collect(parts)
        for t in texts:
            k = phrase_key('uz', t)
            if k in seen: continue
            seen.add(k)
            plan.append((tier, label, t))
    return plan


class Run:
    def __init__(self, budget: int, reserve: int, check_every: int, sample_every: int):
        self.lock = threading.Lock()
        self.budget, self.reserve, self.check_every, self.sample_every = budget, reserve, check_every, sample_every
        self.spent = self.count = 0
        self.stop: str | None = None
        self.fail_streak = 0
        self.period: list[tuple[str, str, str, str]] = []
        self.remaining_account: int | None = None
        self.manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
        for v in VOICES: self.manifest.setdefault(v, {}).setdefault('uz', [])

    def save_manifest(self) -> None:
        clean_m = {v: {lang: sorted(set(keys)) for lang, keys in self.manifest[v].items()} for v in VOICES}
        for v in VOICES:
            for lang in ('uz', 'ru', 'en'): clean_m[v].setdefault(lang, [])
        MANIFEST.write_text(json.dumps(clean_m, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def one_clip(run: Run, tier: int, label: str, text: str, voice: str) -> None:
    key = phrase_key('uz', text)
    kind, rate, pitch = category(text)
    edge_voice, voice_id, nick = VOICES[voice]
    with run.lock:
        if run.stop: return
        estimate = int(len(text) * 0.8) + 3
        left = (run.remaining_account if run.remaining_account is not None else 10**9) - run.spent
        if run.spent + estimate > run.budget or left - estimate < run.reserve:
            run.stop = f'budget/reserve reached (spent {run.spent}, estimated account left {left})'
            return
    target = OUT / voice / 'uz' / f'{key}.mp3'
    with tempfile.TemporaryDirectory(dir=HOME) as td:
        tmp = Path(td)
        try:
            src = tmp / 'src.mp3'
            source_clip(edge_voice, text, rate, pitch, src, tmp)
        except Exception as e:  # edge-tts / ffmpeg trouble: skip this clip, stop after 3 in a row
            with run.lock:
                run.fail_streak += 1
                print(f'[skip] {voice} {key} {text!r}: {e}'[:300], flush=True)
                if run.fail_streak >= 3: run.stop = 'three failures in a row'
            return
        try:
            mp3, cost = sts(voice_id, src)  # any HTTP error stops the whole run: no retries
        except Stop as e:
            with run.lock: run.stop = run.stop or str(e)
            return
        raw = tmp / 'sts.mp3'; raw.write_bytes(mp3)
        try:
            new = tmp / 'new.mp3'
            normalize(raw, new, True)
        except Exception as e:
            with run.lock:
                run.spent += cost
                run.fail_streak += 1
                print(f'[skip] {voice} {key} {text!r}: {e}'[:300], flush=True)
                if run.fail_streak >= 3: run.stop = 'three failures in a row'
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        staged = target.with_suffix('.new')
        shutil.copyfile(new, staged)
        os.replace(staged, target)  # the old clip is replaced only now, whole
    with run.lock:
        run.fail_streak = 0
        run.spent += cost
        run.count += 1
        if key not in run.manifest[voice]['uz']: run.manifest[voice]['uz'].append(key)
        run.save_manifest()
        with open(LEDGER, 'a', encoding='utf-8') as f:
            f.write(json.dumps(dict(key=key, voice=voice, nick=nick, tier=tier, part=label, category=kind, rate=rate,
                                    pitch=pitch, credits=cost, text=text), ensure_ascii=False) + '\n')
        run.period.append((voice, key, label, text))
        if run.count % run.check_every == 0:
            try:
                used, limit = subscription()
                print(f'[check] {run.count} clips, header spend {run.spent}, account used {used}/{limit}', flush=True)
                # the account count can lag behind: trust the smaller remaining
                run.remaining_account = min(run.remaining_account, (limit - used) + run.spent)
            except Stop as e:
                run.stop = str(e)
        if run.count % run.sample_every == 0:
            sample(run)
        if run.count % 50 == 0:
            print(f'[progress] {run.count} clips, ~{run.spent} credits, tier {tier} {label}', flush=True)


def sample(run: Run) -> None:
    d = Path.home() / 'kid-check2'
    picks = random.sample(run.period, min(20, len(run.period)))
    n = len(list(d.glob('*.mp3'))) if d.exists() else 0
    d.mkdir(exist_ok=True)
    with open(d / 'table.md', 'a', encoding='utf-8') as f:
        if n == 0: f.write('| after clip | voice | part | key | text |\n|---|---|---|---|---|\n')
        for voice, key, label, text in picks:
            shutil.copyfile(OUT / voice / 'uz' / f'{key}.mp3', d / f'{voice}_{key}.mp3')
            f.write(f'| {run.count} | {voice} | {label} | {key} | {text} |\n')
    run.period = []
    print(f'[sample] 20 clips -> {d}', flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--budget', type=int, default=21500)
    ap.add_argument('--reserve', type=int, default=1500)
    ap.add_argument('--check-every', type=int, default=200)
    ap.add_argument('--sample-every', type=int, default=400)
    ap.add_argument('--workers', type=int, default=2)
    ap.add_argument('--plan', action='store_true', help='print the plan, spend nothing')
    ap.add_argument('--import-dir', help='copy finished clips (girl|boy/uz/*.mp3 + log.jsonl) from here into the repo')
    args = ap.parse_args()
    HOME.mkdir(exist_ok=True)
    done = {(j['voice'], j['key']) for j in map(json.loads, LEDGER.read_text(encoding='utf-8').splitlines())} if LEDGER.exists() else set()
    if args.import_dir:
        src = Path(args.import_dir)
        run = Run(0, 0, 1, 1)
        for line in (src / 'log.jsonl').read_text(encoding='utf-8').splitlines():
            j = json.loads(line)
            if (j['voice'], j['key']) in done: continue
            target = OUT / j['voice'] / 'uz' / f"{j['key']}.mp3"
            target.parent.mkdir(parents=True, exist_ok=True)
            staged = target.with_suffix('.new'); shutil.copyfile(src / j['voice'] / 'uz' / f"{j['key']}.mp3", staged); os.replace(staged, target)
            if j['key'] not in run.manifest[j['voice']]['uz']: run.manifest[j['voice']]['uz'].append(j['key'])
            with open(LEDGER, 'a', encoding='utf-8') as f:
                f.write(json.dumps({k: j[k] for k in ('key', 'voice', 'nick', 'part', 'category', 'rate', 'pitch', 'credits', 'text')}, ensure_ascii=False) + '\n')
        run.save_manifest()
        print('imported')
        return
    plan = build_plan({k for _, k in done})
    if args.plan:
        by: dict[str, list[int]] = {}
        for tier, label, text in plan:
            row = by.setdefault(f'{tier} {label}', [0, 0, 0])
            row[0] += 1; row[1] += len(text); row[2] += sum(1 for v in VOICES if (v, phrase_key('uz', text)) in done)
        print(f'{"tier part":<18}{"phrases":>8}{"chars":>8}{"clips done":>11}')
        for k, (n, c, d) in by.items(): print(f'{k:<18}{n:>8}{c:>8}{d:>11}')
        print('total', len(plan), 'phrases', sum(len(t) for _, _, t in plan), 'chars')
        return
    if not os.environ.get('ELEVENLABS_API_KEY'): sys.exit('ELEVENLABS_API_KEY is not set')
    run = Run(args.budget, args.reserve, args.check_every, args.sample_every)
    used, limit = subscription()
    run.remaining_account = limit - used
    print(f'[start] account used {used}/{limit}, budget {args.budget}, reserve {args.reserve}, {len(plan)} phrases', flush=True)
    jobs = [(tier, label, text, voice) for tier, label, text in plan for voice in VOICES if (voice, phrase_key('uz', text)) not in done]
    print(f'[start] {len(jobs)} clips to record', flush=True)
    try:
        with ThreadPoolExecutor(args.workers) as pool:
            futures = [pool.submit(one_clip, run, *j) for j in jobs]
            for fut in futures:
                try:
                    fut.result()
                except Stop as e:
                    with run.lock: run.stop = run.stop or str(e)
                if run.stop:
                    for f in futures: f.cancel()
                    break
    finally:
        with run.lock:
            if run.period: sample(run)
            run.save_manifest()
    try:
        used, limit = subscription()
        print(f'[end] account used {used}/{limit} (remaining {limit - used})')
    except Stop:
        pass
    print(f'[end] {run.count} clips, header spend {run.spent}; stop: {run.stop or "plan finished"}')


if __name__ == '__main__':
    main()
