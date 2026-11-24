# REPORT B2: ovoz dvigateli (2026-11-24)

Branch `feat/capacitor-codemagic`, push yo'q. Commitlar: 50a28491, 7f4fa76b, ab268941, bf62e0f5 (+ shu handoff commiti).

## Nima qilindi
| # | Vazifa | Natija |
|---|---|---|
| 1 | Bitta ovoz konfiguratsiyasi | `src/services/audio/voiceConfig.json`: rol (`narrator`, `girl`=Mini, `boy`=Piku) → `engine`, `voices{uz,ru,en}`, `rate`, `pitch`, `version` (har rolda alohida). `generate.py` shu fayldan o'qiydi. Yordamchi rollar (ona, ota, buvi, bobo, Laylo, Ali) kodda hali yo'q → B3. |
| 2 | Kesh kaliti | Alohida `voiceKey` xeshi yozilmadi: kalit = URL `/api/tts?lang&role&v&text` (CDN uni kalit qiladi). `version 0` = aynan hozirgi fayl yo'llari (`phraseKey` o'zgarmagan, fayllar ko'chirilmagan). Rol versiyasi > 0 → shu rolning statik fayllari ishlatilmaydi (`recordedVoiceIsCurrent`). |
| 3 | Native paketdan ovozni chiqarish | `npm run build:native` (`--mode native`, `.env.native`: `VITE_VOICE_BASE=https://kiddo-uz.vercel.app`), mavjud `dropPublicVoice` plagini qayta ishlatildi, `public/` ga tegilmadi. codemagic.yaml shu skriptga o'tdi. `/audio/*` ga CORS `*`. **O'lchov:** `dist/` 355 MB → **104 MB** (shundan `video/` 57 MB = B4; qolgani ~47 MB < 60 MB maqsad). `android/.../assets` hajmi o'lchanmadi (`cap sync` lokal ishlatilmadi). |
| 4 | `GET /api/tts` (`server/tts.ts`, dispatcher ichida) | Ruxsat: faqat `scripts/voices/phrases.json` dagi gap (normallashtirilgan MATN bilan solishtiriladi). Bola ismi qabul qilinmaydi (DECISIONS). 400 (til/rol/versiya/matn/noma'lum parametr), 403 (ruxsatsiz), 429 (30/daqiqa/IP, xotirada), 503 (kalit yo'q, `no-store`). Sintez: **Azure Speech REST** (edge-tts emas, sababi pastda). Kesh: `public, max-age=31536000, s-maxage=31536000, immutable` (Vercel CDN) + har instansiyada 200 ta. |
| 5 | Zaxira zanjiri `say()` | yozuv → jonli `/api/tts` → qurilma ovozi → ovozsiz. Yozuv yuklanmasa ham jonliga, keyin qurilmaga o'tadi. Har bo'g'in `LOAD_TIMEOUT_MS` (10 s); jonli xato bo'lsa 60 s qayta urinilmaydi. `say()` doim resolve. Private rejim o'zgarmagan. Veb: SW `kiddo-voice` keshi `/api/tts` ni ham saqlaydi (qurilma keshi). Native: WebView HTTP keshi (tasdiqlanmagan). |
| 6 | Prefetch + kutish + kechikish | `audioManager.prefetch(texts, lang)` (jim, xato bermaydi), `startDelayMs()`. Status `loading` avvaldan bor (speaker spinner). **Prefetch hech bir ekranga ulanmagan, maskot "o'ylayapti" holati ulanmagan → B3.** Kechikish: production CDN statik klip O'zbekistondan MISS 1.82 s, HIT 0.57–0.84 s (curl, 3 marta). Jonli yo'l kechikishi o'lchanmadi (kalit yo'q, deploy yo'q). |
| 7 | iOS audio unlock | `SpeechUnlock` birinchi bosishda `speech.unlock()` + `audio()` (Howler'ning yagona AudioContext'ini yaratib resume qiladi). Howler o'z tinglovchilarini faqat birinchi `Howl` yaratilganda qo'yadi, shuning uchun kerak edi. Haqiqiy iPhone'da sinalmagan. |
| 8 | Q/G'/K pilot | `%USERPROFILE%\voice-test\v3\edge_*.mp3` 21 fayl (Madina/Sardor × ʻ ’ ' × 90/80/70% + 3 rol × 30 gap), `scripts/voices/pilot_v3.py`, `docs/voice/LISTEN.md`, HUMAN_TODO. **Kirill varianti Edge uz-UZ ovozlarida umuman audio bermadi** (6 fayl, 2 urinish). O'zbekcha audio avtomatik tekshirilmagan. Pilot subagenti o'zi yaratgan 0 baytli 6 kirill faylni o'chirgan (faqat o'zinikini). `v3/` da avvaldan bor fayllarga tegilmagan. |
| 9 | Statik ovoz foydalanuvchilari | `docs/voice/STATIC_VOICE_USERS.md` (47 chaqiruvchi fayl + bevosita URL joylari). Hech narsa o'chirilmadi. |

## Muhim qaror: nega edge-tts emas, Azure
Node'dan Edge endpointga v1 token bilan ulanish: **403** (2 versiya bilan sinaldi). edge-tts 7.3.1 endi v2 token ishlatadi: ~450 qatorlik obfuskatsiyalangan SHA256+CS64. Uni faqat norasmiy npm paketlar kuzatadi; ularni sinab ishga tushirishni xavfsizlik klassifikatori to'xtatdi (begona kod). Azure F0 rasmiy, 0.5 mln belgi/oy bepul (pricing sahifasi tekshirildi), xuddi shu neural ovozlar. Kalit HUMAN_TODO da. Kalitsiz ilova to'liq ishlaydi (yozuv + qurilma ovozi).

## Haqiqatan nima test qilindi
- `npx tsc -b`: 0 xato (oxirgi o'zgarishdan keyin, yangidan).
- `npx oxlint` o'zgargan fayllarda: 0. Prettier: o'zgargan fayllar formatlangan. (`server/auth.ts`, `telegram.ts` dagi 2 ta eski `rules-of-hooks` xatosi B2 dan oldin bor, tegilmadi.)
- Vitest to'liq: **1916/1916 yashil** (177 s, 3-yugurish). 1-yugurish: 7 qizil (2 tasi tts RED holati, 5 tasi admin/parent timeout — alohida 22/22 o'tdi, parallel `tsc` CPU yuklamasi). 2-yugurish: 1 qizil `findHome` "Нашла!" → ildiz: rus chunk'i kutilmagan, `findByRole` bilan tuzatildi.
- Yangi testlar: `server/tts.test.ts` 14 (200/kesh sarlavhasi, bir marta sintez, 403, xesh to'qnashuvi 403, noma'lum parametr 400, 5×400, 429, 503 no-store, ʻ normalizatsiya), `voiceChain.test.ts` 9 (zanjirning har bo'g'ini, ism yuborilmaydi, clipsOnly, prefetch), `SpeechUnlock.test.tsx` 1, `voiceBuild.test.ts` +2 assert. Hammasi avval RED ko'rildi.
- `npm run build:native`: exit 0, `dist/audio/voice` yo'q, bundle'da `kiddo-uz.vercel.app` bor.
- E2E `speech.spec.ts --workers=1`: 15 o'tdi, 4 yiqildi (B1 bazasi bilan bir xil 2 test × 2 proyekt). Sabablar: (a) til testi eskirgan — `6a9f0634` uchta til tugmasini bitta tugmaga yig'gan; test tuzatildi, phone proyektida o'tdi (tablet qayta yugurilmadi); (b) **haqiqiy UI xatosi**: 320 px da speaker (y 139–195) "Help" tugmasi (y 186–242) bilan bir x da ~9 px ustma-ust (`LearnShell.tsx:137` ustun). Ildizi aniqlanmadi, tuzatilmadi.
- Mustaqil tekshiruvchi (ecc:code-reviewer, toza kontekst): 1 jiddiy topilma — ruxsat ro'yxati 32-bit FNV xesh bo'yicha edi, to'qnashuv offline ~3.7 mln urinishda topildi (`"Buy pills 27sh7"`). Tuzatildi (matn bo'yicha) + regressiya testi. Noma'lum parametr (CDN fan-out) ham tuzatildi. "v < joriy versiya qabul qilinadi" ataylab qoldirildi (eski native ilovalar jonli ovozni yo'qotmasin; fan-out versiyalar soni bilan cheklangan).
- Tekshirilmagan: haqiqiy Azure chaqiruvi (kalit yo'q; faqat soxta sintez bilan), production'dagi `/api/tts`, native qurilmada ovoz/oflayn kesh, iPhone unlock, 3 til × viewport bo'yicha to'liq e2e, edge holatlar (sekin tarmoq) brauzerda.

## Chaqirilgan skill va subagentlar
- `ponytail:ponytail` (ultra): talabni so'roq qilish — `voiceKey` xeshi, Blob/Turso saqlash, ism endpointi, Howler unlock kodi yozilmadi.
- `zizi-skills:security-and-hardening`: ishonch chegaralari, negativ+pozitiv testlar, dependency intake (begona DRM paket qo'shilmadi).
- `superpowers:test-driven-development`: har yangi kod RED → GREEN.
- `superpowers:verification-before-completion`: yakuniy dalillar.
- `zizi-skills:i18n` chaqirilmadi: B2 da tarjima kaliti o'zgarmadi.
- Subagentlar: Sonnet (Q/G'/K pilot), `ecc:code-reviewer` (mustaqil tekshiruv).

## Qolgan blokerlar
- Azure kaliti (HUMAN_TODO). Pilotni eshitib tanlash (HUMAN_TODO).
- B3 ga o'tadi: prefetch va maskot "o'ylayapti" holatini ekranlarga ulash, rol tanlash, yordamchi rollar, 320 px speaker/help ustma-ustligi.
