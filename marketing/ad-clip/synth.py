"""Voice-over lines for the ad with the app's own Piper voices (see scripts/voices/generate.py).

    KIDDO_VOICE_MODELS=/tmp/tts python3 marketing/ad-clip/synth.py
    python3 marketing/ad-clip/synth.py --timings-only   # after dropping in other recordings

Writes public/vo/<lang>-<line>.wav (48 kHz mono, -16 LUFS) next to this file, then
src/script.json: every line and its length, which src/data.ts times the scenes from.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
VO = HERE / 'public' / 'vo'
LANGS = ['uz', 'ru', 'en']
script = json.loads((HERE / 'script.json').read_text())


def lines_of(lang: str) -> list[tuple[str, str]]:
    hooks = [(f'hook-{key}', texts[lang]) for key, texts in script['hooks'].items()]
    return hooks + [(scene['id'], scene[lang]) for scene in script['scenes']]


def record() -> None:
    sys.path.insert(0, str(HERE.parents[1] / 'scripts' / 'voices'))
    import numpy as np
    import generate as g
    from piper.config import SynthesisConfig

    VO.mkdir(parents=True, exist_ok=True)
    for lang in LANGS:
        voice = g.load_voice(lang)
        _, _, noise, speaker = g.VOICES[lang]
        # a little brisker than the app's children's pace (1.25–1.3): this is for parents
        config = SynthesisConfig(speaker_id=speaker, length_scale=1.08, noise_scale=noise, noise_w_scale=0.6)
        for name, text in lines_of(lang):
            spoken = g.to_kazakh_cyrillic(text) if lang == 'uz' else text
            if lang == 'ru':
                # the Russian voice reads the Latin name as "Hido"; the caption keeps "Kiddo"
                spoken = spoken.replace('Kiddo', 'Киддо')
            audio = np.concatenate([chunk.audio_float_array for chunk in voice.synthesize(spoken, config)])
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
                        '-af', 'highpass=f=80,acompressor=threshold=-18dB:ratio=3,loudnorm=I=-16:TP=-1.5:LRA=7',
                        '-ar', '48000', '-ac', '1', str(VO / f'{lang}-{name}.wav'),
                    ],
                    check=True,
                )
            print(lang, name, round(len(audio) / voice.config.sample_rate, 2))


def write_timings() -> None:
    durations = {}
    for lang in LANGS:
        for name, _ in lines_of(lang):
            path = VO / f'{lang}-{name}.wav'
            seconds = subprocess.check_output(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)]
            )
            durations[path.stem] = round(float(seconds), 3)
    lines = {lang: dict(lines_of(lang)) for lang in LANGS}
    out = {'lines': lines, 'durations': durations}
    (HERE / 'src' / 'script.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    if '--timings-only' not in sys.argv:
        record()
    write_timings()
