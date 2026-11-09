"""Mini's and Piku's real voices for the dialogue stories (the same hybrid way as the app).

    python marketing/shorts/voice_sts.py water --plan          # no credits: sizes and estimate
    python marketing/shorts/voice_sts.py water --go            # records (resumes where it stopped)
    python marketing/shorts/voice_sts.py crossing bread tree --go --budget 1200 --reserve 300

Every line is spoken by an Uzbek neural voice (edge-tts: Madina for Mini, Sardor for Piku, rate and
pitch by the kind of sentence) and turned into the child's voice with ElevenLabs Speech-to-Speech
(Mini nUX4UWK0Tf1qh5zvFZWR, Piku EeQEodFZVtBkjtgK3HBc; eleven_multilingual_sts_v2, stability 0.5,
similarity 0.8), exactly as scripts/voices/kid_voices_sts.py does for the app's own sentences.
The recording lands in public/vo/<id>/uz-<n>.wav (48 kHz mono, -16 LUFS); then run
`python marketing/shorts/dialogue.py <id> --timings-only` so the pictures, the mouths and the
subtitles follow the new timing, and render the story again.

Stops at the first error (401/403, quota, any HTTP failure) and when the reserve would be touched.
A ledger (~/kid-voices-sts/shorts-log.jsonl) says which lines are done, so a rerun resumes.
The API key is read from ELEVENLABS_API_KEY and never printed or stored.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / 'scripts' / 'voices'))
import kid_voices_sts as sts_lib  # noqa: E402

LEDGER = Path.home() / 'kid-voices-sts' / 'shorts-log.jsonl'
ROLE = {'mini': 'girl', 'piku': 'boy'}
CREDITS_PER_SECOND = 1000 / 60  # Speech-to-Speech: about 1000 credits per minute of audio


def duration(path: Path) -> float:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(out)


def done() -> dict:
    if not LEDGER.exists():
        return {}
    rows = [json.loads(line) for line in LEDGER.read_text().splitlines() if line.strip()]
    return {f"{r['story']}:{r['line']}": r for r in rows}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('stories', nargs='*')
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--go', action='store_true')
    ap.add_argument('--budget', type=int, default=1200)
    ap.add_argument('--reserve', type=int, default=300)
    args = ap.parse_args()
    dialogue = json.loads((HERE / 'dialogue.json').read_text(encoding='utf-8'))
    ids = args.stories or [s for s in dialogue]
    ledger = done()
    spent = 0
    used, limit = sts_lib.subscription()
    left = limit - used
    print(f'credits left: {left} (reserve {args.reserve}, budget {args.budget})')
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    for sid in ids:
        lines = dialogue[sid]['lines']
        with tempfile.TemporaryDirectory() as tmp_name:
            tmp = Path(tmp_name)
            sources = []
            for i, line in enumerate(lines):
                voice, voice_id, name = sts_lib.VOICES[ROLE[line['who']]]
                kind, rate, pitch = sts_lib.category(line['uz'])
                src = tmp / f'src{i}.mp3'
                sts_lib.source_clip(voice, line['uz'], rate, pitch, src, tmp)
                sources.append((src, voice_id, name))
            seconds = sum(duration(s[0]) for s in sources)
            todo = [i for i in range(len(lines)) if f'{sid}:{i}' not in ledger]
            todo_seconds = sum(duration(sources[i][0]) for i in todo)
            estimate = round(todo_seconds * CREDITS_PER_SECOND)
            print(f'{sid}: {len(lines)} lines, {seconds:.1f} s; to record {len(todo)} lines, about {estimate} credits')
            if not args.go:
                continue
            for i in todo:
                src, voice_id, name = sources[i]
                need = round(duration(src) * CREDITS_PER_SECOND * 1.25)
                if spent + need > args.budget or left - spent - need < args.reserve:
                    print(f'stop: line {i} would pass the budget or the reserve (spent {spent})')
                    return
                try:
                    audio, cost = sts_lib.sts(voice_id, src)
                except sts_lib.Stop as error:
                    print('stop:', error)
                    return
                mp3 = tmp / f'out{i}.mp3'
                mp3.write_bytes(audio)
                wav = HERE / 'public' / 'vo' / sid / f'uz-{i}.wav'
                wav.parent.mkdir(parents=True, exist_ok=True)
                norm = tmp / f'norm{i}.mp3'
                sts_lib.normalize(mp3, norm, False)
                sts_lib.ffmpeg(['-i', str(norm), '-ar', '48000', '-ac', '1', str(wav)])
                spent += cost
                with LEDGER.open('a') as out:
                    out.write(json.dumps({'story': sid, 'line': i, 'voice': name, 'credits': cost}) + '\n')
                print(f'  {sid} line {i} ({name}): {cost} credits')
    print('spent this run:', spent)


if __name__ == '__main__':
    main()
