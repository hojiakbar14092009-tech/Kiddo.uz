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

## Ilova: «Birinchi so‘zim» uchun 12 ta ovozsiz so‘z (MVP, 2026-11-13)

Sobiq Tomorqa bo‘limining sodda so‘zlari «Birinchi so‘zim» → `read` ro‘yxatiga (6 yosh) qo‘shilishi kerak, lekin ilova
PRO ovozni faqat yozib olingan klipdan ijro etadi (`src/features/learn/voiceCoverage.test.ts`): klipsiz qator jim qoladi.
Shuning uchun so‘zlar hali qo‘shilmadi. Har so‘zga bitta qator yoziladi (`copy.wordIs`), rasmlar `public/3d/` da bor.

| til | so‘z (`w(id, harflar, rasm)`) | yoziladigan qator |
|---|---|---|
| uz | `w('pomidor', 'P O M I D O R', 'tomato')` | Bu so‘z: «Pomidor». |
| uz | `w('qurbaqa', 'Q U R B A Q A', 'frog')` | Bu so‘z: «Qurbaqa». |
| uz | `w('savat', 'S A V A T', 'basket')` | Bu so‘z: «Savat». |
| uz | `w('chelak', 'Ch E L A K', 'bucket')` | Bu so‘z: «Chelak». |
| ru | `w('ptitsa', 'П Т И Ц А', 'bird')` | Это слово «Птица». |
| ru | `w('yozhik', 'Ё Ж И К', 'hedgehog')` | Это слово «Ёжик». |
| ru | `w('morkov', 'М О Р К О В Ь', 'carrot')` | Это слово «Морковь». |
| ru | `w('ulitka', 'У Л И Т К А', 'snail')` | Это слово «Улитка». |
| en | `w('bee', 'B E E', 'bee')` | The word is “Bee”. |
| en | `w('bird', 'B I R D', 'bird')` | The word is “Bird”. |
| en | `w('pear', 'P E A R', 'pear')` | The word is “Pear”. |
| en | `w('rose', 'R O S E', 'rose')` | The word is “Rose”. |

Tartib: so‘zlarni `src/features/firstWords/content.ts` `read` oxiriga qo‘shing → `npx tsx --tsconfig tsconfig.app.json
scripts/voices/collect.ts > scripts/voices/phrases.json` → uz: `python scripts/voices/kid_voices_sts.py --plan` (keyin `--budget`),
ru/en: amaldagi ElevenLabs ovozlari → `npx vitest run src/features/learn/voiceCoverage.test.ts` yashil bo‘lishi shart.
Taxmin: 12 qisqa qator ≈ 300 kredit.
