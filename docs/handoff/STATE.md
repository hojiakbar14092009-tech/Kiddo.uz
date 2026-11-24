# STATE (yangilangan: 2026-11-24, B2 oxiri)

Branch: `feat/capacitor-codemagic` (push yo'q). Keyingi bosqich: **B3** (ovozni butun ilovaga ulash + Pro'ni yashirish).

## Bajarilgan
- B0: inventar va reja (`PLAN.md`, `MAP_B0.md`, `STORE_STATUS.md`, `SKILLS.md`, `DECISIONS.md`, `HUMAN_TODO.md`, `docs/voice/ZEHN_METHOD.md`).
- B1 (`REPORT_B1.md`): vitest yashil, 3 ma'lum e2e flake, e2e bazasi va yuklanish vaqtlari.
- B2 (`REPORT_B2.md`): `voiceConfig.json`, `GET /api/tts` (Azure, ruxsat ro'yxati, CDN kesh), `say()` zaxira zanjiri, prefetch API, iOS unlock, `build:native` (ovozsiz paket), Q/G'/K pilot + `LISTEN.md`, `STATIC_VOICE_USERS.md`. Commitlar: 50a28491, 7f4fa76b, ab268941, bf62e0f5.

## Qolgan
B3–B9 (`PLAN.md` 3-bo'lim). B2 dan B3 ga o'tganlar: prefetch va maskot "o'ylayapti" holatini ekranlarga ulash; har ekran uchun rol (Mini/Piku/narrator); yordamchi rollar konfiguratsiyasi; 320 px speaker/Help ustma-ustligi.

## O'lchovlar
- Native `dist/`: 355 MB → **104 MB** (`video/` 57 MB, B4; qolgani ~47 MB).
- Statik klip, production CDN, O'zbekistondan: MISS 1.82 s, HIT 0.57–0.84 s. Jonli `/api/tts` o'lchanmagan.
- Vitest: **1 916 / 1 916** yashil (177 s, `maxWorkers: 6`). Yuklama ostida admin/parent timeout'lari hali ham ba'zan chiqadi (alohida 22/22 o'tadi).
- E2E `speech.spec.ts`: 15 o'tdi, 4 yiqildi (B1 bilan bir xil). Til testi tuzatildi (phone'da o'tdi). Overlap — haqiqiy UI xatosi, ochiq.

## Ma'lum muammolar
- Jonli ovoz Azure kalitisiz 503 beradi → ilova yozuv + qurilma ovozi bilan ishlaydi (HUMAN_TODO).
- Edge TTS endpointi Node'dan v1 token bilan 403; edge-tts faqat lokal Python skriptlarda (pilot, generate.py) ishlaydi.
- 320 px da `learn-speak` va Help tugmalari ~9 px ustma-ust (`LearnShell.tsx:137`).
- E2E qolgan yiqilishlar (B1 ro'yxati: math-lab, performance budget, release-matrix, garden, scale-portal, PRO promo, production admin, tutor, pet-shop, living-mascots, attention) — sabablari tekshirilmagan.
- Native'da kirish ishlamaydi (B7); native'da oflayn ovoz keshi (WebView HTTP kesh) tasdiqlanmagan.
- RAM: vitest va e2e ni bir vaqtda ishga tushirma; e2e faqat `--workers=1`.
- `server/auth.ts:219`, `server/telegram.ts:215` oxlint `rules-of-hooks` (`useCode`) — B2 dan oldin bor.
