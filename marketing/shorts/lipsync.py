"""Mouth movement for the first twelve cartoons, from their existing narration.

    python marketing/shorts/lipsync.py

The old videos carry the only copy of the narration (voice + music). This keeps their sound
track (out/old-audio/<lang>-<id>.m4a, copied bit for bit, never re-encoded) and measures how
loud the voice is in every frame (src/amp-legacy.json) so Piku's mouth can follow it. The new
pictures are rendered silent and given this sound track again (render-legacy.sh).
"""
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent / 'public' / 'video' / 'shorts'
OLD = HERE / 'out' / 'old-audio'
IDS = 'magnet float dayNight planets seed scale robot train shop shapes habitats plate'.split()
FPS = 30


def main() -> None:
    OLD.mkdir(parents=True, exist_ok=True)
    out = {}
    for sid in IDS:
        for lang in ('uz', 'ru', 'en'):
            m4a = OLD / f'{lang}-{sid}.m4a'
            if not m4a.exists():
                subprocess.run(
                    ['ffmpeg', '-loglevel', 'error', '-y', '-i', str(APP / lang / f'{sid}.mp4'), '-vn', '-c:a', 'copy', str(m4a)],
                    check=True,
                )
            raw = subprocess.run(
                ['ffmpeg', '-loglevel', 'error', '-i', str(m4a), '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                check=True, capture_output=True,
            ).stdout
            sound = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
            win = 16000 // FPS
            n = len(sound) // win
            rms = np.sqrt((sound[: n * win].reshape(n, win) ** 2).mean(axis=1) + 1e-12)
            floor = np.percentile(rms, 20)  # the music bed under the voice
            voice = np.clip(rms - floor, 0, None)
            top = np.percentile(voice, 95) + 1e-9
            out[f'{sid}-{lang}'] = [round(float(v), 2) for v in np.clip(voice / top, 0, 1)]
        print(sid, 'ok')
    (HERE / 'src' / 'amp-legacy.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
