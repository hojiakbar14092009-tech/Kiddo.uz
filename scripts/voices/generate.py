"""Records Kiddo's voice clips with neural voices (Piper), one file per sentence.

    npx tsx scripts/voices/collect.ts > scripts/voices/phrases.json
    python3 scripts/voices/generate.py            # only new sentences
    python3 scripts/voices/generate.py --force    # everything again

Voices (MIT/CC-BY Piper models, from the sherpa-onnx "tts-models" release):
  ru – ru_RU irina (a native Russian voice)
  en – en_GB cori (a native British English voice)
  uz – there is no open Uzbek neural voice yet. Uzbek is written over into
       Kazakh Cyrillic (uzbek.py: q → қ, gʻ → ғ, oʻ → ө, ng → ң, numbers in Uzbek
       words) and read by the female voice of the Kazakh ISSAI Piper model, the
       closest Turkic language with q, gʻ and x sounds of its own.
All three are female voices, read slowly (length scale 1.25–1.3) for small children.
Models are looked up in $KIDDO_VOICE_MODELS (default /tmp/tts).

With an ElevenLabs API key the same clips can be recorded with ElevenLabs'
Eleven v3 voices instead (see elevenlabs.py):

    python3 scripts/voices/generate.py --engine elevenlabs --force
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import unicodedata
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from uzbek import to_kazakh_cyrillic  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MODELS = Path(os.environ.get('KIDDO_VOICE_MODELS', '/tmp/tts'))
OUT = ROOT / 'public' / 'audio' / 'voice'
MANIFEST = ROOT / 'src' / 'services' / 'audio' / 'voiceManifest.json'

# model, length scale (slower = clearer for children), noise (lower = steadier), speaker
VOICES = {
    'uz': ('vits-piper-kk_KZ-issai-high/kk_KZ-issai-high.onnx', 1.3, 0.4, 4),
    'ru': ('vits-piper-ru_RU-irina-medium/ru_RU-irina-medium.onnx', 1.3, 0.45, None),
    'en': ('vits-piper-en_GB-cori-high/en_GB-cori-high.onnx', 1.25, 0.45, None),
}

# --- the same rules as src/services/audio/phrases.ts -------------------------

def _pictograph(ch: str) -> bool:
    cp = ord(ch)
    return 0x2190 <= cp <= 0x2BFF or 0x1F000 <= cp <= 0x1FFFF or cp in (0xFE0F, 0x200D, 0x20E3)


def normalize_phrase(text: str) -> str:
    text = unicodedata.normalize('NFC', text)
    text = ''.join(ch for ch in text if not _pictograph(ch))
    return ' '.join(text.split())


def phrase_key(language: str, text: str) -> str:
    data = f'{language}\u0000{normalize_phrase(text)}'.encode('utf-8')
    h = 0x811C9DC5
    for byte in data:
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f'{h:08x}'

# -----------------------------------------------------------------------------


def load_voice(language: str):
    from piper import PiperVoice

    model = VOICES[language][0]
    path = MODELS / model
    return PiperVoice.load(str(path), config_path=str(path) + '.json')


def synthesize(voice, language: str, text: str) -> tuple[np.ndarray, int]:
    from piper.config import SynthesisConfig

    _, length, noise, speaker = VOICES[language]
    config = SynthesisConfig(
        speaker_id=speaker, length_scale=length, noise_scale=noise, noise_w_scale=0.6
    )
    if language == 'uz':
        text = to_kazakh_cyrillic(text)
    audio = np.concatenate([chunk.audio_float_array for chunk in voice.synthesize(text, config)])
    return audio, voice.config.sample_rate


def write_mp3(audio: np.ndarray, rate: int, target: Path) -> None:
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(pcm.tobytes())
        subprocess.run(
            [
                'ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name,
                # a little air before and after, even loudness for every clip
                '-af', 'adelay=60,apad=pad_dur=0.12,loudnorm=I=-16:TP=-1.5:LRA=11',
                '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '40k',
                str(target),
            ],
            check=True,
        )


def write_from_mp3(mp3: bytes, target: Path) -> None:
    """A clip from another engine, brought to the same loudness and format."""
    with tempfile.NamedTemporaryFile(suffix='.mp3') as tmp:
        tmp.write(mp3)
        tmp.flush()
        subprocess.run(
            [
                'ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name,
                '-af', 'adelay=60,apad=pad_dur=0.12,loudnorm=I=-16:TP=-1.5:LRA=11',
                '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k',
                str(target),
            ],
            check=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--only', choices=sorted(VOICES))
    parser.add_argument('--engine', choices=['piper', 'elevenlabs'], default='piper')
    args = parser.parse_args()
    if args.engine == 'elevenlabs':
        import elevenlabs

        if not elevenlabs.available():
            sys.exit('Set ELEVENLABS_API_KEY first (see scripts/voices/elevenlabs.py).')

    phrases: dict[str, list[str]] = json.loads((Path(__file__).parent / 'phrases.json').read_text())
    manifest: dict[str, list[str]] = {}
    for language, sentences in phrases.items():
        folder = OUT / language
        folder.mkdir(parents=True, exist_ok=True)
        keys = sorted({phrase_key(language, s) for s in sentences})
        manifest[language] = keys
        if args.only and args.only != language:
            continue
        voice = None
        for index, sentence in enumerate(sentences):
            target = folder / f'{phrase_key(language, sentence)}.mp3'
            if target.exists() and not args.force:
                continue
            if args.engine == 'elevenlabs':
                write_from_mp3(elevenlabs.synthesize_mp3(language, sentence), target)
            else:
                voice = voice or load_voice(language)
                audio, rate = synthesize(voice, language, sentence)
                write_mp3(audio, rate, target)
            if index % 100 == 0:
                print(language, index, '/', len(sentences), sentence, flush=True)
        # Clips no longer used by the app are removed.
        wanted = {f'{key}.mp3' for key in keys}
        for old in folder.glob('*.mp3'):
            if old.name not in wanted:
                old.unlink()
    MANIFEST.write_text(json.dumps(manifest, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
