"""One resumable queue that records clips with VoiceStudio (CPU, one clip at a time).

    python scripts/voices/voice_queue.py jobs.tsv --out %USERPROFILE%\\voice-out [--speed 0.8] [--limit N]

jobs.tsv: tab-separated `group  voice  lang  text` (voice = a name in profiles.json: mini, piku, narrator, ona…).
Clips go to <out>/<group>/<voice>/<lang>/<key>.mp3 (key = phrase_key, the app's own); the app is not touched.
<out>/manifest.json holds key, text hash, voice id, method, status, date: a clip is recorded again only when its
text, voice or method changed. Saved every 50 clips and on exit, so a stop (Ctrl+C, crash, sleep) resumes.
Free RAM < 2.5 GB: pause 5 minutes and look again. uz: no transcribe (sound checks only); ru/en: --check-rate (3 %).
A clip that fails its checks is recorded once more, then listed in <out>/REVIEW.md. uz clips with q / gʻ go to REVIEW-QG.tsv.
"""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import phrase_key  # noqa: E402
from normalize_uz import DEFAULT, normalize_uz  # noqa: E402
from voicestudio import speak, transcribe  # noqa: E402

MIN_FREE_GB = 2.5
SAVE_EVERY = 50
LUFS_TARGET, LUFS_TOLERANCE, PEAK_MAX_DB = -16.0, 1.5, -0.5
SECONDS_PER_CHAR_MAX = 0.2  # a sentence longer than this is a run-on or a loop
QG = re.compile(r"(?i)q|g['ʻʼ‘’`]")
TRIM = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,'
        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse')


class _Mem(ctypes.Structure):
    _fields_ = [('len', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
        (n, ctypes.c_ulonglong) for n in ('total', 'avail', 'tpage', 'apage', 'tvirt', 'avirt', 'ext')]


def free_gb() -> float:
    m = _Mem()
    m.len = ctypes.sizeof(_Mem)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.avail / 2**30


def wait_for_ram() -> None:
    while free_gb() < MIN_FREE_GB:
        print(f'LOWRAM {free_gb():.1f} GB: pause 5 min', flush=True)
        time.sleep(300)


def sha1(text: str) -> str:
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]


def finish(wav: bytes, dest: Path) -> dict:
    """Trim the silence at both ends, -16 LUFS, MP3 22.05 kHz mono 48 kbps; return what the checks need."""
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(wav)
    dest.parent.mkdir(parents=True, exist_ok=True)
    chain = f'{TRIM},highpass=f=70,loudnorm=I={LUFS_TARGET}:TP=-1.5:LRA=11'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f.name, '-af', chain, '-ar', '22050', '-ac', '1',
                    '-b:a', '48k', str(dest)], check=True)
    os.unlink(f.name)
    log = subprocess.run(['ffmpeg', '-nostats', '-i', str(dest), '-af', 'volumedetect,ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    peak = float(re.search(r'max_volume: ([-\d.]+)', log).group(1))
    lufs = float(re.findall(r'I:\s+([-\d.]+) LUFS', log)[-1])
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(dest)],
                               capture_output=True, text=True).stdout)
    return {'dur': round(dur, 2), 'peak': peak, 'lufs': lufs}


def sound_problems(m: dict, chars: int) -> list[str]:
    return [name for name, bad in (
        ('short', m['dur'] < 0.3), ('long', m['dur'] > SECONDS_PER_CHAR_MAX * chars + 2),
        ('clipping', m['peak'] > PEAK_MAX_DB), ('loudness', abs(m['lufs'] - LUFS_TARGET) > LUFS_TOLERANCE)) if bad]


def words(text: str) -> str:
    return ' '.join(re.sub(r'[^\w ]+', ' ', text.lower()).split())


def chosen_for_transcribe(key: str, rate: float) -> bool:
    return int(hashlib.sha1(key.encode()).hexdigest()[:8], 16) / 2**32 < rate  # the same clips every run


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}


def save(path: Path, data: dict) -> None:
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    os.replace(tmp, path)


def record(job: dict, speed: float, rate: float) -> tuple[dict, list[str]]:
    """One clip: generate, finish, check (once more when a check fails). Returns (manifest entry, problems)."""
    text, lang = job['text'], job['lang']
    sent, code = normalize_uz(text, DEFAULT) if lang == 'uz' else (text, lang)
    problems: list[str] = []
    for attempt in range(2):
        wait_for_ram()
        wav = speak(sent, language=code, profile_id=job['voice_id'], speed=speed)
        m = finish(wav, job['file'])
        problems = sound_problems(m, len(text))
        if lang != 'uz' and not problems and chosen_for_transcribe(job['id'], rate):
            heard = transcribe(job['file'].read_bytes(), lang)
            score = SequenceMatcher(None, words(heard), words(text)).ratio()
            if score < 0.85:
                problems.append(f'transcribe {score:.2f}: {heard[:60]}')
        if not problems:
            break
    entry = {'text_sha1': sha1(text), 'voice_id': job['voice_id'], 'method': DEFAULT if lang == 'uz' else None,
             'speed': speed, 'status': 'ok' if not problems else 'review', 'date': str(date.today()), **m}
    return entry, problems


def run(jobs_path: Path, out: Path, speed: float, rate: float, limit: int | None, profiles: dict) -> int:
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / 'manifest.json'
    manifest = load(manifest_path)
    todo, made = [], []
    for line in jobs_path.read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        group, voice, lang, text = line.split('\t', 3)
        voice_id = profiles.get(voice) or profiles[f'{voice}_d1']
        key = phrase_key(lang, text)
        job = {'id': f'{group}/{voice}/{lang}/{key}', 'text': text, 'lang': lang, 'voice': voice, 'voice_id': voice_id,
               'file': out / group / voice / lang / f'{key}.mp3'}
        old = manifest.get(job['id'])
        fresh = old and old['status'] == 'ok' and old['text_sha1'] == sha1(text) and old['voice_id'] == voice_id \
            and old['method'] == (DEFAULT if lang == 'uz' else None) and job['file'].exists()
        if not fresh:
            todo.append(job)
    print(f'{len(todo)} to record, rest already done', flush=True)
    try:
        for n, job in enumerate(todo[:limit], 1):
            t0 = time.time()
            entry, problems = record(job, speed, rate)
            manifest[job['id']] = entry
            made.append(job['id'])
            if problems:
                with (out / 'REVIEW.md').open('a', encoding='utf-8') as f:
                    f.write(f"- {job['id']} — {', '.join(problems)} — {job['text']}\n")
            if job['lang'] == 'uz' and QG.search(job['text']):
                with (out / 'REVIEW-QG.tsv').open('a', encoding='utf-8') as f:
                    f.write(f"{job['voice']}\t{job['id']}\t{job['text']}\n")
            print(f"{n}/{len(todo[:limit])} {job['id']} {entry['status']} {time.time() - t0:.0f}s", flush=True)
            if n % SAVE_EVERY == 0:
                save(manifest_path, manifest)
    finally:
        save(manifest_path, manifest)
    sample = random.Random(date.today().toordinal()).sample(made, min(12, len(made)))
    daily = Path(os.environ['USERPROFILE']) / 'voice-test' / 'daily' / str(date.today())
    for job_id in sample:  # the owner listens to a few of today's clips
        src = out / job_id.rsplit('/', 1)[0] / (job_id.rsplit('/', 1)[1] + '.mp3')
        daily.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, daily / (job_id.replace('/', '_') + '.mp3'))
    return len(todo) - len(todo[:limit])


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('jobs', type=Path)
    ap.add_argument('--out', type=Path, default=Path(os.environ['USERPROFILE']) / 'voice-out')
    ap.add_argument('--speed', type=float, default=0.8)
    ap.add_argument('--check-rate', type=float, default=0.03)
    ap.add_argument('--limit', type=int)
    ap.add_argument('--profiles', type=Path, default=Path(os.environ['USERPROFILE']) / 'voice-test' / 'profiles.json')
    a = ap.parse_args()
    left = run(a.jobs, a.out, a.speed, a.check_rate, a.limit, json.loads(a.profiles.read_text()))
    print(f'DONE, {left} left', flush=True)
