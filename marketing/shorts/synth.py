"""Narration for the cartoons (Phase 61).

    python3 marketing/shorts/synth.py                 # every line with the app's Piper voices
    python3 marketing/shorts/synth.py --timings-only  # after dropping in premium recordings

Each line of script.json (Phase 72: a livelier storyteller, a warmer sound) is spoken into public/vo/<short>/<lang>-<index>.wav (48 kHz mono,
-16 LUFS). A premium recording (MiniMax / ElevenLabs through Higgsfield or Flashloop) is saved
under the same name and the timing pass is run again: every scene stretches to its line.
Writes src/timings.json, which the compositions read.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
VO = HERE / 'public' / 'vo'
LANGS = ['uz', 'ru', 'en']
SCRIPT = json.loads((HERE / 'script.json').read_text())

# The storyteller (Phase 72): a little more life in the melody and rhythm, and a warm
# close-up sound – body in the low mids, clear consonants without hiss, a small room.
STORY_NOISE = 0.12
STORY_RHYTHM = 0.85
STORY_CHAIN = (
    'highpass=f=70,'
    'equalizer=f=220:t=q:w=1:g=2,'
    'equalizer=f=3200:t=q:w=1.2:g=2,'
    'deesser=i=0.4,'
    'acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,'
    'aecho=0.9:0.7:23|41:0.07|0.04,'
    'loudnorm=I=-16:TP=-1.5:LRA=7'
)


def record() -> None:
    sys.path.insert(0, str(HERE.parents[1] / 'scripts' / 'voices'))
    import generate as g
    from piper.config import SynthesisConfig

    for lang in LANGS:
        voice = g.load_voice(lang)
        _, scale, noise, speaker = g.VOICES[lang]
        # a touch quicker than the app's single words: these are whole sentences told as a
        # story; more life in the melody and the rhythm than the app's careful words (Phase 72)
        config = SynthesisConfig(
            speaker_id=speaker,
            length_scale=scale * 0.92,
            noise_scale=min(0.7, noise + STORY_NOISE),
            noise_w_scale=STORY_RHYTHM,
        )
        for short, lines in SCRIPT.items():
            (VO / short).mkdir(parents=True, exist_ok=True)
            for index, line in enumerate(lines):
                target = VO / short / f'{lang}-{index}.wav'
                if target.exists() and '--force' not in sys.argv:
                    continue
                text = line[lang]
                spoken = g.to_kazakh_cyrillic(text) if lang == 'uz' else text
                audio = np.concatenate(
                    [chunk.audio_float_array for chunk in voice.synthesize(spoken, config)]
                )
                pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
                with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
                    with wave.open(tmp.name, 'wb') as w:
                        w.setnchannels(1)
                        w.setsampwidth(2)
                        w.setframerate(voice.config.sample_rate)
                        w.writeframes(pcm.tobytes())
                    subprocess.run(
                        [
                            'ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name,
                            '-af', STORY_CHAIN,
                            '-ar', '48000', '-ac', '1', str(target),
                        ],
                        check=True,
                    )
                print(lang, short, index, round(len(audio) / voice.config.sample_rate, 2))


def write_timings() -> None:
    out = {}
    for short, lines in SCRIPT.items():
        out[short] = {}
        for lang in LANGS:
            durations = []
            for index in range(len(lines)):
                path = VO / short / f'{lang}-{index}.wav'
                seconds = subprocess.check_output(
                    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                     str(path)]
                )
                durations.append(round(float(seconds), 3))
            out[short][lang] = {
                'lines': [line[lang] for line in lines],
                'scenes': [line['scene'] for line in lines],
                'durations': durations,
            }
    (HERE / 'src' / 'timings.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    if '--timings-only' not in sys.argv:
        record()
    write_timings()
