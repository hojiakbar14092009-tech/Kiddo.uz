# Voices for the rest of the cartoons (when credits come back)

**State (2026-11-08).** ElevenLabs Starter plan, 40 000 credits a month. At the start of this work 1 486 were left.
The water cartoon was recorded with Mini and Piku (16 lines, 36 s of speech): **367 credits**, about 10 credits per second of speech.
Check the balance without spending: `GET /v1/user/subscription` (the helper prints it as "credits left").

The seven new lessons play today with music and subtitles only (their mouths move to a made-up rhythm and their timing is an
estimate, so they are about 1.5x longer than they will be with real voices).

## Estimate for the seven lessons

| Lesson | Speech (est.) | Credits (est.) |
|---|---|---|
| crossing | 35 s | 360 |
| bread | 32 s | 320 |
| tree | 30 s | 305 |
| rainbow | 33 s | 335 |
| dayCycle | 31 s | 315 |
| calm | 30 s | 300 |
| teeth | 32 s | 325 |
| **All seven** | | **about 2 260** |

One lesson costs about 300-360 credits, so a month with 1 500+ spare credits voices four of them (keep 300 in reserve).

## The one-time sequence (resumable)

```sh
# 1. see what it will cost, no credits spent
python marketing/shorts/voice_sts.py crossing bread tree rainbow dayCycle calm teeth --plan

# 2. record (stops at the first error and before touching the reserve; run again to resume)
python marketing/shorts/voice_sts.py crossing bread tree rainbow dayCycle calm teeth --go --budget 2300 --reserve 300

# 3. timings, mouths and subtitles follow the real recordings (only for the lessons that are fully recorded)
python marketing/shorts/dialogue.py crossing bread tree rainbow dayCycle calm teeth --timings-only
npx prettier --write marketing/shorts/src/timings.json

# 4. mark them voiced (add the ids to VOICED in marketing/shorts/src/stories.ts), then render and install
cd marketing/shorts && npx remotion bundle --out-dir=out/bundle --log=error
printf '%s\n' crossing bread tree rainbow dayCycle calm teeth | xargs -P 2 -I{} sh ./render-story.sh {}
```

Voices: Mini = edge-tts `uz-UZ-MadinaNeural` -> STS `nUX4UWK0Tf1qh5zvFZWR`; Piku = `uz-UZ-SardorNeural` -> STS `EeQEodFZVtBkjtgK3HBc`;
`eleven_multilingual_sts_v2`, stability 0.5, similarity 0.8; rate -15 % (dynamic pieces -25 %), -16 LUFS (same as `scripts/voices/kid_voices_sts.py`).
Without a recording a line is timed from its length and the film still plays.

## The first twelve cartoons

They keep their old single narrator voice (the recordings inside the shipped videos, copied bit for bit). Turning them into Mini and Piku
conversations needs a dialogue script per cartoon in `marketing/shorts/dialogue.json` (same format as the lessons), a scene list per script in
`src/stories2.ts` style, and the same recording sequence: about 300-350 credits each, 12 of them about 4 000 credits.
