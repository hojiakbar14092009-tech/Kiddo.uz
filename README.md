# Kiddo

4–6 yoshli bolalar uchun o‘zbek, rus va ingliz alifbosini hamda 1–10 sonlarini o‘yin orqali o‘rgatuvchi veb-ilova (PWA). Asosan planshet (iPad) va telefon uchun mo‘ljallangan, internetsiz ham ishlaydi.

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173 (lokal tarmoqdagi iPad’dan ham ochiladi)
```

## Buyruqlar

| Buyruq              | Vazifasi                                               |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | ishlab chiqish serveri                                 |
| `npm run build`     | production build (`dist/`, service worker bilan)       |
| `npm run preview`   | buildni lokal ko‘rish                                  |
| `npm run lint`      | oxlint tekshiruvi                                      |
| `npm run typecheck` | TypeScript tekshiruvi                                  |
| `npm run test`      | Vitest testlari                                        |
| `npm run test:e2e`  | Playwright testlari (planshet va telefon, offline ham) |
| `npm run check`     | hammasi birga: format, lint, typecheck, test, build    |

Playwright birinchi marta: `npx playwright install chromium`.

## Nimalar bor

**Bola uchun**

- Ochilish animatsiyasi: Kiddo logotipi, atrofida harflar va sonlar paydo bo‘ladi.
- Til tanlash (o‘zbek, rus, ingliz), “Kim o‘ynaydi?” – har bir bola o‘z robotini bosib kiradi.
- Yoshga qarab (4, 5, 6): tug‘ilgan kun kiritiladi, yoshga mos o‘yinlar ochiq, kattaroq yoshniki qulflangan
  va tug‘ilgan kuni animatsiya bilan o‘zi ochiladi. Har yoshning o‘z dizayni: 4 – o‘yinchoq quti,
  5 – yashil bog‘, 6 – maktab daftari.
- Har bir o‘yinda o‘ng tepada “💡 Yordam”: bola qiynalsa yonadi, harf qanday yozilishini uzun animatsiyada ko‘rsatadi.
- Harf sahifasida rasm 3D: bola barmog‘i bilan aylantirib ko‘radi.
- Robotlar sahifa bo‘ylab yuradi: kartalar ustiga sakraydi, ba’zan yiqilib turadi, do‘konda buyumlarga osiladi;
  to‘g‘ri javobda yashil va xursand, xatoda qizil va xafa bo‘ladi, turli maqtov so‘zlarini aytadi.
- Mehmon har safar noldan boshlaydi (natijalari saqlanmaydi).
- Alifbo va 1–10 sonlari: harf so‘z ichida rangli ajratiladi, sonlarni bosib sanash.
- 4 ta o‘yin: harfni top, rasmni top, juftini top, harfni barmoq bilan yoz.
- Coinlar: xatosiz +5, xato bilan +3, kunlik sovg‘a +2. Coin hech qachon jarima sifatida ayirilmaydi.
- Bugungi reja, stikerlar albomi, robotga kiyim do‘koni (bir vaqtda 4 tagacha narsa: bosh, quloq yoni, ko‘z, bo‘yin).
- Uy hayvonlari (75 coin): mushuk, to‘tiqush, xomyak, dengiz cho‘chqachasi, quyoncha – jonli harakatda,
  har biri o‘z ovozi bilan; tanlangani robotning oyog‘i yonida yuradi va robot bilan birga xursand/xafa bo‘ladi.
- Uy vazifasi (ota-ona bergan harflar) bosh sahifada birinchi turadi.
- Katta sinov (hamma harflar o‘rganilgach) va yuklab olinadigan PNG sertifikat.
- Kunlik vaqt chegarasi: tugashidan 2 daqiqa oldin eslatma, keyin dam olish ekrani – undan faqat ota-ona chiqara oladi.
- 3D robotlar Pixi va Bipbot (tirik harakatlar, ko‘z qirpish, nigoh), WebGL bo‘lmasa SVG robot.

**Free va PRO**

- Free: tugmalarda yumshoq “klik”, robot o‘y pufakchalari bilan “gapiradi”, ovoz yo‘q.
- PRO: harf, so‘z, son va topshiriqlar ovoz bilan aytiladi, robot “Yahoooo!”/“Oops!” deydi.
  PRO faqat oila farzandlari uchun – mehmon har doim Free. Sotib olinganda tabrik animatsiyasi.

**Ota-ona bo‘limi** (ko‘paytirish misoli bilan himoyalangan)

- Bugungi hisobot, haftalik coinlar, xatolar tahlili (“Ch o‘rniga Sh”), mashq kerak harflar.
- Bola profillari (cheklovsiz; tug‘ilgan kun, jins → robot, kunlik vaqt), uy vazifasi, ovoz va til sozlamalari.
- Bola ilovadan chiqsa – vaqti bilan yoziladi va ota-ona bo‘limida ko‘rinadi (bulut hisobida boshqa qurilmada ham).
- PRO: oylik va yillik tariflar (yillik = 12 oy − 20 %, admin oylik narxdan avtomatik hisoblaydi), Click / Payme / Uzum Pay, promokod; Demo PRO almashtirgichi faqat ishlab chiqish (dev) build’ida ko‘rinadi.
- **Sovg‘a promokod:** «Promokodni olish» tugmasi admin qo‘ygan reklamani ko‘rsatadi; reklamani o‘tkazib yuborib,
  oldinga surib yoki yopib bo‘lmaydi (yopsa, promokod berilmaydi). Reklama oxirigacha ko‘rilgach promokod
  animatsiya bilan chiqadi va bir bosishda faollashtiriladi. Har bir oilaga 1 marta. Reklama bo‘lmasa,
  «Hozircha reklama yo‘q» deb yoziladi va promokod berilmaydi.

## Admin panel (`/admin`)

Ilova egasi uchun alohida boshqaruv paneli: o‘z dizayni (qorong‘i va yorug‘ rejim, harf va raqamlardan iborat
jonli “yulduzlar turkumi” foni) va faqat shu yerda ko‘rinadigan yordamchi – **Navi**. Navi gapirmaydi, matn
bilan yozadi: bugun nechta oila PRO sotib olgani, yangi to‘lov kelganini va kim o‘ynay boshlaganini.

- **Umumiy:** kunlik, haftalik, oylik va yillik daromad avtomatik hisoblanadi; 30 kun / 12 oy grafigi;
  hozir onlayn bolalar; PRO ulushi; so‘nggi to‘lovlar (yangisi kelganda fon oltin to‘lqin bilan yonadi).
- **Bolalar:** ro‘yxat, qidiruv, PRO / Bepul / Onlayn saralash; PRO bor-yo‘qligi va qachongacha; coin berish,
  PRO berish (+30 kun) va bekor qilish.
- **To‘lovlar:** barcha PRO to‘lovlari, jami summa, Excel (CSV) yuklab olish.
- **Promokodlar:** admin kod qo‘shadi (necha kun PRO berishini tanlaydi), to‘xtatadi, o‘chiradi va har bir kodni
  nechta oila olganini ko‘radi. Kodlarni README’ga, kodga yoki ochiq joyga yozmang: ular faqat admin panelida
  (Supabase bilan – `promo_codes` jadvalida) turadi. Ishga tushirish kodlari faol qoladi, lekin Supabase bilan
  kodni faqat reklamani oxirigacha ko‘rib, shu kodni olgan hisob faollashtira oladi (har oilaga bitta); boshqa
  har qanday kod “noto‘g‘ri” deb javob oladi. Noto‘g‘ri kod 10 daqiqada 5 martadan ko‘p kiritilsa, server
  vaqtincha rad etadi.
- **Reklamalar:** video fayl yuklash yoki .mp4 havola; ko‘rish va oxirigacha ko‘rishlar soni; to‘xtatish, o‘chirish.
- **Sozlamalar:** PRO oylik narxi – yillik narx avtomatik (12 × oylik − 20 %); “Saqlash”dan keyin ota-onalar shu
  narxni ko‘radi va to‘laydi. PRO bilan beriladigan sovg‘a coin (standart 50).

Kirish ikki xil:

1. **Shu qurilma** – PIN bilan. PIN build vaqtida `VITE_ADMIN_PIN` muhit o‘zgaruvchisi bilan beriladi
   (masalan Vercel → Settings → Environment Variables, yoki `VITE_ADMIN_PIN=... npm run build`); uni README
   yoki kodga yozmang. **Diqqat:** `VITE_*` o‘zgaruvchilari build paytida sayt kodiga ochiq holda yoziladi, shuning
   uchun bu PIN maxfiy kalit emas – sayt fayllarini o‘qigan odam uni topa oladi. U faqat shu qurilmadagi bolani
   admin panelidan tasodifan uzoqlashtiradi: “Shu qurilma” admini faqat shu brauzerdagi ma’lumotlarni ko‘radi va
   o‘zgartiradi, boshqa oilalar va serverga hech qanday kirish bermaydi. Production build’da PIN berilmasa, bu
   kirish butunlay o‘chiq bo‘ladi (“PIN sozlanmagan”), avval saqlangan kirish ham ochilmaydi; faqat
   `npm run dev` va unit testlarda ishlab chiqish uchun vaqtinchalik PIN bor. Shu brauzerdagi
   ma’lumotlar ko‘rinadi; boshqa oynada ochilgan ilovadagi to‘lov va o‘yinlar ham jonli keladi.
2. **Barcha oilalar (Supabase)** – `supabase/migrations/0003_admin.sql` ni bajaring va o‘z hisobingizni admin qiling:
   `insert into public.admins (user_id) select id from auth.users where email = 'siz@misol.uz';`
   Shunda barcha oilalar, to‘lovlar (Realtime orqali jonli) va onlayn bolalar ko‘rinadi.
   Promokod va reklamalar uchun `0004_promo_ads.sql` ni ham bajaring (reklama videolari `ads` storage bucket’iga yuklanadi).
   So‘ng `0005_security.sql` ni bajaring: to‘lovlarni faqat server/admin yozadi, onlayn bolalar ochiq Realtime kanali
   o‘rniga yopiq `presence_heartbeats` jadvalidan o‘qiladi (ismsiz), coinlar `reward_ledger` ga faqat
   `record_reward` orqali yoziladi. Qadamlar: `docs/architecture/supabase-verification.md`.
   Hozircha ilovada ko‘rinadigan coin balansi (`child_state.coins`) hali qurilmadan yoziladi, shuning uchun
   kunlik coin chegarasi faqat `reward_ledger` uchun; balans ledger’dan hisoblanmaguncha bu xavfsizlik chegarasi
   emas (rejada bor).

PRO sotib olinganda har bir farzandga sovg‘a coin beriladi va “Siz 50 coinga ega bo‘ldingiz!” chiqadi.
PRO’si yo‘q ota-onalarga obuna sahifasida PRO animatsiyali oltin kartada ko‘rsatiladi.

## Ochiq aytilishi kerak bo‘lgan cheklovlar

- **To‘lovlar sinov rejimida.** `src/services/payments/mockPayment.ts` to‘lovni faqat taqlid qiladi va pul yechmaydi. Haqiqiy to‘lov uchun Click/Payme/Uzum merchant hisobi va to‘lov xabarini (callback) tekshirib, `subscriptions` jadvaliga service role bilan yozadigan server kerak.
- **Promokodlar maxfiyligi.** Supabase bilan (`supabase/migrations/0004_promo_ads.sql`) kodlar faqat serverda: brauzer
  kodlar ro‘yxatini hech qachon olmaydi, reklama vaqtini server o‘z soati bilan tekshiradi va kodni oilaga 1 marta
  beradi; kod ham serverda faollashtiriladi. Supabase’siz (bitta qurilma) kodlar sayt kodida va brauzer xotirasida
  ochiq matn sifatida turmaydi – xesh va “muhrlangan” ko‘rinishda saqlanadi, lekin bu shifrlash emas: chuqur
  bilgan odam brauzerdan topishi mumkin. Admin qo‘ygan reklama va kodlar barcha oilalarga yetishi uchun ham Supabase kerak.
- **Ovoz.** Ilova aytadigan har bir gap oldindan neyron ovoz bilan, sekin va aniq yozib olingan
  (`public/audio/voice/`), uchala tilda ham ayol ovozi: rus tili – rus ovozi, ingliz tili – britan ovozi.
  Ochiq o‘zbek neyron ovozi hali yo‘q: o‘zbekcha matn qozoq kirill yozuviga o‘giriladi (q → қ, gʻ → ғ,
  oʻ → ө, ng → ң, sonlar o‘zbekcha so‘z bilan) va eng yaqin turkiy tilning (qozoq, ISSAI) ayol ovozi bilan
  o‘qiladi. Bolaning ismi kabi yozilmagan so‘zlar qurilma ovozida aytiladi.
  Yangi matn qo‘shilsa: `npx tsx scripts/voices/collect.ts > scripts/voices/phrases.json`,
  so‘ng `python3 scripts/voices/generate.py`.
  **ElevenLabs bilan (eng chiroyli, o‘zbekchani ham tabiiy o‘qiydi):** elevenlabs.io’da API kalit oling va
  internet bor kompyuterda `ELEVENLABS_API_KEY=... python3 scripts/voices/generate.py --engine elevenlabs --force`
  ni ishga tushiring (Eleven v3 modeli, sekin ayol ovozi; ovozni `ELEVENLABS_VOICE_ID` bilan tanlash mumkin).
- **Rasmlar** Fluent Emoji (MIT) SVG, oq fonda; 3D ko‘rinish shu rasmlardan quriladi.
- **Chiqish xabari** ota-onaning telefoniga push-bildirishnoma sifatida emas, ota-ona bo‘limidagi ro‘yxat sifatida
  keladi (push uchun server kerak).
- **Bulut sinxronlash** bir tomonlama: qurilmadagi profil va natijalar ota-onaning Supabase hisobiga zaxiralanadi. Boshqa qurilmadan yuklab olish hali yo‘q.

## Supabase (ixtiyoriy)

Kalitlarsiz ilova to‘liq offline ishlaydi, ota-ona bo‘limi esa demo rejimda ochiladi.

1. supabase.com’da loyiha oching.
2. SQL Editor’da `supabase/migrations/0001_init.sql` ni bajaring (jadvallar + Row Level Security).
3. `.env.example` dan nusxa olib `.env.local` yarating va `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` ni to‘ldiring.

Ota-ona email bilan kirgach, o‘zgarishlar navbatga (`src/services/sync/syncQueue.ts`) yoziladi va internet bo‘lganda tartib bilan yuboriladi. RLS har bir ota-onaga faqat o‘z oilasining qatorlarini ko‘rsatadi.

## Texnologiyalar

React 19, TypeScript (strict), Vite, Tailwind CSS 4, React Router 7, Zustand, i18next, Framer Motion, three.js / React Three Fiber, Howler, vite-plugin-pwa (Workbox), Supabase, Vitest + Testing Library, Playwright.

## Papkalar tuzilmasi

```
src/
  app/          ilova asosi: marshrutlar, himoyalangan yo‘llar, service worker
  components/   umumiy UI: tugmalar, ikonlar, layout, bayroqlar
  content/      alifbolar va sonlar
  features/     bo‘limlar: onboarding, home, alphabet, tasks, mascot, shop,
                exam, rest, parent, pro, profiles, stickers
  i18n/         interfeys tarjimalari (uz, ru, en)
  services/     audio, supabase, sync, payments
  store/        Zustand holatlari (localStorage’da saqlanadi)
  styles/       Tailwind dizayn tokenlari va shriftlar
  test/         test yordamchilari
e2e/            Playwright testlari
supabase/       SQL sxema va RLS
scripts/        UI tovushlari va ikonkalarni yaratish
```
