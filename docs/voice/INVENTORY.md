# Ovoz inventari (0-bosqich, 2026-11-14)

To‘liq ro‘yxat: [`inventory.tsv`](inventory.tsv) — `lang, part, voice, key, text, file` (har klip bitta qator).
Qayta yaratish: `npx tsx --tsconfig tsconfig.app.json scripts/voices/inventory.ts > docs/voice/inventory.tsv`.
Manba — ilovaning o‘z ro‘yxati `childPhrases()` (`src/services/audio/childPhrases.ts`), ya’ni ilova aytadigan har gap.

## Jami

| ovoz | uz | ru | en | jami |
|---|---|---|---|---|
| narrator (standart, ayol ovozi) | 2517 | 2535 | 2442 | 7494 |
| Mini (qiz robot, `kid/girl`) | 983 | — | — | 983 |
| Piku (o‘g‘il robot, `kid/boy`) | 981 | — | — | 981 |
| **Ilova jami** | | | | **9458** (≈229 000 belgi) |
| Shorts (Remotion, `marketing/shorts/dialogue.json`) | 114 qator: `water` 16 yozilgan, 7 dars × 14 ovozsiz | | | 114 |
| Birinchi so‘zim: 12 kutilayotgan so‘z (`docs/shorts/VOICE-NEXT.md`) | 4 | 4 | 4 | 12 |
| Masshtab portali (yangi: chumoli, olma, mushuk, tarvuz, mashina, uy × nom + 1 jumla) | 12 | 12 | 12 | 36 |
| Bola tarbiyasi (`docs/tarbiya/CURRICULUM.md`) | ~1 800 | ~1 800 | ~1 800 | ~5 400 (taxmin, ssenariy tasdiqlangach aniq) |

## Bo‘limlar (narrator / Mini / Piku, uchala til birga)

Eng kattalari: `content.learn` 1866/13/13, `task` 759/187/187, `learnFirst` 582/116/116, `content.feelings` 571/1/1,
`content.dino` 435/1/1, `content.uzbekistan` 386/2/2, `mathLab` 377/129/127, `myStory.say` 273/91/91, `shop` 234/76/76,
`content.alphabet` 178/60/60, `mascot` 164/52/52, `feelings` 157/26/26, `tour` 135/0/0, `tutor` 116/30/30,
`content.numbers` 78/20/20, `sciGames.*` (~330 jami), qolganlari < 100. Aniq soni — `inventory.tsv` da `part` ustuni.

## Format, yo‘l, nomlash

- Fayl: `public/audio/voice/<til>/<kalit>.mp3`; Mini/Piku: `public/audio/voice/kid/{girl|boy}/<til>/<kalit>.mp3`.
- Kalit: `phraseKey(til, matn)` = FNV-1a 32-bit (`til \0 NFC-normallashgan matn`), 8 hex (`src/services/audio/phrases.ts`, Python nusxasi `scripts/voices/generate.py`). Matn o‘zgarsa kalit ham o‘zgaradi.
- Format: MP3, 22 050 Hz, mono, 40 kbps (narrator) / 48 kbps (Mini/Piku); hajm: `uz` 62 MB, `kid/girl/uz` 15 MB.
- Ovoz balandligi: `loudnorm I=-16 LUFS, TP=-1.5` (`generate.py` CLIP_CHAIN).
- Maskot taqsimoti: qiz bolaga Mini, o‘g‘il bolaga Piku ovozi (`src/services/audio/kidVoices.ts`); ularda yozuvi yo‘q gapda — narrator. Mini/Piku hozir faqat **uz**.
- Precache: `audio/voice/**` PWA precache’dan chiqarilgan, runtime cache qoidasi bor (`src/services/audio/voiceBuild.ts`, testi `voiceBuild.test.ts`) — 2-bosqich talabiga allaqachon mos.
- Shorts: `marketing/shorts/public/vo/<dars>/uz-<n>.wav` (48 kHz PCM), faqat uz.

## Hozirgi ovoz manbalari va qoidalar (ElevenLabs va boshqalar)

- narrator: Piper (`generate.py`: ru irina, en cori, uz — qozoq ISSAI orqali `uzbek.py` `to_kazakh_cyrillic`), keyinroq ixtiyoriy ElevenLabs `eleven_v3` (`elevenlabs.py`): stability 0.6, similarity 0.8, style 0.35, **speed 0.8** (bolalar uchun sekin).
- Mini/Piku: edge-tts `uz-UZ-MadinaNeural` / `uz-UZ-SardorNeural` → ElevenLabs Speech-to-Speech (`kid_voices_sts.py`), stability 0.5, similarity 0.8, tezlik −15 % (dinamik qismlar −25 %), −16 LUFS.
- Bolaga aytiladigan gap ≤ 8 so‘z (`childVoice.test.ts`); harf → pauza → so‘z, pauza `pace.ts` da (yoshga qarab 650–1100 ms).

## Topilgan muammo (taxmin emas, o‘lchangan)

- Hozirgi kod aytadigan **1 797 narrator gapining fayli yo‘q** (uz 602, ru 608, en 587): asosan `content.feelings` 568, `content.uzbekistan` 380, `mathLab` 240, `learnFirst` 215. `scripts/voices/phrases.json` 2026-11-04 dan beri yangilanmagan. Ilova klipsiz gapni jim o‘tkazadi. 2-bosqichda bular ham yaratiladi.
- Masshtab portali hozir «hujayradan galaktikagacha» (`src/features/scalePortal`); 6 buyumli (chumoli → uy) versiya — yangi kontent, 2-bosqichda.
