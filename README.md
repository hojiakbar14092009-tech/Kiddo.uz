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
- PRO: oylik va yillik tariflar, Click / Payme / Uzum Pay, promokod, Demo PRO.

## Admin panel (`/admin`)

Ilova egasi uchun alohida boshqaruv paneli: o‘z dizayni (qorong‘i va yorug‘ rejim, harf va raqamlardan iborat
jonli “yulduzlar turkumi” foni) va faqat shu yerda ko‘rinadigan yordamchi – **Navi**. Navi gapirmaydi, matn
bilan yozadi: bugun nechta oila PRO sotib olgani, yangi to‘lov kelganini va kim o‘ynay boshlaganini.

- **Umumiy:** kunlik, haftalik, oylik va yillik daromad avtomatik hisoblanadi; 30 kun / 12 oy grafigi;
  hozir onlayn bolalar; PRO ulushi; so‘nggi to‘lovlar (yangisi kelganda fon oltin to‘lqin bilan yonadi).
- **Bolalar:** ro‘yxat, qidiruv, PRO / Bepul / Onlayn saralash; PRO bor-yo‘qligi va qachongacha; coin berish,
  PRO berish (+30 kun) va bekor qilish.
- **To‘lovlar:** barcha PRO to‘lovlari, jami summa, Excel (CSV) yuklab olish.
- **Promokodlar** va **Sozlamalar** (PRO narxlari, PRO bilan beriladigan sovg‘a coin – standart 50).

Kirish ikki xil:

1. **Shu qurilma** – PIN bilan (standart `2026`, build’da `VITE_ADMIN_PIN` bilan o‘zgartiring). Shu brauzerdagi
   ma’lumotlar ko‘rinadi; boshqa oynada ochilgan ilovadagi to‘lov va o‘yinlar ham jonli keladi.
2. **Barcha oilalar (Supabase)** – `supabase/migrations/0003_admin.sql` ni bajaring va o‘z hisobingizni admin qiling:
   `insert into public.admins (user_id) select id from auth.users where email = 'siz@misol.uz';`
   Shunda barcha oilalar, to‘lovlar (Realtime orqali jonli) va onlayn bolalar (Realtime presence) ko‘rinadi.

PRO sotib olinganda har bir farzandga sovg‘a coin beriladi va “Siz 50 coinga ega bo‘ldingiz!” chiqadi.
PRO’si yo‘q ota-onalarga obuna sahifasida PRO animatsiyali oltin kartada ko‘rsatiladi.

## Ochiq aytilishi kerak bo‘lgan cheklovlar

- **To‘lovlar sinov rejimida.** `src/services/payments/mockPayment.ts` to‘lovni faqat taqlid qiladi va pul yechmaydi. Haqiqiy to‘lov uchun Click/Payme/Uzum merchant hisobi va to‘lov xabarini (callback) tekshirib, `subscriptions` jadvaliga service role bilan yozadigan server kerak.
- **Promokodlar** (`KIDDO7` – 7 kun, `BOLAJON30` – 30 kun) hozircha qurilmada tekshiriladi. Ishlab chiqarishda ularni ham serverga o‘tkazish kerak.
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
