# Kiddo MVP — progress

Holat: 0–8 bajarildi; Turso migratsiyasi 1 o'tkazildi (2026-11-13). Email kirish SMTP_FROM kutadi. Keyingi: deploy + webhook + haqiqiy kirish sinovi (ega).
sessiya scratchpad'ida edi (repo'da emas).

## 0-bosqich: AUDIT (2026-11-12)

### 0.1 Baza va auth — TO'XTASH SHARTI ⚠️
- Kodda **Turso/libSQL yo'q, `/api` papka yo'q → Vercel funksiyalari soni 0**. `vercel.json` faqat SPA rewrite + xavfsizlik headerlari.
- Butun backend **Supabase**: `@supabase/supabase-js`, `supabase/migrations` 0001–0023 (RLS hamma jadvalda), 8 Edge Function
  (analytics, delete-account, owner-bot, telegram, tts, tutor, voice-url, worker), Supabase Auth (email+parol, Google OAuth,
  email-havola; PKCE, `/parent/auth`), Storage (`child-photos`, `ads`, audio), pg_cron (worker 1 daq., admin stats 10 daq.).
- **Production'da Supabase o'chiq**: kiddo-uz.vercel.app bundle'ida `isSupabaseConfigured = !1` (tekshirildi:
  `assets/config-*.js` → `var e=!1`). Ya'ni sayt hozir to'liq qurilmada (localStorage) + **demo rejimda** ishlaydi; bulutda
  production ma'lumoti yo'q → ko'chirishda yo'qoladigan server ma'lumoti ham yo'q (foydalanuvchi progressi faqat qurilmada).
- CSP `connect-src 'self' https://*.supabase.co` — Turso/`/api` uchun `'self'` yetadi.

### 0.2 Boshlang'ich o'lchov (production = lokal build bilan bir xil hash `index-D2UIKcgH.js`)
Sharoit: Playwright Chromium headless (GPU yo'q), 393×852 mobil, **4x CPU, sekin 4G (150 ms RTT, 1.6 Mbit/s)**, sovuq kesh,
SW bloklangan. Lighthouse CLI o'rnatilmagan → bir xil throttling bilan PerformanceObserver (LCP, longtask→TBT FCP'dan keyin).

| sahifa | FCP ms | LCP ms | TBT ms | JS KB | rasm KB | boshqa KB | jami KB | so'rov |
|---|---|---|---|---|---|---|---|---|
| / (til) | 6560 | 6560 | 21 | 401 | 0 | 0 | 493 | 84 |
| /home | 4580 | 4580 | 2569 | 749 | 59 | 108 | 1184 | 116 |
| /learn | 4308 | 4308 | 520 | 392 | 65 | 0 | 621 | 99 |
| /explore | 4544 | 4544 | 30 | 392 | 69 | 0 | 624 | 98 |
| /my-world | 5024 | 5024 | 260 | 392 | 99 | 0 | 706 | 109 |
| /alphabet | 4768 | 4768 | 26 | 393 | 0 | 0 | 557 | 87 |
| /learn/math | 4416 | 4416 | 2142 | 770 | 0 | 120 | 1107 | 112 |
| /math-lab | 4716 | 4716 | 39 | 476 | 15 | 0 | 653 | 110 |
| /learn/tales | 4696 | 4696 | 1963 | 724 | 62 | 77 | 1078 | 120 |
| /learn/space | 4760 | 6368 | 2300 | 769 | 183 | 131 | 1301 | 123 |
| /games | 5144 | 5144 | 166 | 394 | 83 | 0 | 641 | 104 |
| /shorts | 4056 | 4876 | 41 | 466 | 146 | 0 | 777 | 109 |
| /scale-portal | 4140 | 4444 | 1848 | 766 | 11 | 119 | 1165 | 110 |
| /parent | 3688 | 3980 | 0 | 392 | 0 | 0 | 556 | 85 |

Xulosa: (1) har sahifa **84–123 so'rov**, ~390 KB JS (ko'p mayda chunk zanjiri) → sekin 4G'da FCP ≈ 4–4,8 s; "/" da qo'shimcha
3,2 s ochilish animatsiyasi. (2) 3D sahifalarda +370 KB three.js + GLB va TBT 1,8–2,6 s (headless GPU'siz — real telefonda
kamroq, lekin baribir eng og'ir joy). (3) Rasm hajmi kichik (≤183 KB).
- Build: audio 14 191 fayl / 179,6 MB (keshga faqat ijro etilganda), video 64 / 55,9 MB, JS 5,7 MB (228 fayl).
- **SW precache: 581 fayl, 8,26 MB** (JS 3,67 MB) — birinchi tashrifda `load`dan keyin yuklanadi; sekin 4G'da ~40+ s kanalni band qiladi.
- **>200 KB fayllar (70 ta)**: 44 mp4 (0,85–2,49 MB; hammasi ≤3 MB, eng kattasi `uz/dayCycle.mp4` 2,49 MB), 22 GLB
  (235–405 KB: mascots ziyo 405, leafy 393, dinoo 375, lumi 371, pixel 292, astro 279, story 275, melo 272, kidobot 250,
  scribble 235; animals lion 401, cat 380, dinosaur 373, fox 364, unicorn 357, elephant 356, dog 355, bear 351, owl 336,
  turtle 329, rabbit 326, penguin 320), 4 JS (`face-api.esm` 1283 KB, `prepareRenderer` 530, `index` 514, `three.core` 368).
  Rasm/shrift/audio orasida 200 KB dan kattasi yo'q.
- GLB'lar **allaqachon** `EXT_meshopt_compression` + `KHR_mesh_quantization`, teksturasiz → qolgan imkoniyat: poligon
  soddalashtirish (simplify) va past sifat rejimi; Draco/KTX2 foyda bermaydi.

### 0.3 "Kashf et" bo'sh rangli kvadrat
- Karta rasmi = `Img3D` (`src/components/ui/Img3D.tsx:24`): oddiy `<img src="/3d/x.webp" loading="lazy" decoding="async" alt="">`,
  **onError yo'q, zaxira yo'q**; rang — ota `span` tint klassi (`PlaceGrid.tsx:63`). Ya'ni rasm kechiksa/yiqilsa faqat rangli kvadrat qoladi.
- Qayta hosil qilish (production, sekin 4G): Chromium phone/desktop, to'g'ridan-to'g'ri ochish → 13/11 ko'rinadigan ikonka 1,5 s da
  yuklangan; **ilova ichida o'tish SW o'rnatilayotganda → ikonkalar ~1,05 s bo'sh** (precache 8 MB bilan kanal talashadi).
  Doimiy bo'sh holat Chromium'da takrorlanmadi. Barcha 31 statik ikonka fayli mavjud.
- Ildiz sabab (kod + o'lchov): lazy rasm + zaxirasiz dizayn + birinchi tashrifda 8 MB precache tarmoqni band qiladi;
  gorizontal scroll qatorlardagi (`PlaceGroup row`) lazy rasmlar ba'zi WebKit'larda scroll qilinmaguncha yuklanmaydi (gipoteza);
  WebP eski Safari'da (iOS<14) yo'q; precache'da biror 404 bo'lsa SW install doim yiqiladi va qayta-qayta 8 MB yuklaydi.
  **Tekshirilmadi: WebKit/Safari** (Playwright webkit o'rnatilmagan) — 1-bosqichda real iPhone/WebKit bilan tekshiriladi.
- Reja (1-bosqich): ikonkalarni bitta sprite/inline yoki `eager`+`fetchpriority` (ko'rinadiganlar), `onError` → chiroyli zaxira
  (emoji/SVG silueti), precache'ni kichraytirish (3D sahifa JS'ini precache'dan chiqarish, runtime cache), SW yangilanishida eski keshni tozalash.

### 0.4 Serverga so'rovlar (hammasi Supabase, faqat bulut sozlanganda; production'da HOZIR 0)
| so'rov | qayerdan | qachon | R/W |
|---|---|---|---|
| sync queue: `children, child_state, task_results, child_events, child_learn` upsert + RPC `record_reward/resource/building_level/learning_evidence/opening_balance` | `services/sync/syncQueue.ts:164-193` | o'zgarishdan 2 s keyin, har 60 s, online/visible; learn 10 s debounce; backoff 5 s→5 min, 8 urinish | W |
| `subscriptions` select | `sync/subscription.ts:133` | start, har 6 soat, visible, `not_pro`dan keyin | R |
| restore (5 jadval) | `sync/restore.ts:268` | kirishda 1 marta | R |
| `presence_heartbeats` | `app/presenceHeartbeat.ts:10` | har 60 s (o'yin paytida) | W |
| analytics function | `services/analytics/sendAnalytics.ts:102` | 5 s, keyin har 60 s, tab yashirilganda | W |
| `app_settings` | `app/AppSettingsSync.tsx:23` | start | R |
| tts / voice-url / tutor | `audio/remoteTts.ts`, `voiceSource.ts`, `domain/tutor/aiClient.ts` | faqat `VITE_VOICE_PRIVATE`/`VITE_AI_TUTOR` | R |
| photos, consent, telegram link, promo/ads, delete-account, admin RPC (30 s poll) | turli | foydalanuvchi harakati | R/W |
Sxema (asosiy): `children` (parent_id), `child_state` (coins), `reward_ledger`/`resource_ledger` (faqat RPC orqali), `task_results`,
`child_events`, `child_learn`, `learning_*`, `subscriptions` (mijoz faqat o'qiydi), `payments` (admin), promo/ads jadvallari,
`admins/admin_audit/app_settings`, `analytics_*`, `presence_heartbeats`, `telegram_link_codes/links`, `account_consents`, `jobs`.

### 0.5 Kamera kuzatuvi (attention)
- `features/attention`: `@vladmandic/face-api` tinyFaceDetector (inputSize 160, score 0.45) + 68 landmark tiny; 320×240,
  har 350 ms; signal faqat **burun ↔ ko'zlar o'rtasi nisbati** (yon 0.42, past >1.25, yuqori <0.15), yuz topilmasa "away";
  2 s doimiy holat → ogohlantirish, cooldown 15 s. Silliqlash, kalibrlash, histerezis, ko'z qarashi, yorug'lik tekshiruvi YO'Q.
- Yoqilgan joy: tinch ro'yxatdan (`/home`, `/learn`, `/explore`, …, `/shorts`) tashqari barcha bola sahifalari (`attention/routes.ts:9-41`),
  jumladan **chizish/trace/studio** — u yerda pastga qarash "chalg'ish" deb olinadi. Qurilma bo'yicha cheklov yo'q.
- **Production'da kamera umuman ishlamaydi**: `vercel.json` `Permissions-Policy: camera=(), microphone=()` →
  `getUserMedia` so'rovsiz rad etiladi; ota-onaga "brauzer sozlamasida ruxsat bering" degan noto'g'ri maslahat chiqadi
  (`AttentionPanel.tsx:26`). Mikrofon (`NameRecorder`) ham bloklangan.
- Noto'g'ri aniqlash sabablari: kalibrsiz qat'iy nisbatlar (planshet stolda yotsa yuz pastdan ko'rinadi → "away"), past yorug'lik/
  kontr-yorug'likda yuz topilmasa darhol "away", 320×240 da ko'zlar orasi 20–30 px → landmark shovqini, bitta kadr holati,
  yonidagi ota-ona yuzi "qarab turibdi" deb olinadi, `facingMode` faqat ideal (orqa kamera ochilishi mumkin), xatolar jim yutiladi.
- Maxfiylik: kadrlar qurilmadan chiqmaydi (faqat hisoblagichlar analytics'ga). Rozilik oynasi birinchi bola ekranida chiqadi
  (bola ko'radi), lekin Ha/Yo'q ParentGate orqali.

### 0.6 Olib tashlanadigan bo'limlar
| | Xarita | Soya laboratoriyasi | Tomorqa | Klassik ertaklar |
|---|---|---|---|---|
| route | `/adventure` | `/shadow-lab` | `/learn/garden` | `/learn/tales/*` |
| kod | `features/adventure` (610 qator), `domain/universe/adventure.ts`, `worldStage.ts`, `progressStore.worldStages` | `features/shadowLab` (1734) | `features/garden` (1245) | `features/tales` (TalesPage, TaleView, TaleCheck, SceneTask, text.*, spoken) |
| havolalar | ExploreHub:21, KiddoCity:15, UzHub:144, sections.ts:39, analytics, soundLanguage, admin labels | ExploreHub:55, **SpacePage:185-196**, games/catalog:77 + TOP_GAMES:146, registry:326, sections:43 | LearnHub:107, world.ts:87 (bino), catalog:72, learn/sections:21, learnStore:22, wiring:26, homework:44, parent insights, adventure:62, **MarsBed:91**, **progression/content:129**, quest qadami 'grow' | StoryLibrary:113, learn/sections:20, homework:40, skills:84, learnEvidence:41, wiring:25, achievements:77 (bookworm), admin ContentSection |
| noyob kontent | yo'q (boshqa joyda bor faoliyatlar xaritasi) | **ha**: yagona fazoviy/soya jumboqlari | **ha**: 22 meva/sabzavot/hayvon so'zi, sanash, grammatika | **ha**: 9 ta bepul 3D ertak; Stories'da faqat 2 ta bepul qoladi |
| taklif | o'chirish | o'chirish yoki "O'yinlar"ga 1 o'yin sifatida | so'zlarni "Birinchi so'zim"ga (sodda bo'lganlari) | o'chirish; umumiy 3D sahna/hayvonlar (`tales/three`, `public/animals` 4,2 MB) Stories/myStory uchun QOLADI |
- Koinot bilan umumiy: faqat SpacePage'dagi havola + `science` strand (Mars gulini o'stiradi). `features/space` shadowLab'ni import qilmaydi.
- "Mashq bog'i" (`/mistake-garden`, `domain/garden`) — Tomorqa EMAS, alohida bo'lim (QOLADI deb hisoblayman).
- Voice: klip nomlari hash bo'yicha → o'chirilgan iboralar faqat yetim mp3 qoldiradi (manifestdan tozalanadi).

### 0.7 Ro'yxatdan o'tish, Pro, demo, ma'lumot saqlash
- Auth (Supabase): email+parol, Google, email-havola; sessiya `kiddo.auth` (localStorage); ilova sessiyasi `kiddo.parent`
  (`demo`/`cloud`); ota-ona darvozasi = ko'paytirish savoli (3 xato → 30 s blok, 10 daq ochiq). Telegram login yo'q
  (telegram faqat ota-ona hisobotlari boti). Bola — `children` qatori, login yo'q.
- Pro: `canUse`/`useCanUse` `kiddo.subscription` (localStorage) ni o'qiydi → **mijoz o'zi Pro bera oladi** (devtools).
  Serverda faqat tts/voice-url/tutor `is_pro_active` bilan tekshiriladi. Demo: `KIDDODEMO01–10` kodlari, demo admin, "Demo rejimda
  davom etish" tugmasi, `pro.demo*` matnlar, demo chip, Pro tab "Promokod" deb nomlanadi.
- localStorage: `kiddo.family/progress/rewards/universe/learn/activity` (bulutga sinxronlanadi, agar bulut bo'lsa),
  qolganlari (settings, parent, attention, shorts, myStories, payments, promo, …) faqat qurilmada. **Production'da hammasi faqat qurilmada.**

### 0.8 Vercel va /privacy
- Vercel funksiyalari: **0** (limit 12). `/privacy` **mavjud** (uz/ru/en, `features/legal/PrivacyPage.tsx`, commit 23123a62) —
  8-bosqichda yangi auth/telefon/Telegram ma'lumotlariga moslab yangilanadi.

### 0.9 Qulaylik (UX) — topilgan chalkash joylar (375×667)
1. Har ochilishda 3,2 s brend animatsiyasi + sekin yuklanish → bola ~7 s kutadi.
2. Yuqori panel tugmalari <48 px: "Bolani almashtirish", "Ota-ona bo'limi" (qulf), UZ/RU/EN — bola tasodifan tilni almashtiradi.
3. Bosh sahifa 1733 px (2,6 ekran): "Bugungi reja" pastda, scroll kerak; "Mening dunyom" 2673 px (4 ekran).
4. Takroriy kirishlar: "Multfilmlar" bosh sahifada ham, Kashf et'da ham; "Ertaklar" va "O'z ertagim" yonma-yon.
5. Kamera roziligi birinchi bola ekranida yopilmaydigan oyna — bola yolg'iz bo'lsa qotib qoladi.
6. Ota-ona kirishida 3 xil yo'l + "demo" tugmasi (8-bosqichda bitta ekran, 3 yo'lga keltiriladi).

### 0.10 Noaniq joylar — egasining javobi kerak (pastda xulosada)

## Egasining qarorlari (2026-11-12, "davom et")
1. Turso ("kiddo" alohida baza, Frankfurt) + BITTA Vercel dispatcher. Supabase kodi/migratsiyalar/functions QOLADI (o'chirilmaydi),
   MVP kodi Supabase'ga bog'lanmaydi, build Supabase env'siz ishlaydi. Admin bulut, analytics, tts, tutor, Telegram hisobotlari MVP'da o'chiq.
   Auth xavfsizlik qoidalari: tanilgan kutubxona (jose), kodlar hash/5 daq/bir martalik/urinish limiti, httpOnly+Secure+SameSite
   cookie, kirishda sessiya yangilanadi, CSRF, har so'rovda egalik tekshiruvi, rate limit, parametrli SQL, xavfsizlik testlari,
   sirlar logga yozilmaydi. Env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET,
   TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME (@ va bo'shliq olib tashlanadi), SMTP_HOST/PORT/USER/PASS/FROM.
   **Birinchi Turso migratsiyasidan oldin egaga aytish** (faqat yangi jadvallar).
2. Faqat `/learn/garden` o'chiriladi (Mashq bog'i qoladi); sodda so'zlar → Birinchi so'zim; kvest "o'stir" qadami boshqa faoliyatga.
3. `/adventure` o'chiriladi, eski URL yo'naltiriladi.
4. Soya lab to'liq o'chiriladi; 9 klassik ertak o'chiriladi (Ertaklar bo'limi, 3D sahna, hayvonlar qoladi).
5. Ochilish: guruhdagi har son ketma-ket 2 marta to'g'ri → keyingi 5 son (sonlar va chizish).
6. `camera=(self), microphone=(self)`; MediaPipe Face Landmarker o'z serverdan, faqat kamera yoqilganda lazy, precache'ga KIRMAYDI;
   rozilik → ota-ona bo'limiga; chizishda pastga qarash chalg'ish emas; yuz yo'qolsa kechiktirish + histerezis.
7. Yuklama testi lokal libSQL (turso dev).
8. Faqat Google, email kod, Telegram kod.
9. Narx 24 990 / 238 990 so'm, sinov rejimi.
10. UX taklif qabul; faqat takroriy TUGMALAR olinadi, Multfilmlar va Ertaklar bo'limlari qoladi.
Qo'shimcha: precache 8,3 MB → kritik precache + qolgani runtime; Kashf et rasmlariga zaxira; 7-bosqichda Pro serverga.
Telegram: `/start <token>` (bir martalik, 10 daq), request_contact, `contact.user_id == from.id`, telefon +998 normallash, 6 xonali kod,
webhook secret_token.

## 1-bosqich: YUKLANISH VA TEZLIK — bajarildi (2026-11-12)
- **Precache 8,26 MB → 1,47 MB** (581 → 87 fayl): faqat index.html skriptlari/CSS + UI tovushlari + manifest ikonkalari
  (`src/app/pwaShell.ts` + `vite.config.ts manifestTransforms`); bo'lim chunk'lari, shriftlar (`/assets/` CacheFirst 90 kun),
  rasmlar (3d/pets/pictures/icons/posters SWR) birinchi ishlatilganda keshlanadi. PNG ikonkalar ikki marta precache bo'lardi — tuzatildi.
- **SW `clientsClaim: true`**: avval (bazada ham) SW birinchi tashrifda sahifani boshqarmasdi → runtime kesh ishlamasdi.
- **Kashf et**: `Img3D` `onError` → yumshoq yulduz (bo'sh kvadrat emas) + test. Sekin 4G, SW o'rnatilayotganda ilova ichida o'tish:
  ikonkalar **1060 ms → 132 ms**; oflayn qayta yuklash (SW bilan) 13/13 ikonka; 2 ta rasm yiqilganda 3 ta yulduz, 0 bo'sh.
  Skrinshotlar `~/kiddo-check/mvp/stage1/`.
- **Shriftlar**: fontsource per-subset CSS'larida `unicode-range` yo'q edi → har sahifada 12 shrift fayli. Endi og'irlik CSS'lari
  (`600.css` …) → o'zbekcha sahifada **3 fayl**. Sahifa hajmi: /explore 623→526 KB, /alphabet 555→471 KB, so'rovlar ~10 ta kam.
- **3D**: GLB'lar allaqachon meshopt+quantization, teksturasiz; `simplify` sinovi: 17 morph target'li qismlar soddalashmaydi,
  ziyo 25 376→21 160 uchburchak, hajm −5% (lion −1%) → o'zgartirilmadi (foydasiz, xavfli). Maskot 3D onIdle'dan keyin, poster bilan,
  kuchsiz qurilmada `low` sifat, ekrandan tashqarida chizmaydi — mavjud.
- Rasmlar: PNG faqat PWA ikonkalari (manifest talab qiladi), >60 KB WebP yo'q. Videolar hammasi ≤ 2,49 MB.
- **Byudjet**: `scripts/perf-budget.mjs` (`npm run budget`, `npm run check` ichida): shell JS ≤ 370 KB gzip (o'lchov 360),
  precache ≤ 2,5 MB, fayl turlari bo'yicha limitlar.
- Testlar: lint, tsc OK; vitest 1775/1785 (10 yiqilgan — hammasi alohida yugurilganda o'tadi, avvaldan ma'lum yuklama timeout'lari;
  1 haqiqiy — owner-task CHECK_FILES ro'yxatiga pwaShell.ts va perf-budget.mjs qo'shildi); e2e offline (phone+tablet) o'tdi;
  e2e `performance.spec` "download budget" yiqiladi (654 KB > 364) — **bazada ham**: WebGL bor muhitda yuruvchi maskot onIdle'dan keyin
  three.js yuklaydi (baza build'i ham xuddi shu chunk'larni yuklaydi).
- Ochiq: WebKit/Safari tekshiruvi (Playwright webkit yuklanishi qotib qoldi) — yakunda qayta urinish. Vaqt o'lchovi shovqinli edi
  (mashina band) → Lighthouse oldin/keyin jadvali yakunda tinch muhitda.

## 2-bosqich: BAZA (Turso) + BITTA DISPATCHER — bajarildi (2026-11-12)
- `api/index.ts` (yagona Vercel funksiya) → `server/router.ts`; `vercel.json` `/api/:path*` → `/api?path=`; SW `/api`ni index.html bilan almashtirmaydi.
- `server/`: db (libsql https, migratsiya cold start'da 1 marta), migrations (1: users, sessions, auth_codes, telegram_logins,
  user_state, rate_limits, subscriptions, payments — faqat yangi jadvallar), session (httpOnly cookie, hash), http (same-origin/CSRF),
  rateLimit, sync (rev bilan, 409+merge), users (me, delete). Routelar: health, me, auth/logout, account/delete, GET/PUT sync.
- Klient: `src/services/cloud` (api backoff+jitter, CloudSync navbat/debounce 15 s, merge), `CloudSyncBridge` (AppShell; faqat
  `session.mode==='cloud'` va Supabase sozlanmaganda; engine lazy → shell 360 KB o'zgarmadi), `useSingleFlight` (8-bosqich tugmalari uchun).
- Dev: `scripts/dev-api.ts` (vite dev/preview'da /api, `.env.local`dan). Hujjat: `docs/architecture/turso.md` (jadval, xavfsizlik, yuklama).
- Yuklama (lokal libSQL fayl): 50 VU 0 % xato p95 384 ms; 200 VU 0 % p95 1,46 s; 1000 VU — bitta lokal jarayon ~200 req/s'da to'yinadi.
- Testlar: server 12, cloud 12, tsc, oxlint, build, budget OK.
- **Turso'ga hali hech narsa yozilmagan** (birinchi migratsiya production env qo'yilganda; oldin egaga aytiladi).

## 3-bosqich: BO'LIMLARNI OLIB TASHLASH — bajarildi (2026-11-13)
- Route'lar redirect: `/learn/garden` → `/learn/words`, `/learn/tales/*` → `/stories`, `/shadow-lab` va `/adventure` → `/explore`.
- O'chirildi (`git rm`, aniq fayllar): `features/garden/*`, `features/adventure/*`, `features/shadowLab/*`, `domain/universe/adventure.ts`,
  `worldStage.ts`, tales sahifalari/matnlari/mantiq (TalesPage, TaleView, TaleCheck, SceneTask, StaticScene, logic, spoken, text.*, ui, useReader),
  `e2e/shadow-lab.spec.ts`, i18n `shadowLab` bloki, `home.quick`.
- QOLDI: `tales/three`, `animals.ts`, `backdrops.ts`, `content.ts` (faqat tiplar) — Stories va "O'z ertagim" ishlatadi; Mashq bog'i; Ertaklar (Stories).
- Garden binosi shahardan olindi (saqlangan darajasi zararsiz qoladi, `findBuilding` undefined beradi). Supabase 0010 migratsiyasi tegilmadi
  (serverPrices testi 'garden'ni chiqarib solishtiradi). Tarixiy ma'lumot uchun `SectionId`/`SECTION_STRAND`da 'garden'/'tales' tiplari qoldi.
- Kvest "o'stir" qadami va MarsBed havolasi → `/worlds/dino/quiz` (gul science run'lardan o'sadi: dino viktorina, shorts savollari); matnlar uz/ru/en.
- `story-questions` ko'nikmasi yo'li → `/stories`. Bookworm yutug'i Stories'dan ham "scroll" oladi (ishlaydi).
- Takroriy tugmalar: bosh sahifadagi 4 plitkali qator (O'yinlar, Multfilmlar, Ertaklar, O'z ertagim — hammasi hub'larda bor) olindi;
  Kashf et'dan Xarita va Soya lab kartalari olindi; KiddoCity "Xarita" joyi olindi. Kashf et QuickTiles `wide`: Multfilmlar qatorni egallaydi
  (ruscha 320 px'da "Динозавры/Узбекистан" bo'linmasin). Stories sarlavhalari `FitWords` ("Потерявшаяся" bo'linardi).
- **Sodda so'zlar**: uz'da Tomorqaning sodda so'zlari (olma, nok, sabzi, bodring, kapalak, ari, qush, gul) "Birinchi so'zim"da allaqachon bor.
  Qo'shimcha so'zlar (uz: pomidor, qurbaqa, savat, chelak; ru: птица, ёжик, морковь, улитка; en: bee, bird, pear, rose) **ovoz klipi kerak**
  (voiceCoverage testi: PRO ovoz faqat yozuvni ijro etadi) → keyingi ElevenLabs partiyasida, kredit bilan. Hozir qo'shilmadi.
- Testlar: tsc, oxlint, prettier OK; vitest 1750/1757 (7 yiqilgan: admin x4 + MathPage + threeWords — alohida yugurilganda o'tadi yoki
  toza HEAD'da ham yiqiladi); build OK, shell 360 → 355 KB, precache 1,46 MB; e2e phone: words 8/8, games, mascots, quests, attention o'tdi;
  `kiddo.spec` "a right answer earns… coins" **toza HEAD'da ham yiqiladi** (worktree'da tekshirildi, oldindan bor).

## 4-bosqich: SONLAR OCHILISHI — bajarildi (2026-11-13)
- `src/domain/progress/numberUnlock.ts`: `openCount` (5 talik guruh; keyingi guruh oldingi guruhning HAR soni ketma-ket 2 marta to'g'ri
  bo'lganda ochiladi), `nextStreak` (xato → 0; 2 ga yetgan son "bajarilgan" bo'lib qoladi, keyingi xato ochilgan guruhni yopmaydi). Test bor.
- progressStore: `numberStreaks` (bola bo'yicha, `kiddo.progress` → bulutga sinxron), `recordNumberAnswer`.
- Sonlar (`/alphabet?tab=numbers`, 1–10): sanash oxirigacha = to'g'ri (`count:num-N`); yopiq plitka disabled + qulf + sabab matni;
  yopiq son URL'i → ro'yxat; "keyingi" strelka faqat ochiq songa.
- Chizish (`/trace/numbers`, 0–10, guruhlar 0–4 / 5–9 / 10): xatosiz (failedChecks 0) = to'g'ri, aks holda seriya 0 (`trace:N`);
  yopiq plitka qulf bilan, yopiq URL → ro'yxat, "keyingi" faqat ochiq. Shakllar hammasi ochiq.
- Matnlar uz/ru/en: `alphabet.numbersLocked`, `alphabet.lockedNumber` (faqat ko'rinadigan matn, ovozga berilmaydi).
- Testlar: vitest 1758/1765 (admin x4 ma'lum; MathPage, myStory, Dino alohida o'tadi); e2e age-look + words 12/12.

## 5-bosqich: KAMERA — bajarildi (2026-11-13)
- 5a: `vercel.json` `camera=(self), microphone=(self)` (+ securityHeaders testi). Bola ekranidagi rozilik oynasi (`AttentionConsent`) olindi:
  yordamchini va kamerani kattalar ota-ona bo'limi → Sozlamalar → `AttentionPanel`da yoqadi (e2e yangilandi). i18n `attention.consent` olindi.
- 5b: face-api → **MediaPipe Face Landmarker** (`@mediapipe/tasks-vision` **1.2.0** exact, 2026-10-27 relizi; 1.2.3 juda yangi edi).
  Model `public/models/mediapipe/face_landmarker.task` (3,6 MB, Google rasmiy float16/1, Apache-2.0). WASM `?url` bilan `/assets/vision_wasm*`
  (SIMD 14,5 MB yoki nosimd 12,9 MB, xom hajm), GPU → CPU zaxira. Faqat kamera yoqilganda lazy; precache'da YO'Q (sw.js'da faqat runtime
  CacheFirst `kiddo-face`). face-api paketi va `public/models/face/*` o'chirildi. perf-budget: `.wasm` 15 MB, `.task` 4 MB limit.
- Mantiq (`cameraWatcher.ts`, test bilan): `nearestFace` (2 yuzdan eng yaqini — bola), `gazeOf` (yon 0.42; past/yuqori bolaning o'z
  holatiga nisbatan), `GazeFilter`: birinchi 6 to'g'ri kadrdan kalibrlash (planshet stolda), yuz yo'qolsa 1,5 s kutish, away uchun 3 kadr,
  qaytish 2 kadr. Chizish ekranlari (`/trace`, `/tasks/trace`, `/studio`) — pastga qarash chalg'ish emas. Old kamera `exact: user`, bo'lmasa istalgani.
- Tekshirildi: Chromium soxta kamera bilan (preview build): bundle + SIMD wasm + model 200, kamera belgisi chiqdi, sahifa xatosi yo'q.
  **Tekshirilmadi**: haqiqiy yuz bilan aniqlik (real telefon/planshetda sinash kerak), Safari/iOS.
- Trade-off: kamera yoqqan oilaga birinchi marta ~4–5 MB (siqilgan) yuklanadi (face-api ~1,6 MB edi); keyin keshdan.

## 6-bosqich: UX — bajarildi (2026-11-13)
- Brend ochilishi: to'liq (3,5 s) faqat qurilmadagi BIRINCHI ishga tushishda; keyin qisqa fade 0,9 s (`kiddo.opening` flag,
  `data-opening="full|short"`). O'lchov (WebGL'siz Chromium): ikkinchi ochilish 1,2 s da tugaydi. Headless software WebGL asosiy oqimni
  ~2 s band qiladi → e2e vaqtga emas, atributga tayanadi.
- Tegish maydonlari ≥ 48 px: `IconButton` (bosh sahifa/orqaga), bola almashtirish, ota-ona qulfi, til tugmasi.
- Bola panelida til almashtirgich doim bitta tugma + menyu (tasodifiy bosish tilni o'zgartirmaydi); ota-ona bo'limida o'z almashtirgichi bor.
- Bosh sahifa qisqardi (3-bosqichda takroriy qator olingan). Testlar: unit (admin x4 ma'lum), e2e responsive + words 21/21 + opening.
- Ma'lum e2e flake'lar (mening o'zgarishimga bog'liq emas): opening "a key/tap skips" (toza HEAD'da ham), homework "planet homework"
  (javobdan keyin savol 1,4 s da almashmaydi — ovoz vaqti), kiddo "a right answer earns… coins" (toza HEAD'da ham).

## 7–8-bosqichlar: PRO SERVERDA VA KIRISH — kodda bajarildi (2026-11-13)
- Egasi Turso migratsiyasiga rozi (shartlar: baza nomi "kiddo", faqat CREATE ... IF NOT EXISTS, AUTH_SECRET faqat .env.local).
  **`.env.local` yo'q edi** → migratsiya qilinmadi; `.env.local` yaratildi, ichida faqat yangi `AUTH_SECRET` (64 belgi, git-ignored).
  Yetishmaydi: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GOOGLE_CLIENT_ID/SECRET, TELEGRAM_BOT_TOKEN/USERNAME, SMTP_*.
  Migratsiyadan oldin: host `kiddo-` bilan boshlanishi va "teamflow" yo'qligini tekshirish skripti (faqat nom chiqaradi) — sessiyada ishlatildi.
- Server: `server/auth.ts` (kod: HMAC, 5 daq, 1 marta, 5 urinish; email SMTP nodemailer; Google PKCE+state cookie, jose JWKS, faqat
  email_verified), `server/telegram.ts` (deep link token 32 belgi/10 daq, /start → request_contact, `contact.user_id == from.id`,
  saytdagi telefon bilan mos, kod, qayta yuborish 30 s / 5 marta, status, webhook secret = HMAC(AUTH_SECRET), bot matnlari uz/ru/en),
  `server/pay.ts` (24 990 / 238 990, PAYMENT_MODE=test, idempotency, kunlar qo'shiladi). Router: auth/*, telegram/webhook, pay/*;
  `health`, `auth/methods`, `pay/prices` bazasiz. Testlar: `server/auth.test.ts` (28+3), migratsiya statik tekshiruvi.
- Webhook: `node scripts/telegram-webhook.mjs https://<domen>` (deploydan keyin). `.env.example`ga nomlar qo'shildi.
- Klient: `features/parent/login/KiddoSignIn.tsx` (+ `signInText.ts` uz/ru/en, testlar 14), `ParentLoginPage` Supabase'siz shu ekran,
  demo faqat dev/e2e/test build'da; `AuthReturnPage` `?signin=google|failed`. QR: `qrcode-generator` 2.0.4 (lazy chunk).
- Pro: `MVP_PLANS` = `FUTURE_PRO_PRICES` = server `PLANS`; `ProSection` kirgan ota-onada server sinov to'lovi; `serverPro.ts`
  (to'langan Pro faqat `/api/me`dan; promo/demo saqlanadi) + test. `/privacy` yangilandi (2026-11-13).
- 12 ovozsiz so'z: `docs/shorts/VOICE-NEXT.md` "Ilova" bo'limi.

## YAKUN oldidan qolgan bandlar — holat (2026-11-13, kun oxiri)
| band | holat |
|---|---|
| Masshtab portali: avtomatik o'tish | bajarildi (qo'nishdan keyin ovoz + kamida 4 s, tugma orqali) |
| Masshtab portali: matnlar | aniqlanmadi — talab matni progress faylda yo'q; egadan aniq talab kerak |
| Chizamiz: bitta ro'yxat | bajarildi: /trace = 0–10 + 14 shakl = 25 (9 yangi shakl, uz/ru/en) |
| Birinchi so'zim sodda so'zlar | qisman: 12 so'z ovoz kutadi (`docs/shorts/VOICE-NEXT.md` Ilova) |
| Dinozavrlar | bajarildi: qazish/viktorina darhol ochiladi (dars "takrorlash"da), ikkalasida avtomatik o'tish bor edi |
| Uyda top 10 tagacha | bajarildi: 10 topshiriqli raund + yakun + "Yana o'ynash" |
| Yong'oq animatsiyasi | bajarildi: CoinBadge'da yong'oq sakraydi va +N ko'tariladi (motion-safe) |
| Har bo'limda bitta orqaga | bajarildi: TitleTopBar orqaga bo'lsa uy tugmasi yo'q (audit: hamma ekranda 1 ta) |
| Scroll'siz tugmalar | bajarildi o'yin ekranlari uchun (375×667 o'lchandi: Uyda top, Masshtab, Uch tilli so'z); ro'yxat sahifalari scroll qiladi |
- Orqa fon jarayonlari: o'zim ochgan vite preview'lar (4182–4185) PID bilan to'xtatildi. `.data/load.db` (lokal yuklama bazasi, git-ignored) qoldi.

## Turso, webhook, tarix (2026-11-13, kech)
- Baza nomi tekshirildi: `kiddo` (teamflow emas). Migratsiyadan oldin baza BO'SH edi. Migratsiya 1 o'tkazildi (faqat CREATE ... IF NOT EXISTS):
  jadvallar users, sessions, auth_codes, telegram_logins, user_state, rate_limits, subscriptions, payments, schema_migrations;
  indekslar auth_codes_target, payments_user, sessions_user, telegram_logins_user. Skript sessiya scratchpad'ida edi (repo'da emas).
- `.env.local`: `SMTP_FROM` YO'Q → email usuli yashirin. `TELEGRAM_WEBHOOK_SECRET` yaratildi (64 belgi, qiymat chiqarilmadi).
- Webhook: `server/telegram.ts telegramWebhook` — sarlavha yo'q/noto'g'ri → 401, solishtirish sha256 + timingSafeEqual.
  `scripts/telegram-webhook.mjs` setWebhook'ga `secret_token` = TELEGRAM_WEBHOOK_SECRET. `auth/methods` telegram uchun bu sirni ham talab qiladi.
- PAYMENT_MODE: o'rnatilmasa kodda `test` (bepul Pro!) — tavsiya: productionda o'rnatilmagan bo'lsa rad etish (hali o'zgartirilmadi, egadan javob kutiladi).
- Lokal tekshiruv: /parent/login'da Google tugmasi va Telegram oqimi ko'rinadi; email yo'q (SMTP_FROM). "Telegram yo'qmi?" email bo'lmasa Google'ga fokus.
- Tarix: ad81645a va 63756794 ichidagi faqat-format fayllar alohida `style: prettier …` commit'larga ajratildi; yakuniy daraxt asl bilan
  bir xil (tekshirildi). Zaxira: branch `backup/before-prettier-split` (ega o'chirishi mumkin).

- PAYMENT_MODE: o'rnatilmagan/bo'sh/noma'lum → 503 `payments_not_live`; faqat aniq `test` sinov to'lovini ishlatadi (server/pay.ts, 5 holat testi). `.env.example`: PAYMENT_MODE, APP_ORIGIN qiymatsiz.

## Bosqichlar rejasi (qarorlardan)
3. O'chirish: `/learn/garden`, `/adventure` (redirect), Soya lab, 9 klassik ertak; takroriy tugmalar; sodda so'zlar → Birinchi so'zim; kvest "o'stir" qadami.
4. Sonlar ochilishi: har son ketma-ket 2 marta to'g'ri → keyingi 5 son (sonlar + chizish).
5. Kamera: `camera=(self), microphone=(self)`, MediaPipe lazy (precache'siz), rozilik ota-ona bo'limida, chizishda pastga qarash ok, histerezis.
6. UX: brend animatsiya, kichik tugmalar (≥48 px), bosh sahifa qisqartirish.
7. Pro serverda: narx 24 990 / 238 990, to'lov sinov rejimi.
8. Kirish: Google, email kod, Telegram kod (pastdagi talab) + /privacy yangilash.

## 8-bosqich: qo'shimcha talab (egasidan, aynan) — 8-bosqichdan oldin QAYTA O'QI
Qo'shimcha talab (8-bosqich, Telegram kirishi UX): Ro'yxatdan o'tish ekranida telefon kiritilgach "Telegram'da kod olish"
tugmasi t.me/TELEGRAM_BOT_USERNAME?start=<bir martalik token> havolasini ochsin (start parametri 64 belgidan oshmasin).
Ekranda 4 qadamli qisqa ko'rsatma (tugmani bos, botda Start, raqamni ulash, kodni shu yerga yoz). Kompyuter uchun QR kod va
havolani nusxalash tugmasi. Telegram yo'q bo'lsa Google yoki email variantiga yo'naltiruvchi xabar. Kod kelmasa 30 soniyadan
keyin "Qayta yuborish" va "Botni qayta ochish" tugmalari, qayta yuborishga rate limit. Kutish holatida (kod kutilmoqda) ekran
qotmasin, tokenning holati (ishlatildi/muddati o'tdi) haqida tushunarli xabar bersin. Bot salomlashuvi va xatolik matnlari
uz/ru/en tillarida, sodda. Hammasi uchun test yoz (QR/havola yaratish, token muddati, qayta yuborish limiti).

## Keyingi aniq qadam
8-bosqich (kirish: Google, email kod, Telegram kod + Telegram UX talabi) — egadan sirlar kerak; so'ng 7-bosqich (Pro serverda, narxlar, sinov to'lovi).
Turso: migratsiya 1 (faqat yangi jadvallar) birinchi production so'rovida `ready()` orqali qo'llanadi → env qo'yishdan oldin egaga aytish SHART.

## Login tuzatishlari va 9-bosqich holati (2026-11-13)
Bajarildi (har biri alohida commit, push qilinmagan):
- `62d016c8` Google xatosi: har tarmoqqa sirsiz sabab kodi (denied, no_state, state_mismatch, no_code, token_failed, bad_token, email_unverified, server_error); server log faqat kod, URL `?reason=`; foydalanuvchi matni o'zgarmadi.
- `1b6bb855` Telegram tugmasi: kompyuterda tab bosilgan zahoti (await'dan oldin) ochiladi, telefonda tg:// havola; katta «Botni ochish» va nusxalash; ko'rsatma 3 qadam («bot Start'ni o'zi bosa olmaydi»). Ichki brauzer (Telegram/Instagram/Facebook) aniqlansa Google o'rniga ogohlantirish va nusxalash (uz/ru/en). Shu commit ikkala vazifani o'z ichiga oladi (fayllar umumiy).
- `7c62d3db` Kattalar misoli: /parent'ga kirishda so'ralmaydi. Endi faqat Pro to'lovi, hisobni o'chirish, profilni o'chirish va bulutdagi rasmlarni o'chirish oldidan so'raladi (`gate/useAdultCheck.tsx`). Bola profilini almashtirishda (ChildSelectPage) so'rov saqlangan. E2E fayllardagi kirish misollari olib tashlandi.
- Tekshirildi: tsc OK, `oxlint src` OK, server testlari 29/29, parent/pro/login/onboarding/home testlari 233/233. E2E ishga tushirilmadi.

Qoldi (9-bosqich, Telegram bot ota-onalar uchun): kod hali yozilmagan.
- 0-bosqich rejasi: sxema o'qildi. Hisobotga mos ma'lumotlar `user_state` ichida (progress.results: o'yinlar, sana, xatolar; minutesByDay: vaqt; learned; family: bola ismi). Oxirgi kirish uchun `sessions.last_seen_at` bor.
- Keyingi qadamlar: 1) notification_prefs/notification_log migratsiyasi (faqat CREATE IF NOT EXISTS, baza nomi tekshiruvi bilan); 2) `link_<token>` start payload; 3) dispatcher ichida CRON_SECRET bilan himoyalangan cron va vercel.json'da `0 15 * * 0`; 4) haftalik hisobot, voqealar, /hisobot, /til, /stop; 5) yangi qurilma xabari; 6) 403/429 qayta ishlash; 7) /privacy bandi; 8) testlar.
- Egaga: SMTP_FROM hali yo'q; Vercel env'lari va webhook (`node scripts/telegram-webhook.mjs https://<domen>`) sozlanishi kerak.

## 9-bosqich bajarildi (2026-11-13, push qilinmagan)
- `db3c51de` server: migratsiya 2 (notification_prefs, user_devices; faqat CREATE IF NOT EXISTS; `ready()` faqat host `kiddo-` bilan boshlansa va "teamflow" bo'lmasa migratsiya qiladi). Cron: `GET cron/weekly` (`0 15 * * 0`), `GET cron/daily` (`0 14 * * *`), CRON_SECRET Bearer, doimiy vaqtda solishtirish, hafta/kun bo'yicha idempotent. Bot: `link_<token>` va kirish tokeni ajratilgan; /hisobot (soatiga 2), /til, /stop, /start, yordam. Yangi qurilma xabari (brauzer + tizim, 16 belgili xesh). 403/chat not found holatida o'chiradi, 429 holatida retry_after kutadi, ~20 xabar/s. Hisob o'chirilsa yozuvlar ham o'chadi.
- `a5df5a46` UI: Sozlamalar → «Telegram xabarnomalari» (standart holatda o'chiq, Kiddo server rejimida), /privacy bandi uz/ru/en.
- Hisobotga kiradi: ota-ona va bola ismi (faqat birinchi ism), hafta (Toshkent, dushanba 00:00 dan boshlanadi) davomidagi mashg'ulotlar soni, daqiqalar, mashq qilingan harflar, `struggles` bo'yicha takrorlashga muhtoj 4 ta harf. Baho, ball va taqqoslash yo'q. Bosqich = har 5 ta o'rganilgan harf.
- Turso: migratsiya 2 qo'llandi (versiyalar 1,2).
- Tekshirildi: tsc, lint, server testlari 54/54 (avvalgi 29 ham o'tdi), parent/legal/i18n/alifbo testlari 241/241. Funksiyalar soni: `api/` ichida 1 ta. E2E ishga tushirilmadi, haqiqiy Telegram'ga xabar yuborilmadi.
- Egaga: Vercel'da `CRON_SECRET` qo'shilsin (TELEGRAM_* va boshqalar avvalgidek).
- Qisqartirish (shortcut): bir ishga tushirishda ~7 soniya (~140 xabar), qolgani keyingi ishga tushirishga qoladi. Bir xil brauzer va tizimli ikki kompyuter bitta qurilma deb hisoblanadi.

## 9.1-bosqich: botni qulay qilish (2026-11-13, push qilinmagan)
- `1276345b` server: migratsiya 3 (bot_prefs, feedback, device_alerts; faqat CREATE IF NOT EXISTS) Turso'ga qo'llandi (versiyalar 1,2,3). `server/bot.ts`: /menu va inline menyu (Hisobot, Sozlamalar, Til, Yordam, Saytni ochish), /sozlamalar (haftalik, voqealar, xavfsizlik; editMessageText, tugma holatni o'rnatadi, almashtirmaydi, shuning uchun qayta bosish xavfsiz), /yordam, /fikr (10 daqiqa, 1000 belgi, soatiga 3 ta, logga yozilmaydi, ixtiyoriy admin bildirishnomasi matnsiz), «Bu men emas» (bir martalik, 7 kun, barcha sessiyalarni o'chiradi). Callback'ni faqat ulangan ota-onaning shaxsiy chati (from.id = chat id) ishlata oladi. Noma'lum matnga yordam va menyu chiqadi; bare /start va kirish oqimi o'zgarmagan. Hisobot telefonning bitta ekraniga sig'adi (ism va hafta, Mini salomi, 4 fakt, 1 maslahat). /stop xavfsizlik xabarlarini ham o'chiradi.
- `4d471325` 8 ta buyruq (uz/ru/en), webhook `allowed_updates` ga callback_query qo'shildi, `.env.example` ga ADMIN_TELEGRAM_CHAT_ID, /privacy bandi.
- Tekshirildi: tsc, lint, server testlari 72/72, skript va privacy testlari 12/12.
- Egaga: 1) `node scripts/telegram-webhook.mjs https://<domen>` qayta ishga tushirilsin, aks holda tugmalar ishlamaydi; 2) `node scripts/telegram-setup.mjs` ishga tushirilsin (yangi menyu); 3) ixtiyoriy: Vercel'da ADMIN_TELEGRAM_CHAT_ID.
- Saytdagi panelda xavfsizlik xabarlari tugmasi yo'q, u faqat botda bor.

## E-mail kirish xatosi tekshiruvi (2026-11-13, push qilinmagan)
- Muammo: `POST auth/email/start` 500 (umumiy "Kirib bo'lmadi"), logda faqat "Error". Brevo'da 6–13 noyabr oralig'ida 0 ta xat.
- Tahlil: e4438209 yangi jadval/migratsiya talab qilmaydi (mavjud `rate_limits`); limit xatolari `HttpError` (429) bo'lib, "failed" logiga tushmaydi. Oddiy `Error` tashlay oladigan yagona yangi yo'l qolgan: SMTP (nodemailer). Brevo'ga xat umuman bormagani ham shunga mos. Production logi o'qilmagan, shuning uchun sabab ANIQLANMAGAN (taxmin: SMTP ulanish/autentifikatsiya yoki SMTP_FROM tasdiqlanmagan jo'natuvchi).
- Tuzatildi: log endi `[api] failed <route> <nom> <kod> <SMTP javob kodi> <buyruq>: <qisqa xabar>` (email manzil `<email>` bilan almashtiriladi, parol/sir yo'q); SMTP: 5/5/8 soniya timeout (Vercel 10 s ichida, aks holda Vercel uzib qo'yadi va log chiqmaydi), 587 da `requireTLS` (STARTTLS majburiy). Foydalanuvchi matni o'zgarmadi.
