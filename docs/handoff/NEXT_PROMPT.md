Tavsiya etilgan model: **Opus 5.5**, chunki B2 arxitektura va xavfsizlik ishi (TTS endpoint suiiste'mol himoyasi, kesh kaliti, zaxira zanjiri, native paketdan audio chiqarish). Mexanik qismlarni (Q/G'/K namunalar, ro'yxatlar) Sonnet 5.5 subagentiga bering.

# Kiddo: keyingi sessiya, bosqich B2 (ovoz dvigateli)

Bu sessiya oldingi suhbatni bilmaydi. Hamma narsa fayllarda.

1. `docs/MASTER_PROMPT_V3.md` ni to'liq o'qi: yagona manba, 3-bo'lim qoidalari buzilmaydi (push/deploy yo'q, faqat lokal commit; `rm -rf`/glob o'chirish/`reset --hard`/`clean` yo'q; sirlar faqat `.env.local`/Vercel'da; pullik xizmat yoqilmaydi; `voice-test`/`voice-out` va ZEHN ga tegilmaydi). Branch: **`feat/capacitor-codemagic`** (`DECISIONS.md`), main'ga merge yo'q.
2. `docs/handoff/STATE.md`, `docs/handoff/PLAN.md` (2-bo'lim — B2 rejasi, 9 vazifa va bog'liqlik), `docs/handoff/MAP_B0.md` (53 ovoz chaqiruv joyi, xavflar) ni o'qi. `git status`, `git log -6 --oneline`.
3. Skill'lar (`SKILLS.md`): har vazifa oldidan `ponytail:ponytail`; B2 uchun `superpowers:test-driven-development`, `zizi-skills:security-and-hardening`, `zizi-skills:i18n`, oxirida `superpowers:verification-before-completion`.

## B2 vazifalari (`PLAN.md` 2-bo'lim, tartib bilan)
1. `src/services/audio/voiceConfig.ts`: rol → `{engine, voice, rate, pitch}`, `VOICE_PARAMS_VERSION`; `generate.py` shuni o'qiydi.
2. `voiceKey(text, lang, role, version)`; `version = 0` aynan hozirgi URL'ni beradi (fayllar ko'chirilmaydi).
3. Native build'dan `audio/voice` ni chiqarish (manba `public/` ga tegmasdan); native'da absolyut URL; paket hajmini o'lcha (maqsad < 60 MB).
4. `api/index.ts` ichida `tts` route: faqat manifestdagi ibora yoki ≤ 24 belgili ism; mavjud rate limit; edge-tts; `immutable` kesh. Testlar: 400/403, 429, kesh topilsa sintez yo'q. Saqlash joyi va limitlarini rasmiy hujjatdan tekshir (Vercel Blob Hobby, Turso, statik).
5. `audioManager.say()` zaxira zanjiri: statik/CDN → jonli → qurilma keshi → ovozsiz; har bo'g'inda timeout; `say()` doim resolve.
6. Prefetch + "o'ylayapti" holati; bosish→ovoz kechikishini o'lcha.
7. iOS audio unlock (Howler/HTMLAudio).
8. Q/G'/K pilot namunalar `%USERPROFILE%\voice-test\v3\` + `docs/voice/LISTEN.md` + HUMAN_TODO.
9. Eski statik ovoz ishlatadigan joylar ro'yxati (B3 uchun). Hech narsa o'chirilmaydi.

## Ochiq ishlar va xavflar
- `public/audio/voice` dagi 15 979 mp3 ni O'CHIRMA (o'chirish B3 dan keyin Hojiakbar tasdig'i bilan).
- **37 e2e yiqilish** (`STATE.md` ro'yxati), sabablari tekshirilmagan. B2 ga tegishlilari: `speech.spec.ts` (til almashganda ovoz to'xtashi; speaker tugmasi 320/390 px da ustma-ust) — B2 `say()` ni o'zgartirganda shularni qayta yugur va sababini top. Qolganlari (math-lab, performance budget, release-matrix overflow, garden, scale-portal, PRO promo, production admin, tutor, pet-shop, living-mascots, attention) B2 dan oldin yoki alohida "B1b" sifatida Hojiakbar bilan kelish.
- RAM: vitest va e2e ni bir vaqtda ishga tushirma. Vitest `maxWorkers: 6` (~190–225 s). E2E faqat `--workers=1` (to'liq ~1.9 soat); kerakli spec'larni alohida yugur.
- Native'da kirish ishlamaydi (B7). edge-tts endpoint Vercel'dan bloklanishi mumkin (tasdiqlanmagan) → zaxira statik + ovozsiz.
- `founder/` papkasi (biznes-reja, B1 sessiyasida foydalanuvchi so'rovi bilan) commit qilinmagan: unga tegma, Hojiakbar qaror qiladi.
- Oxirida 7-bo'lim handoff: `STATE.md`, `REPORT_B2.md`, shu faylni B3 uchun qayta yoz. Push yo'q.
