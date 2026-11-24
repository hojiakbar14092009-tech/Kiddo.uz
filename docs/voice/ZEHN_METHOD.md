# ZEHN ovoz usuli (faqat o'qish uchun tahlil)

Manba: `C:\Users\del\Desktop\AI suhbat` (ZEHN). Yo'llar ZEHN ildiziga nisbatan; Kiddo yo'llari `Kiddo.uz` ildiziga nisbatan.
Asosiy xulosa: ZEHN edge-tts ishlatmaydi. U Google Gemini TTS ishlatadi. `edge-tts`, `msedge-tts`, `Madina`, `Sardor`, SSML ZEHN `src/` ichida topilmadi (grep).

## Xizmat va kutubxona

- Jonli suhbat: Gemini Live API, `speechConfig.prebuiltVoiceConfig.voiceName` (`src/app/api/live/token/route.ts:148-150`); modellar env orqali (`src/config/models.ts`: `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_FALLBACK_MODEL`).
- Audio xulosa va ovoz namunasi: `@google/genai` SDK, Interactions API (`ai.interactions.create`, `apiVersion: "v1beta"`), `response_format: { type: "audio" }` (`src/features/report/audio.ts:103-124`, `src/features/zarra/sample.ts:15-41`).
- Model: `gemini-3.8-flash-tts`; zaxira `gemini-3.8-flash-lite-tts` (`src/config/summary.ts:3-7`).
- Sabab: `generateContent` + `speechConfig` 400 berdi, v1 da 404 (`docs/DECISIONS.md:132`).

## Ovozlar

- Tilga qarab alohida ovoz YO'Q: bitta Gemini ovozi uch tilda (uz/ru/en) gapiradi; til matnning o'zidan aniqlanadi (`src/config/summary.ts:9`, `src/config/voice.ts:15-16`). Tilga mos ovoz tanlash kodda topilmadi.
- Audio xulosa (ikki so'zlovchi): `A` = Kore, `B` = Puck (`src/config/summary.ts:9`).
- Jonli ovoz ro'yxati: Kore (standart), Puck, Charon, Aoede (`src/config/voice.ts:15-16`); Zarra do'konida Puck/Charon/Aoede narxli (`src/config/zarra.ts:40-42`).
- Ovoz namunasi matnlari: uz "Salom! Men ZEHN. Keling, birga mashq qilamiz.", ru, en (`src/config/zarra.ts:54-58`).
- Uzbek "Northern Uzbek" rasmiy hujjatda qo'llab-quvvatlanadi; real sinovda STT orqali talaffuz 5/5 (`docs/DECISIONS.md:131`).

## Parametrlar

- rate/pitch/volume/style/SSML: kodda YO'Q. Tezlik Live API'da parametr emas, system instruction orqali: `speeds: slow|normal|fast` (`src/config/voice.ts:17-19`).
- Format: Gemini WAV qaytaradi (`mime_type ?? "audio/wav"`, base64) (`src/features/report/audio.ts:128-131`); bitrate sozlanmaydi. Live chiqish 24 kHz, kirish 16 kHz PCM (`src/config/voice.ts:4-6`).
- Ssenariy uzunligi: 950-1500 belgi (~58-90 s), ~16-17 belgi/s, 6-12 qator, qator <= 400 belgi (`src/config/summary.ts:11-18`).
- Cheklov: TTS kamida ikki speaker talab qiladi (bittasi bo'lsa 400); namunada B ishlatilmaydi (`src/features/zarra/sample.ts:8-9`). Speaker nomlari lotincha (`A`/`B`), kirill 400 berdi (`src/config/summary.ts:8`).

## Qayerda ishlaydi / kalitlar (faqat nomlar)

- TTS serverda (Next.js API route): `POST /api/sessions/[id]/audio`, `POST /api/zarra/sample` (`src/app/api/sessions/[id]/audio/route.ts`, `src/app/api/zarra/sample/route.ts`). Jonli suhbat brauzerdan, serverda berilgan ephemeral token bilan (`src/app/api/live/token/route.ts`).
- Env nomlari: `GEMINI_API_KEY` (shart; yo'q bo'lsa xato, `audio.ts:92`), `GEMINI_TTS_MODEL`, `GEMINI_TTS_FALLBACK_MODEL`, `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_FALLBACK_MODEL`, `GEMINI_TEXT_MODEL`, `GEMINI_TEXT_FALLBACK_MODEL`.

## Kesh va zaxira

- Audio xulosa: ssenariy 1 marta DB'da; audio DB'ga yozilmaydi, brauzer Cache Storage'da `zehn-audio-summary` (`src/config/summary.ts:19`, `src/app/api/sessions/[id]/audio/route.ts:22`, `docs/HANDOFF.md:169`).
- Namuna: har ovoz/til bir marta; server xotirasi + brauzer keshi (`cache-control: private, max-age=86400`), `sampleCacheVersion = 1`; parallel so'rovlar bitta chaqiruvga birlashadi; xatodan keyin 60 s qayta urinilmaydi (`src/config/zarra.ts:53-63`, `src/app/api/zarra/sample/route.ts:21-25,42,68`).
- Zaxira: asosiy model 429/5xx bersa `-lite-tts` modeli; ikkalasi 429 bo'lsa "limit" + ssenariy matni (`src/features/report/audio.ts:90-101`, `src/app/api/sessions/[id]/audio/route.ts:84-85`).
- Kvota: bepul tarifda har TTS modeli kalitga 10 so'rov/kun (real 429 xabaridan); foydalanuvchiga kuniga 2 (`docs/DECISIONS.md:133`, `src/config/summary.ts:4,10`). TTS xatosida kredit qaytadi (`src/features/session/quota.ts:90`).

## Normalizatsiya

- ZEHN'da o'zbek matn normalizatsiyasi (Q, Gʻ, Oʻ, apostrof, raqamlarni so'zga) TOPILMADI. Faqat Live transkriptsiya uchun til ishorasi `uz-UZ/ru-RU/en-US` va noto'g'ri yozuv filtri (`src/config/voice.ts:10`, `docs/DECISIONS.md:180`). Ma'lum yagona qoida: speaker nomi lotincha bo'lsin.

## Kiddo'dagi hozirgi dvigatel bilan farq

Kiddo (commit 5926b537): `scripts/voices/generate.py --engine edge`, `edge-tts` (kalitsiz, Microsoft Edge Read Aloud kanali).
- Ovozlar: uz `uz-UZ-MadinaNeural`, ru `ru-RU-SvetlanaNeural`, en `en-US-JennyNeural` (`scripts/voices/generate.py:149`); ZEHN'da tilga bog'liq ovoz yo'q.
- Parametr: `rate='-15%'` (bolalar uchun sekinroq), 60 s timeout, 1 qayta urinish; keyin ffmpeg: `loudnorm=I=-16`, 22050 Hz, mono, mp3 48k (`generate.py:152-173,134-146`). ZEHN: WAV, hech qanday ishlov yo'q.
- Ishlash joyi: Kiddo oflayn skriptda oldindan yozadi (mp3 fayllar, kalit yo'q); ZEHN serverda talab bo'yicha (kalit `GEMINI_API_KEY`).
- Normalizatsiya: Kiddo'da bor, ZEHN'da yo'q. `scripts/voices/normalize_uz.py`: uz matn faqat lotin, `DEFAULT = 'apos_02bb'` (oʻ/gʻ -> ʻ, tutuq -> ʼ), raqamlar so'zga; `generate.py:159-160`: uz-UZ ovozlari kirillni o'qimaydi. Muqobillar: `mixed_qg` (q->қ, gʻ->ғ), `cyrillic`, `kazakh`.
- Kesh/zaxira: Kiddo'da mavjud mp3 qayta yozilmaydi (`--force` bundan mustasno), audiosiz yoki ffmpeg qulagan klip o'tkazib yuboriladi va qayta ishga tushirishda yana uriniladi (`generate.py:200-214`); ZEHN'da model zaxirasi va kvota.
- `docs/voice/PLAN-STAGE2.md` sarlavhalari: 2-bosqich rejasi (VoiceStudio), "Kerakli qarorlar", "Ish usuli", "Kompyuter uxlab qolmasligi uchun" (ZEHN bilan to'g'ridan-to'g'ri bog'liq emas).
- Xulosa: ZEHN usulidan ko'chirib olinadigan tayyor TTS yo'q (u Gemini va tilga bog'liq emas). Ko'chirish mumkin: kesh/zaxira g'oyalari va "A/B lotincha speaker" cheklovi (Gemini'ga o'tilsa).

## Tasdiqlanmagan

- Gemini ovozlari uz/ru/en'da Kiddo'ning bolalar auditoriyasi uchun yetarlimi: ZEHN'da faqat Kore uchun STT 5/5 yozilgan; Puck/Charon/Aoede uch tilda eshitib sinalmagan (`docs/HANDOFF.md:28`).
- Gemini TTS'da tezlik/ohang/uslub promptda berilishi mumkinmi: kodda ishlatilmagan, hujjat tekshirilmadi.
- Live ovozining tilga qanday moslashishi (matn tilidan) taxmin; kodda aniq til tanlash topilmadi.
- `docs/RESEARCH.md` va `docs/DECISIONS.md:212` dagi uzun satrlar o'qilmadi (grep qisqartirgan); u yerda qo'shimcha TTS qaydlari bo'lishi mumkin.
- ZEHN papkasi o'qish rejimida ko'rildi, hech narsa ishga tushirilmadi.
