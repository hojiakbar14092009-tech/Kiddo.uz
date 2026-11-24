Tavsiya etilgan model: **Opus 5.5**, chunki B3 ikki xavfli oqimni birlashtiradi: Pro bayrog'i (frontend + server mosligi, ~20 bayroqsiz joy, ikki holat testi) va 47 fayldagi ovoz chaqiruvlariga rol berish. Mexanik qismlarni (grep isboti, i18n kalitlari, chaqiruv joylari ro'yxati) Sonnet 5.5 subagentiga bering.

# Kiddo: keyingi sessiya, bosqich B3 (ovozni ulash + Pro yashirish)

Bu sessiya oldingi suhbatni bilmaydi. Hamma narsa fayllarda.

1. `docs/MASTER_PROMPT_V3.md` ni to'liq o'qi: yagona manba. 3-bo'lim buzilmaydi: push/deploy yo'q, faqat lokal commit; `rm -rf`/glob o'chirish/`reset --hard`/`clean` yo'q; sirlar faqat `.env.local`/Vercel'da; pullik xizmat yoqilmaydi; `voice-test`/`voice-out` dagi eski fayllar va ZEHN ga tegilmaydi. Branch: **`feat/capacitor-codemagic`** (`DECISIONS.md`), main'ga merge yo'q.
2. O'qi: `docs/handoff/STATE.md`, `REPORT_B2.md`, `PLAN.md` (3-bo'lim, B3 qatori), `MAP_B0.md` (1-bo'lim PRO xaritasi, B3 xavflari), `DECISIONS.md`, `docs/voice/STATIC_VOICE_USERS.md`. `git status`, `git log -8 --oneline`.
3. Skill'lar: har kod vazifasidan oldin `ponytail:ponytail`; B3 uchun `superpowers:test-driven-development`, `zizi-skills:i18n`, `zizi-skills:security-and-hardening` (server tomoni Pro tekshiruvlari), `vectorlab-ux-skills:ux-audit` (Pro UI yo'qolganda bo'sh joy qolmasin), oxirida `superpowers:verification-before-completion`.

## B2 natijasi (qisqa, tafsilot REPORT_B2.md)
- Hamma nutq: `audioManager.say()` → `voiceLibrary.planSpeech()` → yozuv (`/audio/voice`, rol `version` 0) → jonli `GET /api/tts` (faqat `scripts/voices/phrases.json` dagi gap, bola ismisiz) → qurilma ovozi → ovozsiz. `say()` doim resolve.
- `src/services/audio/voiceConfig.json` — rollar `narrator`, `girl` (Mini), `boy` (Piku). Ovoz o'zgarsa: faqat shu fayl + rol `version` +1.
- `audioManager.prefetch(texts, lang)` va `startDelayMs()` bor, lekin hech bir ekran chaqirmaydi.
- Jonli ovoz Azure kalitini kutadi (HUMAN_TODO); kalitsiz ilova ishlaydi.
- `npm run build:native` ovozsiz paket (codemagic shu skriptni ishlatadi).

## B3 vazifalari (tartib bilan)
1. **Pro bayrog'i** `VITE_PRO_VISIBLE` (MASTER 12-bo'lim): mavjud `VITE_PUBLIC_PRO_UI`, `FREE_IN_DEMO`, `demoMode` bilan bitta ma'noga birlashtir (MAP_B0 1.1, B3 xavf 3). Markaz: `entitlementFor` (`src/domain/entitlements/features.ts:54`): false bo'lsa hamma imkoniyat `allowed`. Keyin MAP_B0 1.3 dagi ~20 bayroqsiz UI joyi (ProBadge, useProLabel, Shorts `FREE_SHORTS`, ProShowcase, ParentDashboard pro tab, demo chip, i18n `parentAreaHint`, AI do'st `not-pro`). Server: ishlayotgan `server/` da Pro rad etish yo'q (MAP_B0 izohi) — `users.ts:40` `plan` ni frontend qanday ishlatishini tekshir. Supabase kodi qoladi, ishlatilmaydi. Ikki holat uchun test. `pro|premium|tarif|obuna|subscription` grep isboti hisobotga. Admin panelga tegish egasi qarori (MAP_B0 1.4) — o'chirilmaydi.
2. **Ovoz har joyda**: `canUse('audio')` 9+ joyda takrorlanadi (MAP_B0 2.3) — bayroq false bo'lsa hammasi ochiq bo'lishi kerak. 47 chaqiruvchi faylda kim gapiradi: mashq ovozi faqat gapirayotgan maskotda (MASTER 10), bola maskotni tanlaydigan joyni kodda tekshir. Kerak bo'lsa `say()` ga ixtiyoriy `role` qo'sh (`planSpeech` hozir narrator yoki `kidVoiceOf`). Yordamchi rollar (ona, ota, buvi, bobo, Laylo, Ali) faqat ishlatiladigan joy bo'lsa konfiguratsiyaga qo'shiladi.
3. **Prefetch va "o'ylayapti"**: asosiy ekranlar (alifbo, learn/space savollari, hikoyalar) ochilganda keyingi gaplarni `prefetch`; `status === 'loading'` da maskot kutish holati (`useSpeechStatus`). Bosish→ovoz kechikishini brauzerda `startDelayMs()` bilan o'lcha (B2 da faqat curl: CDN HIT 0.57–0.84 s, MISS 1.82 s).
4. **Avtomatik o'qish va salom** (MASTER 10): har bo'lim savolni o'zi o'qiydi va keyingisiga o'tadi; maskot har ishga tushishda bir marta salomlashadi — mavjudini tekshir (`greetOnce.ts`, `afterVoice.ts`), yo'q joyini qo'sh.
5. **Matnlar** bolalarga mos (3 til, kalitlar saqlanadi). Matn o'zgarsa eski mp3 yetim qoladi va jonli ovoz/`phrases.json` yangilanishi kerak: `npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts > scripts/voices/phrases.json` (aks holda `/api/tts` yangi gapni 403 qiladi). O'zgargan matnlar ro'yxati hisobotga (Hojiakbar o'qiydi).
6. **320 px speaker/Help ustma-ustligi** (`e2e/speech.spec.ts:294`, `LearnShell.tsx:137` ustun): speaker y 139–195, Help y 186–242, bir x. Ildizini top, tuzat, testni yashil qil.
7. Oxirida: ishlatilmay qolgan eski mp3 ro'yxati `HUMAN_TODO` ga (o'chirish faqat Hojiakbar tasdig'i bilan).

## Ochiq ishlar va xavflar
- `public/audio/voice` dagi 15 979 mp3 ni O'CHIRMA.
- B1 dan qolgan e2e yiqilishlar (STATE.md) sabablari tekshirilmagan; B3 tegadigan ekranlardagilarini (PRO promo `kiddo` demo, `production` PIN admin narxlari, `tutor`) qayta yugur va sababini top.
- RAM: vitest va e2e ni bir vaqtda ishga tushirma; vitest yuklama ostida admin/parent timeout beradi (alohida o'tadi) — to'liq yugurishda boshqa og'ir jarayon bo'lmasin. E2E faqat `--workers=1`, kerakli spec'larni alohida.
- Pilot tanlovi kelsa (`LISTEN.md` jadvali): `normalize_uz.py` `DEFAULT`, `server/tts.ts` `UZ_APOSTROPHE`, `voiceConfig.json` (rol `version` +1). Kirill variant Edge'da ishlamaydi.
- `founder/` paketiga tegma (Free/PRO bo'linishi B3 uchun faqat kirish ma'lumoti).
- Oxirida 7-bo'lim handoff: `STATE.md`, `REPORT_B3.md`, shu faylni B4 uchun qayta yoz. Push yo'q.
