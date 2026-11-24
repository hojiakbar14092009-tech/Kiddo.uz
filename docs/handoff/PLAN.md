# Kiddo v3 reja (B0 natijasi, 2026-11-24)

Manba: `docs/MASTER_PROMPT_V3.md` (spec). Branch: `feat/capacitor-codemagic` (DECISIONS.md). Push yo'q.
Yordamchi hujjatlar: `MAP_B0.md` (Pro/ovoz/klip joylari), `STORE_STATUS.md` (rasmiy talablar), `docs/voice/ZEHN_METHOD.md`, `STATE.md` (o'lchovlar).

## 1. Tayyor ish va master prompt talablari (B0 inventari)

Belgilar: **mos**, **mos emas** (qaysi bosqichda tuzatiladi), **tekshirilmagan**.

### Capacitor (c105f044)
| Talab | Holat | Dalil / izoh |
|---|---|---|
| Capacitor joriy barqaror (9-bo'lim 9) | mos | 8.6.2 = npm latest; 9 hali rc (STORE_STATUS.md) |
| Veb-kod paket ichida, masofadagi sayt emas (9.1) | mos | `capacitor.config.ts`: `webDir: 'dist'`, `server.url` yo'q |
| Android SDK 24/36/36, iOS 15 (9.9) | mos | `android/variables.gradle`, STORE_STATUS.md (Play API 36, Apple iOS 13+ min) |
| Native'da PWA service worker o'chiq (B7) | mos | `src/app/registerServiceWorker.ts:19` |
| Android/iOS loyihalari build bo'ladi | tekshirilmagan | lokal SDK/Java/Mac yo'q; birinchi Codemagic run |
| Splash, ikonka (9.1) | mos emas → B7 | Capacitor standart ikonkalari |
| Safe-area, status bar, orqaga tugmasi, oflayn ekran, haptika/ulashish (9.1) | mos emas → B7 | faqat core/android/ios/cli plaginlari o'rnatilgan |
| API manzili native'da | mos emas → B7 | `src/services/cloud/api.ts` nisbiy `/api`, cookie same-origin: WebView'da ishlamaydi |
| Native Google kirish + Sign in with Apple (9.3) | mos emas → B7 | kod yo'q; `@capgo/capacitor-social-login` 8.7.13 Cap 8 ni qo'llaydi |
| Email kod, Telegram deep link ilovada (9.3) | tekshirilmagan → B7 | |
| Akkauntni o'chirish (9.4) | tekshirilmagan → B7 | `server/router.ts`, `AccountPanel.tsx` da bor; veb-sahifa va to'liq o'chirish tekshirilmadi |
| `PrivacyInfo.xcprivacy` (STORE_STATUS) | mos emas → B7 | fayl yo'q |
| appId bitta joyda (9.10) | qisman | `capacitor.config.ts` asosiy, lekin `android/app/build.gradle`, `ios/.../project.pbxproj`, `codemagic.yaml` da nusxa (Capacitor sxemasi); tasdiq HUMAN_TODO da |
| Paketdagi audio minimal (13, 10) | mos emas → B2 | `dist/audio` 251 MB paketga tushadi (pastda) |

### Codemagic / CI (c105f044)
| Talab | Holat | Dalil / izoh |
|---|---|---|
| iOS: Codemagic, shaxsiy akkaunt M2, API kaliti bilan imzo (B8) | mos | `codemagic.yaml` `ios`, `mac_mini_m2` rasmiy kalit (STORE_STATUS) |
| iOS build faqat qo'lda/teg bilan | mos | `codemagic.yaml` da `triggering` yo'q = faqat qo'lda |
| Android AAB Linux runner'da (B8) | mos emas → B8 | hozir Codemagic M2 da (bepul daqiqani yeydi); GitHub Actions `ubuntu-latest` ga ko'chirish |
| GitHub Actions: lint, tiplar, unit, e2e, build; Dependabot (B8) | mos emas → B8 | `.github/workflows/` da faqat `owner-task.yml` |
| GitHub Actions macOS zaxira (B8) | mos emas → B8 | yo'q |
| Xcode 26+, Node 22+ | mos | `xcode: latest`, `node: 22` |
| Secret nomlari HUMAN_TODO da | mos | `HUMAN_TODO.md` |

### Ovoz (5926b537, d66096c2)
| Talab (10-bo'lim) | Holat | Dalil / izoh |
|---|---|---|
| ZEHN usuli asos | mos emas (qaror bilan) | ZEHN = Gemini TTS (kalit, ~10 so'rov/kun); Kiddo = edge-tts. Qaror DECISIONS.md |
| Jonli sintez + umumiy server kesh, paketga audio solinmaydi | mos emas → B2 | 15 979 mp3 oldindan yaratilgan, `public/` da |
| Kesh kaliti = matn+til+ovoz+parametr versiyasi | mos emas → B2 | `phraseKey(text)` FNV-1a faqat matndan (MAP_B0.md), til papka bo'yicha |
| Endpoint ixtiyoriy matnni sintez qilmaydi, rate limit | mos emas → B2 | endpoint yo'q |
| Zaxira zanjiri, ovoz xatosi ekranni qotirmaydi | tekshirilmagan → B2 | |
| Bitta format, mono MP3 (Opus yo'q) | mos | 48 kHz mono, loudnorm (ZEHN_METHOD.md) |
| Bitta konfiguratsiya fayli (rol → ovoz, tezlik, balandlik) | tekshirilmagan → B2 | `scripts/voices/generate.py` ichida |
| Tezlik 3 variant (90/80/70%) | mos emas → B2 | faqat `rate -15%` |
| Mini va Piku asosiy ovozlar | qisman | `kid/girl` 1 111, `kid/boy` 1 109 klip; tabiiyligi eshitilmagan |
| Q/G'/K: 4 yozuv sinovi, normalizatsiya | qisman | `normalize_uz` ʻ yozuvida; 4 yozuv solishtirilmagan, `LISTEN.md` yo'q |
| iOS birinchi bosishda audio ochish | tekshirilmagan → B2 | `SpeechUnlock` faqat speechSynthesis'ni ochadi (MAP_B0.md) |

## 2. B2 uchun statik mp3 dan o'tish rejasi

O'lchov (B0): `public/audio/voice` = **15 979 mp3, 214.8 MB** (uz 63.8 MB / 4 629, ru 71.3 / 4 616, en 55.5 / 4 514, kid/girl 12.4 / 1 111, kid/boy 11.8 / 1 109). Hammasi git'da. `dist/audio` 251 MB (blok bilan), `dist/` jami 355 MB. PWA ularni precache qilmaydi (`vite.config.ts:127` `VOICE_GLOB_IGNORES`, runtime kesh), lekin Capacitor `dist/` ni to'liq paketga oladi: native ilova ~215 MB audio bilan chiqadi. Bu 10-bo'lim va 13-bo'limga zid.

Asosiy fikr: mavjud fayllar "issiq server keshi" bo'ladi, o'chirilmaydi. Vercel CDN'dagi xeshli statik fayl = 10-bo'limdagi "hamma uchun umumiy kesh + CDN sarlavhalari". Jonli sintez faqat keshda yo'q ibora uchun.

Vazifalar (tartib bilan, har biri o'z testi bilan):
1. **Ovoz konfiguratsiyasi** `src/services/audio/voiceConfig.ts` (yangi, bitta joy): rol → `{ engine, voice, rate, pitch }`, `VOICE_PARAMS_VERSION`. `generate.py` shu faylni o'qiydi (JSON eksport). Test: har rol uchun 3 til ovozi bor.
2. **Kesh kaliti** `voiceKey(text, lang, role, version)`; eski `phraseKey(text)` fayllari uchun moslik: `version = 0` bo'lsa eski yo'l `audio/voice/<lang>/<phraseKey>.mp3`. Fayl nomlari o'zgarmaydi, ko'chirilmaydi. Test: eski kalit bilan aynan hozirgi URL chiqadi.
3. **Native paketdan chiqarish**: native build uchun `dist/audio/voice` paketga kirmasin (masalan `cap sync` dan oldin native webDir'ga nusxa ko'chirishda filtr yoki Vite `publicDir` filtri). Bu faqat build chiqishiga tegadi, `public/` dagi manbaga emas. Native'da ovoz URL bazasi `https://<sayt>/audio/voice/...` (absolyut). Test: native build'dan keyin `android/app/src/main/assets/public/audio/voice` yo'q, hajm o'lchanadi (maqsad: paket < 60 MB, video B4 da).
4. **Jonli TTS yo'li** `api/index.ts` dispatcher ichida `tts` route (yangi funksiya yo'q, 12 limit): faqat ruxsat etilgan ibora xeshlari (build vaqtida yaratilgan manifest) yoki imzo; dinamik qism (bola ismi) ≤ 24 belgi, harf/bo'shliq; mavjud `server/` rate limit qayta ishlatiladi. Keshda yo'q bo'lsa edge-tts (Node, kalitsiz) bilan sintez, natija tekin saqlash joyiga (variantlar va limitlari B2 boshida rasmiy hujjatdan tekshiriladi: Vercel Blob Hobby, Turso blob, git'dagi statik fayl), `Cache-Control: public, max-age=31536000, immutable`. Test: ruxsatsiz matn 400/403, limitdan oshganda 429, kesh topilsa sintez chaqirilmaydi.
5. **Zaxira zanjiri** `audioManager.say()` (`src/services/audio/audioManager.ts:135`, yagona almashtirish nuqtasi): statik/CDN → jonli `tts` → qurilma keshi (Cache Storage) → ovozsiz (matn + animatsiya). Har bosqichda timeout; xato hech qachon ekranni ushlab turmaydi. Test: har bo'g'in ishlamaganda keyingisiga o'tadi, oxirida `say()` resolve bo'ladi.
6. **Prefetch va kutish holati**: ekran ochilganda keyingi iboralar oldindan yuklanadi; yuklanayotganda maskot "o'ylayapti". Kechikish o'lchanadi (bosish → ovoz).
7. **iOS audio unlock** Howler/HTMLAudio uchun birinchi bosishda (MAP_B0.md 4-xavf).
8. **Q/G'/K pilot**: 4 yozuv × manba × ovoz × 3 tezlik namunalari `%USERPROFILE%\voice-test\v3\` ga, `docs/voice/LISTEN.md`, HUMAN_TODO.
9. **Eski statik ovozdan foydalanadigan joylar ro'yxati** (53 fayl, MAP_B0.md) B3 uchun. Hech narsa o'chirilmaydi; o'chirish ro'yxati B3 oxirida HUMAN_TODO ga.

Bog'liqlik: 1 → 2 → (3, 4 parallel) → 5 → 6, 7; 8 mustaqil (parallel subagent). Umumiy fayllarni (`api/index.ts`, `package.json`, `audioManager.ts`) faqat asosiy sessiya o'zgartiradi.

Xavf: edge-tts norasmiy endpoint Vercel'dan bloklanishi mumkin (tasdiqlanmagan) → zaxira: statik fayl + ovozsiz rejim. Matn o'zgarsa eski mp3 yetim qoladi (MAP_B0.md 3-xavf) → manifest + `generate.py` bitta konfiguratsiyadan.

## 3. Bosqichlar (B1–B9)

| Bosqich | Aniq vazifalar | Bog'liq | Parallel |
|---|---|---|---|
| **B1** testlar yashil | Vitest 7 yiqilgan (STATE.md): 3 ta timeout (admin), "router is still loading", `store.createIndex is not a function` (IndexedDB mock), `parent.test` `/parent` ≠ `/parent/login` (haqiqiy xato bo'lishi mumkin), Math/Dino. React "duplicate key" ogohlantirishlari (birthday, award, CoinBadge). E2E: "coins", opening "key/tap skips", homework "planet" (`.claude/mvp-progress.md:206,240`). Har biri ildiz sababi + regressiya. E2E bazasi B1 boshida o'lchanadi | — | admin testlari / parent / Math+Dino / e2e: 4 subagent |
| **B2** ovoz dvigateli | 2-bo'lim | B1 | 8-vazifa parallel |
| **B3** ovozni ulash + Pro yashirish | 53 chaqiruv joyi yangi `say()` ga; matnlar 3 tilda; `VITE_PRO_VISIBLE` bitta bayroq, mavjud `VITE_PUBLIC_PRO_UI`/`FREE_IN_DEMO`/`demoMode` bilan birlashtiriladi (MAP_B0.md 2-xavf), `entitlementFor` (`src/domain/entitlements/features.ts:53`) markaziy kalit; bayroqsiz ~20 joy; ikki holat testi; "pro/premium/tarif/obuna/subscription" grep isboti | B2 | Pro va ovoz ulash: 2 oqim (fayllar ajratilgan) |
| **B4** klip/shorts (B4a/b/c) | rang tokenlari (`index.css` + Remotion dublikatini birlashtirish), maskot rig, ma'lumotga asoslangan sahna tizimi, ilovaga Remotion Player, 20 shorts mp4 (57 MB) o'rniga jonli; Tarbiya 30 kun × 3 mashq + 3 klip, `ShortId` va `FREE_SHORTS=2` cheklovini olib tashlash | B2, B3 | kunlar guruhi bo'yicha subagentlar |
| **B5** tezlik/hajm | bazaviy raqamlar STATE.md da; 22 GLB (7.2 MB) siqish, lokal dekoderlar; `vision_wasm` 2×13–14 MB faqat diqqat yordamchisida lazy; 266 webp/112 svg; backend so'rovlar soni/vaqti | B4 | rasm / 3D / backend |
| **B6** clean code | dublikat, o'lik kod (Supabase qoladi), tiplar, xato boshqaruvi | B5 | modul bo'yicha |
| **B7** Capacitor (qolgani) | 1-bo'limdagi "mos emas → B7" qatorlari; Android lokal build (RAM yetsa) yoki APK + HUMAN_TODO | B3 (Pro), B2 (audio paketdan tashqari) | plaginlar / kirish / o'chirish |
| **B8** CI/CD | GitHub Actions (lint, tsc, unit, e2e, build, Android AAB Linux), Dependabot, macOS zaxira; Codemagic faqat iOS | B1 (yashil baza), B7 | — |
| **B9** do'kon + regressiya | 9-bo'lim jadvali, materiallar, to'liq regressiya | hammasi | ekran guruhlari bo'yicha |

Bosqich tartibi o'zgarmaydi: B1 → B9. B7/B8 ning tayyor qismi qayta qilinmaydi, faqat jadvaldagi "mos emas" qatorlari bajariladi.
