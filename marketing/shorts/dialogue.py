"""Mini and Piku talk (dialogue stories): voices, timings and mouth movement from dialogue.json.

    python marketing/shorts/dialogue.py water            # provisional voices (free edge-tts), timings, lip-sync
    python marketing/shorts/dialogue.py water --timings-only   # after the real recordings are in public/vo/water/
    python marketing/shorts/dialogue.py                  # every story (silent ones get estimated timings)

Each line of dialogue.json is spoken by Mini (girl) or Piku (boy) into public/vo/<id>/uz-<i>.wav
(48 kHz mono, -16 LUFS). A line without a recording is timed from its length, and its mouth moves
from a made-up speech rhythm, so a story with no voice yet still plays: music and subtitles only.
Writes src/timings.json (lines of all three languages, one set of timings, who speaks) and
src/amp.json (the loudness of the voice per frame, for the mouths).
"""
import asyncio
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
VO = HERE / 'public' / 'vo'
SRC = HERE / 'src'
LANGS = ['uz', 'ru', 'en']
FPS, OPENING, ENDING, VOICE_IN, HOLD = 30, 36, 45, 8, 12
EDGE = {'mini': 'uz-UZ-MadinaNeural', 'piku': 'uz-UZ-SardorNeural'}
CHAIN = (
    'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
    'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
    'loudnorm=I=-16:TP=-1.5:LRA=7'
)


async def speak(text: str, voice: str, out: Path) -> None:
    import edge_tts

    mp3 = out.with_suffix('.mp3')
    await edge_tts.Communicate(text, voice, rate='-15%').save(str(mp3))
    subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-y', '-i', str(mp3), '-af', CHAIN, '-ar', '48000', '-ac', '1', str(out)],
        check=True,
    )
    mp3.unlink()


def read(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return raw.astype(np.float32) / 32768


def estimate(text: str) -> float:
    return max(1.8, len(text) / 11 + 0.5)


def rhythm(frames: int, seed: int) -> np.ndarray:
    """A made-up speech rhythm: syllables about four a second, some louder than others."""
    rng = np.random.default_rng(seed)
    t = np.arange(frames) / FPS
    base = np.abs(np.sin(np.pi * 4.2 * t + rng.uniform(0, 3)))
    wobble = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 0.7 * t + rng.uniform(0, 3)))
    return np.clip(base * wobble * 0.9, 0, 1)


def build(sid: str, story: dict, timings_only: bool, force: bool) -> tuple[dict, list[float]]:
    lines = story['lines']
    voiced = story['voice']
    durations, clips = [], []
    for i, line in enumerate(lines):
        wav = VO / sid / f'uz-{i}.wav'
        if voiced and not timings_only and (force or not wav.exists()):
            wav.parent.mkdir(parents=True, exist_ok=True)
            asyncio.run(speak(line['uz'], EDGE[line['who']], wav))
        if wav.exists():
            sound = read(wav)
            clips.append(sound)
            durations.append(round(len(sound) / 48000, 3))
        else:
            clips.append(None)
            durations.append(round(estimate(line['uz']), 3))
    # the frames of every scene, then the loudness of the voice over the whole film
    starts, at = [], OPENING
    for d in durations:
        starts.append(at)
        at += VOICE_IN + int(np.ceil(d * FPS)) + HOLD + round(lines[len(starts) - 1].get('pause', 0) * FPS)
    total = at + ENDING
    amp = np.zeros(total)
    for i, (clip, d) in enumerate(zip(clips, durations)):
        first = starts[i] + VOICE_IN
        n = int(np.ceil(d * FPS))
        if clip is None:
            part = rhythm(n, i + 3)
        else:
            win = 48000 // FPS
            clip = np.pad(clip, (0, max(0, n * win - len(clip))))  # the last frame may be a hair past the end
            rms = np.array([np.sqrt(np.mean(clip[k * win:(k + 1) * win] ** 2) + 1e-12) for k in range(n)])
            part = rms
        amp[first:first + n] = part[: total - first]
    amp = np.nan_to_num(amp)
    voiced_part = amp[amp > 0]
    if voiced_part.size and voiced:
        amp = np.clip(amp / (np.percentile(voiced_part, 95) + 1e-9), 0, 1)
    out = {
        lang: {
            'lines': [line[lang] for line in lines],
            'scenes': [line['scene'] for line in lines],
            'durations': durations,
            'speakers': [line['who'] for line in lines],
            'pauses': [line.get('pause', 0) for line in lines],
        }
        for lang in LANGS
    }
    return out, [round(float(a), 2) for a in amp]


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    dialogue = json.loads((HERE / 'dialogue.json').read_text(encoding='utf-8'))
    ids = args or list(dialogue)
    timings = json.loads((SRC / 'timings.json').read_text(encoding='utf-8'))
    amps_file = SRC / 'amp.json'
    amps = json.loads(amps_file.read_text()) if amps_file.exists() else {}
    for sid in ids:
        timings[sid], amps[sid] = build(sid, dialogue[sid], '--timings-only' in flags, '--force' in flags)
        total = sum(timings[sid]['uz']['durations'])
        print(f'{sid}: {len(dialogue[sid]["lines"])} lines, {total:.1f} s of speech')
    (SRC / 'timings.json').write_text(json.dumps(timings, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    amps_file.write_text(json.dumps(amps, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
