# MAP_B0 — Pro / Ovoz / Klip xaritasi (faqat o‘qish, kod o‘zgarmagan)

Sana: 2026-11-24. Qidiruv: grep (src, server, api, supabase/functions, docs). Test fayllar sanalmagan.

## 1. PRO

### 1.1 Mavjud bayroqlar (hozir)

| Bayroq | fayl:qator | nima qiladi | Izoh |
|---|---|---|---|
| `VITE_DEMO_MODE` | `src/config/demo.ts:25,39,52` | `demoMode` (bulut backend yo‘q bo‘lsa default true) | `DEMO.demoMode` |
| `VITE_PUBLIC_PRO_UI` | `src/config/demo.ts:26,42,53` | `publicProUIEnabled` (default `!demoMode`) | Faqat 4 joyda o‘qiladi (pastda). B3 uchun tayyor nuqta, lekin qamrovi tor |
| `VITE_PAYMENTS_MOCK` | `src/services/payments/availability.ts:9` | mock to‘lov faqat dev/test | UI emas, to‘lov mantig‘i |
| `PAYMENT_MODE` (server) | `server/pay.ts:24,28` | `off` default; faqat `test` da checkout; aks holda 503 `payments_not_live` | Server tomoni |
| `FREE_IN_DEMO` | `src/domain/entitlements/features.ts:46-53,59` | demoda faqat `audio` bepul | Boshqa 5 imkoniyat demoda ham qulflangan |
| `VITE_VOICE_PRIVATE` | `src/services/audio/voicePaths.ts:10` | ovoz fayllari private (voice-url) | PRO ovoz bilan bog‘liq |
| `VITE_PRO_VISIBLE` | YO‘Q | Master prompt 12-bo‘limdagi nom | Yangi kiritiladi (B3) |

### 1.2 Bayroq bilan himoyalangan joylar (`DEMO.publicProUIEnabled`)

| fayl:qator | nima |
|---|---|
| `src/components/ui/TierBadge.tsx:12` | Free/PRO belgisi TopBar da (`TopBar.tsx:84,31`) |
| `src/features/parent/dashboard/ParentDashboardPage.tsx:125` | PRO tabi nomi «promo» ga almashadi (tab o‘zi qoladi, `:25,:160`) |
| `src/features/pro/ProSection.tsx:55` | `publicPro` — narx/sotib olish bloklari |
| `src/features/admin/AdminSections.tsx:1156` | admin narx saqlash xabari matni |
| `src/store/subscriptionStore.ts:54` | `source==='demo'` PROD da rad |

### 1.3 Bayroqsiz joylar (B3 da yopilishi kerak)

| Joy | fayl:qator | nima ko‘rinadi | Bayroqli? |
|---|---|---|---|
| Entitlement (markaz) | `src/domain/entitlements/features.ts:20-62,73,89-107` | `NEEDS_PRO` 6 imkoniyat: audio, premiumStories, aiFriend, offlinePacks, premiumWorlds, shorts | YO‘Q. Bitta joy: `entitlementFor` (`:54`) — bayroq false bo‘lsa hammasi `allowed:true` qilinsa 90% qulf yo‘qoladi |
| `ProBadge` chip | `src/components/ui/ProLock.tsx:11` | oltin PRO chip | YO‘Q |
| ProBadge ishlatilishi | `ListenButton.tsx:32`, `SpeakButton.tsx:89`, `StoriesPage.tsx:36`, `StoryLibrary.tsx:111`, `StoryRun.tsx:63`, `dino/explore.tsx:171,222`, `UzHub.tsx:132` | qulf belgilari | YO‘Q (faqat `!isPro` ga bog‘liq) |
| `useProLabel` | `src/components/ui/useProLabel.ts` (+ ListenButton:19, SpeakButton:25, StoryLibrary:30, StoryRun:46, explore:109, UzHub:64) | «(PRO)» aria-label | YO‘Q |
| Shorts qulfi | `src/features/shorts/ShortsPage.tsx:70`; `catalog.ts:134,157` (`FREE_SHORTS=2`); i18n `shorts.proTitle/proText/toPro` (uz.ts:2843-2845) | 2 tadan keyin qulf + «PRO haqida» | YO‘Q |
| Hikoyalar | `StoriesPage.tsx:62`, `StoryLibrary.tsx:29,41` | `story.free` bo‘lmasa qulf | YO‘Q |
| Olamlar | `dino/explore.tsx:108,120,185`, `uzbekistan/access.ts:24`, `UzbekistanPage.tsx:52`, `UzHub.tsx:63`, `LockedView.tsx` | `premiumWorlds` qulfi | YO‘Q |
| Ovozli o‘qish qulfi | `learn/voice.ts:43,52,77`, `learn/speakable.ts:107`, `SpeakButton.tsx:32`, `useNarration.ts:43,45,111`, `ThreeWordsPage.tsx:38`, `MascotThoughtBubble.tsx:39`, `TaskShell.tsx:47`, `useSpeaker.ts:18`, `audioManager.ts:106` | `canUse('audio')` — demoda `FREE_IN_DEMO` bilan ochiq, productionda yopiq | Qisman (demoMode orqali) |
| AI do‘st | `domain/tutor/aiClient.ts:100,108` (`'not-pro'`); i18n uz.ts:849 | PRO xabari | YO‘Q |
| ProShowcase | `src/features/pro/ProShowcase.tsx` (i18n `pro.showcaseTitle/Cta`, uz.ts:941-943) | Reklama bloki | YO‘Q (ProSection ichida) |
| ProCelebration | `src/features/pro/ProCelebration.tsx` (i18n `pro.celebrateTitle` :945) | «PRO ochildi!» | YO‘Q |
| Narxlar/rejalar | `src/features/pro/plans.ts`, `futurePrices.ts`, `purchase.ts`; i18n `pro.plans`, `pro.buy` (:968-970) | tariflar | ProSection ichida |
| Promo/reklama | `features/promo/PromoPanel.tsx`, `PromoReveal.tsx`, `AdPlayer.tsx`, `promoBackend.ts:109`, `config/demoPromoCodes.ts` | promokod, reklama→PRO kunlari | `promoBackend:109` faqat demoMode |
| Demo chip | `ParentDashboardPage.tsx:113-120` (`pro.demoTitle`, uz.ts:~988) | «Bu demo: to‘lovlar o‘chirilgan…» | `DEMO.demoMode` bilan (publicPro emas) |
| Ota-ona maslahat matni | `uz.ts:12` `parentAreaHint: 'Hisobot, profillar, PRO — …'` | PRO so‘zi | YO‘Q |
| i18n qo‘lga olinadigan bloklar | `uz.ts` (ru/en xuddi shunday, har biri ~41 qator): `tier` :24-29; `parent.tabs.pro` :484; `pro{}` :940-1032; ovoz qulfi :1204-1205, :2179; olam qulfi :2232-2233; shorts :2843-2845; maxfiylik matnlari (PRO to‘lov/ovoz xizmati) :2550, :2565-2574 | matnlar | Kalit o‘zi bayroqsiz; ko‘rinish komponent orqali |
| Shahar `UpgradeSheet` | `src/features/city/UpgradeSheet.tsx` | bino yangilash (PRO EMAS, o‘yin ichi) | tegmaslik kerak |
| AchievementCard, `lib/useSingleFlight.ts` | grep «pro» ga tushadi | ehtimol «progress»/«promo»; B3 da qo‘lda tekshirish | noaniq |

### 1.4 Admin panel (O‘CHIRILMAYDI; bayroq false bo‘lsa yashirish yoki qoldirish — egasi hal qiladi)

| fayl:qator | nima |
|---|---|
| `src/features/admin/AdminPage.tsx:47,58,187,278-301` | «Promokodlar» bo‘limi, PRO sotuv bildirishnomalari (`Yangi to‘lov!` …) |
| `AdminSections.tsx:125,135,177,238-249,268-322,382-417,469,508,706,765,1108-1158` | PRO belgisi, PRO ulushi, filtr, «PRO +30 kun», to‘lovlar jadvali, narx formasi |
| `adminData.ts:43-44,215,251`; `revenue.ts`; `DemoAdmin.tsx:49,165,194`; `AdminNotifications.tsx` | grantPro/revokePro, daromad |

Admin matnlari i18n emas — to‘g‘ridan-to‘g‘ri o‘zbekcha qator.

### 1.5 Server

| fayl:qator | nima | Bayroq |
|---|---|---|
| `server/pay.ts:21-52` | `GET pay/prices`, `POST pay/checkout` (PAYMENT_MODE), `subscriptions` yozadi | PAYMENT_MODE |
| `server/router.ts:62-64,69` | marshrutlar `pay/prices`, `pay/checkout` | — |
| `server/users.ts:30-52` | `proStatus` (subscriptions jadvali), `/api/me` da `pro` (`router.ts:33-34`) | — |
| `server/migrations.ts:66-77` | `subscriptions`, `payments` jadvallari | O‘chirilmaydi |
| `supabase/functions/_shared/handlers.ts:53,108` | TTS: `isPro` bo‘lmasa `not_pro` — **server rad etadi** | YO‘Q (B3 xavfi) |
| `supabase/functions/_shared/ai/handler.ts:67,193`, `tutorDeps.ts:39`; `supabaseDeps.ts:41` | tutor: `not_pro` | YO‘Q |
| `supabase/functions/voice-url`, `tts`, `tutor` | PRO tekshiruvi orqali | YO‘Q |
| `server/bot.ts`, `server/telegram.ts`, `server/notify.ts`, `supabase/functions/telegram`, `owner-bot` | «pro/premium/obuna/tarif» grep: **hech narsa topilmadi** | Bot matnlarida PRO eslatmasi yo‘q (admin PRO-sotuv xabari bu — `AdminPage.tsx:298`, ilova ichida) |
| `api/index.ts` | faqat dispatcher, PRO yo‘q | — |

### 1.6 Tarbiya 4–30 kun gating

- Kodda **yo‘q**. `docs/tarbiya/CURRICULUM.md:1-8` hujjat: «Kod yo‘q», «1–3 kunlar bepul, 4-kundan PRO» (qoralama, 90 klip, 90 mashq, 30 kun). `src/features/feelings/content.ts` faqat «tarbiya» so‘zini eslatadi, alohida bo‘lim emas.
- B4 da yangi bo‘lim yaratilganda gating `ProFeature` ga yangi kalit (masalan `tarbiyaDays`) sifatida qo‘shilsa, B3 bayrog‘i orqali avtomatik ochiladi (Master prompt 12: «Tarbiya 4–30 kunlar ham»).

## 2. OVOZ

### 2.1 Arxitektura (`src/services/audio/`, ~4555 qator, 38 fayl)

| fayl:qator | nima |
|---|---|
| `audioManager.ts:91` `play(sound)` | UI tovushlari (Howler): `/audio/ui/ui_{click,success,soft}.mp3` (`:16-18`) |
| `audioManager.ts:122,135` `speak()`, `say()` | asosiy nutq; `canSpeak` `:105` (`canUse('audio')`), `stopSpeech :293`, `getStatus :110` |
| `voiceLibrary.ts:56` `planSpeech` | matn → `VoiceClip` yoki qurilma ovozi |
| `voiceManifest.json` | matn→kalit xaritasi (narrator) |
| `kidVoiceManifest.json`, `kidVoices.ts:14,35,48` | Mini (`girl`) / Piku (`boy`) klip yo‘li `/audio/voice/kid/{voice}/{lang}/{key}.mp3` |
| `voicePaths.ts:3-10` | `/audio/voice/<lang>/<key>.mp3`, private rejim bayrog‘i |
| `voiceSource.ts:16-95` | `public`/`private` rejim, `resolveClips` (voice-url signed) |
| `phrases.ts:21-79` | `phraseKey = FNV-1a 32 (til\0 NFC matn)`, ism chiqarib tashlash (`withoutName`), `remoteSafeText` |
| `childPhrases.ts`, `phraseFills.ts`, `pieces.ts:14,126-248` | ilova aytadigan har gap ro‘yxati, raqam/shablon bo‘laklari |
| `remoteTts.ts:20,36` | bulutli TTS (`MAX_TTS_CHARS=200`), `edgeFunctions.ts`; PRO |
| `speech.ts:25,82,115` | `window.speechSynthesis` / `SpeechSynthesisUtterance` — **yagona** speechSynthesis joyi; `speech.unlock` |
| `synth.ts:12-43` | Web Audio (`AudioContext`) tonlar |
| `soundLanguage.ts`, `afterVoice.ts`, `pace.ts`, `voiceLevel.ts` | tovush tili, ovozdan keyingi, temp, balandlik |
| `useSpeaker.ts:18`, `useSpeechStatus.ts` | React hook |
| `pendingRecordings.json` | hali yozilmagan jumlalar ro‘yxati |
| `src/app/SpeechUnlock.tsx:5-11` | iOS: birinchi `pointerdown` da `speech.unlock()` (`once`, capture) |
| `src/app/SoundBridge.tsx`, `InterfaceSounds.tsx` | UI tovush ko‘prigi |
| `features/learn/voice.ts:43-77`, `speakable.ts:107`, `SpeakButton.tsx`, `features/stories/useNarration.ts` | o‘qish/avto-o‘qish qatlami (`autoVoice` sozlamasi) |
| `features/mascot/MascotThoughtBubble.tsx:39`, `useMascot.ts`, `useLearnMascot.ts`, `greetOnce.ts` | maskot nutqi, salomlashish |
| `features/parent/dashboard/NameRecorder.tsx:80` | ota-ona yozgan ism (`new Audio`, qurilmada) |
| `features/admin/VoicesSection.tsx:81`, `adminVoices.ts` | admin: klipni tinglash (`new Audio(publicClipUrl)`) |
| `scripts/voices/*` (generate.py, kid_voices*.py, inventory.ts, edge_listen.py, upload-private.mjs …) | generatsiya skriptlari |

### 2.2 Raqamlar

| ko‘rsatkich | qiymat | manba |
|---|---|---|
| Ovoz fayllari narrator | uz 4629, ru 4616, en 4514 (jami 13 759 mp3, kid/ ichida alohida) | `public/audio/voice/{uz,ru,en}` |
| Mini (`kid/girl/uz`) | 1111 fayl (inventar: 983) | `public/audio/voice/kid/girl/uz` |
| Piku (`kid/boy`) | inventar 981 | `docs/voice/inventory.tsv` |
| Inventar jami | 9458 qator (narrator 7494, mini 983, piku 981) | `docs/voice/inventory.tsv` (9459 qator, sarlavhali) |
| UI tovush | 3 mp3 | `public/audio/ui` |
| Statik ovozni chaqiruvchi manbalar | **~53 fayl** `audioManager.say/speak/useSpeaker/speakLines/speakable` ni ishlatadi (`src` ichida, servisdan tashqari 53 ta; 38× `audioManager.say`, 12× `.speak`, 7× `.play`); `window.speechSynthesis` — faqat `speech.ts` (1 joy) | grep |
| To‘g‘ridan `new Audio()` | 2 joy (`NameRecorder.tsx:80`, `VoicesSection.tsx:81`) | grep |
| Kutilayotgan | Shorts 114 qator (water 16 yozilgan), «Birinchi so‘zim» 12, Masshtab 36, Tarbiya ~5400 | `docs/voice/INVENTORY.md` |

Chaqiruvchi fayllar (53): InterfaceSounds, adminVoices, VoicesSection, UnlockCelebration, LetterCheck, LetterPage, NumberPage, AttentionHelper, BirthdayCelebration, CalmCorner, FeelingsPage, FeelingsRun, HomePage, HelpButton, LearnResult, LearnShell, LessonDeck, speakable, SpeakButton, useLearnMascot, learn/voice, PeekingMascot, useMascot, MathLabPage, CoachMarks, WelcomePage, SettingsSection, ProCelebration, PromoReveal, sciGames/play/hooks, SciGamePage, ShortQuiz, ShortsPage, space/{Lesson,OrderGame,QuestionBoard}, stories/{StoryFrame,StoryQuestions,useNarration}, tasks/{ChoiceGame,MemoryGame,TaskHint,TraceGame}, ThreeWordsPage, TutorPanel, dino/parts, uzbekistan/{ExploreView,LockedView,MapRun,PatternRun,run,TableRun,UzHub}.

### 2.3 Xavf belgilari

- Kalit matn xeshi: matn bir harf o‘zgarsa kalit o‘zgaradi → fayl «yo‘qoladi» (`phrases.ts:47`, `voiceBuild.ts`). Yangi dvigatel shu kalit/manifest shartnomasini saqlashi yoki hammasini qayta generatsiya qilishi kerak.
- Hamma nutq `audioManager.say()` orqali (38 chaqiruv) — dvigatelni almashtirish uchun yagona nuqta: `audioManager.ts:135` + `voiceLibrary.planSpeech`.
- `canUse('audio')` 9+ joyda takrorlanadi (alohida tekshiruv: voice.ts, speakable.ts, useNarration, audioManager, ThreeWordsPage, SpeakButton).
- Private rejim (`voice-url`, `tts`) server `isPro` tekshiruvi bilan: B3 da ochiq qilinsa, supabase funksiyalari ham mos bo‘lishi kerak.

## 3. KLIP / SHORTS

| fayl | nima |
|---|---|
| `marketing/shorts/` (Remotion 4.0.540, `package.json:12-18`) | alohida paket: `src/{Root,Cartoon,Poster,scenes,scenes2,stories,stories2,story,rig,parts,camera,data,fonts}.tsx`, `dialogue.json`, `script.json`, `timings.json`, `amp*.json`, `public/{art,fonts,sfx,vo,music.wav}`, render skriptlari (`render.sh`, `render-one.sh`, `render-story.sh`, `render-legacy.sh`), `gen_dialogue.py`, `lipsync.py`, `voice_sts.py`, `sfx.py`, `music.py`, `out/` |
| `marketing/shorts/src/Root.tsx:17-53` | `Composition` id `${short}-${lang}`, `${id}-uz` (hikoyalar), `poster-${short}`; ichida `Folder` |
| `marketing/ad-clip/` | alohida Remotion reklama (`KiddoAd.tsx`, `script.json`, `capture.cjs`) |
| `marketing/promo/` | promo materiallar |
| `public/video/shorts/{uz,ru,en,posters}` | oldindan render mp4 (uz da 20 ta; bread, calm, crossing, dayCycle, dayNight, float, habitats, magnet, planets, plate, rainbow, robot, scale, seed, shapes, shop, teeth, train, tree, water); papka jami **57 MB** |
| `src/features/shorts/` | `ShortsPage.tsx` (`<video>` :353, ref :265, pro :70), `ShortQuiz.tsx`, `catalog.ts` (`ShortId` 20 ta, `FREE_SHORTS=2` :134), `captions.ts` (karaoke), `swipe.ts`; marshrut `/shorts` `src/app/routes.tsx:240` |
| Ilovada boshqa `<video>` | `features/promo/AdPlayer.tsx:131`, `admin/AdminSections.tsx:1027` |
| **Remotion Player ilovada** | **YO‘Q** (`package.json` ildizida `remotion` bog‘liqligi yo‘q — grep topmadi). Master prompt 11: Remotion Player bilan jonli, og‘ir mp4 paketga solinmaydi → B4 da yangi bog‘liqlik va kompozitsiyalarni `src` ga ko‘chirish kerak |
| Tarbiya | `docs/tarbiya/CURRICULUM.md` (30 kun × 3 klip + 3 mashq + ota-ona maslahati, 4 mashq turi: choose/order/match/truefalse) — kod yo‘q |
| `docs/shorts/{scripts.md,VOICE-NEXT.md,LICENSES.md}` | ssenariylar, kutilayotgan ovoz, litsenziyalar |

### Maskotlar (Mini, Piku)

| fayl | nima |
|---|---|
| `src/features/mascot/` | `Mascot.tsx`, `MascotFigure.tsx`, `Robot.tsx`, `RobotFace.tsx`, `RobotOutfits.tsx`, `RoamingMascot.tsx`, `PeekingMascot.tsx`; 3D: `characters/{Character3D,registry,assets,emotions,gestures,reactions,controller,director,outfits3d}`; `lab/`; `public/mascots/*.glb` (lumi.glb = Mini, kidobot.glb = Piku, + 8 boshqa), `public/mascots/posters` |
| Remotion rig | `marketing/shorts/src/rig.tsx:40-75`: Piku = `art/kidobot.webp`, ko‘z `lid #141a27`, og‘iz `#9fe2ff`; Mini = `art/lumi.webp`, `lid #e9e4de`, `lash #8c5a3e`, og‘iz `#7a3b2e`; rasm (webp) asosida, vektor emas |
| Rang tokenlari | `src/styles/index.css:40,49,200,223,254` (`--color-primary #13917e`, `--color-coin #ffc93c`, mavzular); maskot ranglari alohida (`.mascot-tint-happy` :310); Remotion tokenlari ilovadan **ajratilgan** (Master prompt 11: bitta token fayl talab qilinadi) |

## Xulosa

Sonlar: PRO — 6 ta `ProFeature`, 5 ta bayroqli joy, ~20 ta bayroqsiz UI joyi, 3 locale; Ovoz — ~53 chaqiruvchi fayl, 38 `say()`, 1 ta speechSynthesis joyi, 9458 inventar klip; Klip — 20 ta shorts mp4 (57 MB), 3 Remotion paket, ilovada Player yo‘q.

### B2 (ovoz dvigateli) — eng xavfli joylar
1. Kalit = `phraseKey(matn)` (FNV-1a): har qanday matn tahriri 13 759+ faylni «yetim» qiladi; manifest va generatsiya skripti (`scripts/voices/generate.py`) bilan sinxron qolishi shart.
2. `audioManager.say()` (38 chaqiruv, 53 fayl): yagona almashtirish nuqtasi, lekin `speakLines`, `useNarration`, `speakable`, `voice.ts`, `ThreeWordsPage` o‘zlari `canUse('audio')` ni alohida tekshiradi — bittasi unutilsa ovoz jim qoladi.
3. iOS `SpeechUnlock` faqat `speech.unlock()` (speechSynthesis) ni ochadi; Howler/mp3 yo‘li uchun alohida AudioContext/Howler unlock bormi — tekshirish kerak (`synth.ts:12`, `audioManager.ts` Howl).
4. Private rejim (`voice-url`, `tts`) server tomonida `isPro` bilan rad etadi (`_shared/handlers.ts:108`) — B3 bayrog‘i bilan kelishilmasa ovoz 403/`not_pro` beradi.
5. Mini/Piku faqat uz da (983/981), ru/en yo‘q; Shorts/Tarbiya ovozi (≈5500) hali yo‘q.

### B3 (Pro yashirish) — eng xavfli joylar
1. Frontendda bitta nuqta `entitlementFor` (`features.ts:54`) yetarli emas: 15+ komponent `ProBadge`, `useProLabel`, `proTitle`/«PRO haqida» matnlarini `!isPro` ga qarab ko‘rsatadi — `allowed:true` bo‘lsa ham ba’zi UI (ProShowcase, ParentDashboard `tab=pro`, ProSection, demo chip, i18n `parentAreaHint`) bayroqsiz qoladi.
2. Server: `supabase/functions/_shared/handlers.ts:108` (TTS), `_shared/ai/handler.ts:193` (tutor) `not_pro` qaytaradi — frontend ochiq, API yopiq holat (Master prompt 12 aynan buni taqiqlaydi). Express-turso `server/` da PRO tekshiruvi yo‘q, faqat to‘lov.
3. Mavjud `VITE_PUBLIC_PRO_UI` ma’nosi va `FREE_IN_DEMO` bilan ustma-ust tushadi; yangi `VITE_PRO_VISIBLE` ni ular bilan birlashtirmasa ikki rejim chalkashadi. `demoMode` ham `canUse` ni o‘zgartiradi.
4. Admin panel matnlari qattiq yozilgan (i18n emas), PRO sotuv bildirishnomasi (`AdminPage.tsx:298`) va narx formasi — o‘chirilmasligi kerak, bayroqli bo‘lishi egasi bilan kelishiladi.
5. Tarbiya 4–30 kun gating hozircha mavjud emas — B4 da `ProFeature` ga qo‘shilsa avtomatik ochiladi; alohida mustaqil tekshiruv yozilmasin.

### B4 (klip/shorts) — eng xavfli joylar
1. Remotion Player ilovada yo‘q (bog‘liqlik, bundle hajmi, kuchsiz qurilmada kadr tezligi); hozirgi tizim 57 MB mp4 + `marketing/shorts` alohida paket. Kompozitsiyalarni `src` ga ko‘chirish yoki umumiy paket kerak.
2. Maskot rig rasm (webp: lumi/kidobot) asosida; «2D Mini va Piku» yangi vektor/rig talab qiladi; ranglar tokenlari ilova (`index.css`) va Remotion o‘rtasida ikki nusxa.
3. Klip davomiyligi ovoz uzunligiga moslashishi kerak: ovoz hajmi ≈5400 (Tarbiya) + 114 (Shorts) qator hali yo‘q → B2 dvigatelisiz boshlab bo‘lmaydi (`timings.json`, `amp.json` jarayoni qo‘lda).
4. 90 klip uchun ma’lumotga asoslangan sahna tizimi yo‘q: hozirgi `scenes.tsx`/`stories*.ts` har bir klip uchun alohida kod. CURRICULUM matni tasdig‘ini kutmoqda («qoralama»), matn o‘zgarsa ovoz kalitlari ham o‘zgaradi.
5. `ShortsPage` `FREE_SHORTS=2` + `ShortId` yopiq birlashma (20 ta): Tarbiya klipi bu tizimga sig‘maydi, alohida katalog kerak.

Tekshirilmagan: i18n kalitlarining ru/en aniq qatorlari (faqat uz.ts qatorlari keltirilgan), `AchievementCard`/`useSingleFlight` dagi «pro» (ehtimol «promo»/«progress»), Howler uchun alohida iOS unlock mavjudligi.

## Asosiy sessiya izohi (tekshirildi)
- `supabase/functions/*` dagi `not_pro` rad etishlari ishlatilmaydigan Supabase kodi (3-bo'lim 5-qoida: qoladi, ishlatilmaydi). Ishlayotgan Vercel `server/` + `api/` da `git grep "not_pro|isPro|requirePro"` natija bermadi; `plan` faqat `server/pay.ts:30,47` (yozish) va `server/users.ts:40` (o'qish) da. Demak B3 uchun server tomoni xavfi kichik, lekin `users.ts:40` dagi `plan` ni frontend qanday ishlatishi B3 da tekshiriladi.
