# Kiddo MVP — progress

Holat: **0-bosqich (audit) tugadi, egasining "ha" javobi va savollarga javob kutilmoqda.** Kodda hech narsa
o'zgartirilmadi (faqat shu fayl). Dalillar: `~/kiddo-check/mvp/stage0/` (skrinshotlar), o'lchov skriptlari
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

## 8-bosqich: qo'shimcha talab (egasidan, aynan) — 8-bosqichdan oldin QAYTA O'QI
Qo'shimcha talab (8-bosqich, Telegram kirishi UX): Ro'yxatdan o'tish ekranida telefon kiritilgach "Telegram'da kod olish"
tugmasi t.me/TELEGRAM_BOT_USERNAME?start=<bir martalik token> havolasini ochsin (start parametri 64 belgidan oshmasin).
Ekranda 4 qadamli qisqa ko'rsatma (tugmani bos, botda Start, raqamni ulash, kodni shu yerga yoz). Kompyuter uchun QR kod va
havolani nusxalash tugmasi. Telegram yo'q bo'lsa Google yoki email variantiga yo'naltiruvchi xabar. Kod kelmasa 30 soniyadan
keyin "Qayta yuborish" va "Botni qayta ochish" tugmalari, qayta yuborishga rate limit. Kutish holatida (kod kutilmoqda) ekran
qotmasin, tokenning holati (ishlatildi/muddati o'tdi) haqida tushunarli xabar bersin. Bot salomlashuvi va xatolik matnlari
uz/ru/en tillarida, sodda. Hammasi uchun test yoz (QR/havola yaratish, token muddati, qayta yuborish limiti).

## Keyingi aniq qadam
1-bosqich (bo'sh ikonka, precache, code-splitting, budget skripti).
