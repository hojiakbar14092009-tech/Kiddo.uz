"""Children's voices for Kiddo (ElevenLabs Eleven v3): a girl's voice and a boy's.

A girl hears the girl's recordings, a boy the boy's (src/services/audio/kidVoices.ts);
sentences not recorded yet keep the standard clips. Recording goes part by part in
order of importance (praise and instructions first) and stops at a credit budget, so
a small plan grows the children's voices month by month without losing work: clips
on disk are skipped and the manifest is updated after every clip.

    export ELEVENLABS_API_KEY=sk_...      # a key with Text to Speech only, and a credit limit
    python3 scripts/voices/kid_voices.py --budget 9000            # both voices, all languages
    python3 scripts/voices/kid_voices.py --budget 500 --dry-run   # what it would record

Optional: ELEVENLABS_GIRL_VOICE / ELEVENLABS_BOY_VOICE (voice ids), --parts, --voices,
--languages. The network must reach api.elevenlabs.io.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import phrase_key, write_from_mp3  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'audio' / 'voice' / 'kid'
MANIFEST = ROOT / 'src' / 'services' / 'audio' / 'kidVoiceManifest.json'
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64'
MODEL = 'eleven_v3'
VOICES = {
    # ElevenLabs voice library: "Candy – Girly and Sweet" and "Teddy Twinkle – Cute Cartoon Boy"
    'girl': os.environ.get('ELEVENLABS_GIRL_VOICE', 'Nggzl2QAXh3OijoXD116'),
    'boy': os.environ.get('ELEVENLABS_BOY_VOICE', 'XjGYkUkzth8BPs29fmcV'),
}
# In order of importance: what a child hears most comes first.
PARTS = [
    'reward',
    'task',
    'sciGames.done',
    'attention.say',
    'mascot',
    'tutor',
    'learnFirst',
    'feelings',
    'myStory.say',
]
LANGUAGES = ('uz', 'ru', 'en')


def phrases_of(part: str) -> dict[str, list[str]]:
    out = subprocess.run(
        ['npx', 'tsx', '--tsconfig', 'tsconfig.app.json', 'scripts/voices/collect.ts', '--parts', part],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout
    return json.loads(out)


def load_manifest() -> dict:
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for voice in VOICES:
        data.setdefault(voice, {})
        for language in LANGUAGES:
            data[voice].setdefault(language, [])
    return data


def save_manifest(data: dict) -> None:
    clean = {v: {lang: sorted(set(keys)) for lang, keys in data[v].items()} for v in VOICES}
    MANIFEST.write_text(json.dumps(clean, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def speak(voice_id: str, language: str, text: str) -> tuple[bytes, int]:
    """One sentence as MP3, bright and a little slow, and the credits it cost."""
    body = json.dumps({
        'text': text,
        'model_id': MODEL,
        'language_code': language,
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.45, 'speed': 0.88},
    }).encode('utf-8')
    request = urllib.request.Request(
        API.format(voice=voice_id), data=body, method='POST',
        headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                cost = response.headers.get('character-cost') or response.headers.get('x-character-count')
                return response.read(), int(cost) if cost and cost.isdigit() else len(text)
        except urllib.error.HTTPError as error:
            detail = error.read()[:300]
            if error.code in (429, 500, 502, 503) and attempt < 4:
                time.sleep(2 ** attempt * 2)
                continue
            raise RuntimeError(f'ElevenLabs {error.code}: {detail!r}') from error
    raise RuntimeError('ElevenLabs did not answer')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--budget', type=int, required=True, help='credits to spend at most in this run')
    parser.add_argument('--parts', default=','.join(PARTS))
    parser.add_argument('--voices', default='girl,boy')
    parser.add_argument('--languages', default=','.join(LANGUAGES))
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    if not args.dry_run and not os.environ.get('ELEVENLABS_API_KEY'):
        sys.exit('ELEVENLABS_API_KEY is not set')
    voices = [v for v in args.voices.split(',') if v in VOICES]
    languages = [lang for lang in args.languages.split(',') if lang in LANGUAGES]
    manifest = load_manifest()
    spent = recorded = 0
    for part in args.parts.split(','):
        lists = phrases_of(part)
        # round robin over languages and voices: a budget that runs out leaves every child some
        queue = []
        longest = max(len(lists.get(lang, [])) for lang in languages)
        for i in range(longest):
            for language in languages:
                texts = lists.get(language, [])
                if i < len(texts):
                    for voice in voices:
                        queue.append((voice, language, texts[i]))
        for voice, language, text in queue:
            key = phrase_key(language, text)
            target = OUT / voice / language / f'{key}.mp3'
            if target.exists():
                if key not in manifest[voice][language]:
                    manifest[voice][language].append(key)
                continue
            if spent + len(text) > args.budget:
                save_manifest(manifest)
                print(f'[kid voices] budget reached: {recorded} clips, ~{spent} credits')
                return
            if args.dry_run:
                spent += len(text)
                recorded += 1
                continue
            mp3, cost = speak(VOICES[voice], language, text)
            target.parent.mkdir(parents=True, exist_ok=True)
            write_from_mp3(mp3, target)
            manifest[voice][language].append(key)
            save_manifest(manifest)
            spent += cost
            recorded += 1
            print(f'[kid voices] {voice}/{language} {key} ({cost}) {text}')
    save_manifest(manifest)
    print(f'[kid voices] done: {recorded} clips, ~{spent} credits{" (dry run)" if args.dry_run else ""}')


if __name__ == '__main__':
    main()
