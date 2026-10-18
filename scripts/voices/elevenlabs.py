"""ElevenLabs voices for Kiddo (optional, needs your own API key).

ElevenLabs' Eleven v3 model speaks Uzbek, Russian and English with a natural
female voice. Usage, on a computer with internet access:

    export ELEVENLABS_API_KEY=sk_...                 # from elevenlabs.io → API keys
    export ELEVENLABS_VOICE_ID=...                   # optional: a female voice you like
    python3 scripts/voices/generate.py --engine elevenlabs --force

Each sentence costs characters from your ElevenLabs plan (all three languages
together are about 60 000 characters). Clips already on disk are skipped
without --force, so an interrupted run can simply be started again.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64'
# A warm, clear female voice from the ElevenLabs library; any voice works.
DEFAULT_VOICE = 'XrExE9yKIg1WjnnlVkGX'  # “Matilda”
MODEL = 'eleven_v3'
LANGUAGE_CODES = {'uz': 'uz', 'ru': 'ru', 'en': 'en'}


def available() -> bool:
    return bool(os.environ.get('ELEVENLABS_API_KEY'))


def synthesize_mp3(language: str, text: str) -> bytes:
    """One sentence as MP3, spoken slowly and clearly for small children."""
    key = os.environ['ELEVENLABS_API_KEY']
    voice = os.environ.get('ELEVENLABS_VOICE_ID', DEFAULT_VOICE)
    body = json.dumps(
        {
            'text': text,
            'model_id': MODEL,
            'language_code': LANGUAGE_CODES[language],
            'voice_settings': {
                'stability': 0.6,
                'similarity_boost': 0.8,
                'style': 0.35,
                # 0.7 is the slowest the API allows; children follow it easily.
                'speed': 0.8,
            },
        }
    ).encode('utf-8')
    request = urllib.request.Request(
        API.format(voice=voice),
        data=body,
        headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
        method='POST',
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            # Too many requests or a busy server: wait and try again.
            if error.code in (429, 500, 502, 503) and attempt < 4:
                time.sleep(2 ** attempt * 2)
                continue
            raise RuntimeError(f'ElevenLabs {error.code}: {error.read()[:300]!r}') from error
    raise RuntimeError('ElevenLabs did not answer')
