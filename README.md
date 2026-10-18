# Kiddo

3–6 yoshli bolalar uchun o‘zbek, rus va ingliz alifbosini hamda 1–10 sonlarini o‘yin orqali o‘rgatuvchi veb-ilova (PWA). Asosan planshet (iPad) va telefon uchun mo‘ljallangan, internetsiz ham ishlaydi.

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173 (lokal tarmoqdagi iPad’dan ham ochiladi)
```

## Buyruqlar

| Buyruq              | Vazifasi                                                |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | ishlab chiqish serveri                                  |
| `npm run build`     | production build (`dist/`, service worker bilan)        |
| `npm run preview`   | buildni lokal ko‘rish                                   |
| `npm run lint`      | oxlint tekshiruvi                                       |
| `npm run typecheck` | TypeScript tekshiruvi                                   |
| `npm run test`      | Vitest testlari                                         |
| `npm run test:e2e`  | Playwright testlari (planshet va telefon, offline ham)  |
| `npm run check`     | hammasi birga: format, lint, typecheck, test, build     |

Playwright birinchi marta: `npx playwright install chromium`.

## Nimalar bor

**Bola uchun**

- Til tanlash (o‘zbek, rus, ingliz), “Kim o‘ynaydi?” – har bir bola o‘z robotini bosib kiradi.
- Alifbo va 1–10 sonlari: harf so‘z ichida rangli ajratiladi, sonlarni bosib sanash.
- 4 ta o‘yin: harfni top, rasmni top, juftini top, harfni barmoq bilan yoz.
- Coinlar: xatosiz +5, xato bilan +3, kunlik sovg‘a +2. Coin hech qachon jarima sifatida ayirilmaydi.
- Bugungi reja (3 o‘yin), stikerlar albomi, robotga kiyim do‘koni.
- Uy vazifasi (ota-ona bergan harflar) bosh sahifada birinchi turadi.
- Katta sinov (hamma harflar o‘rganilgach) va yuklab olinadigan PNG sertifikat.
- Kunlik vaqt chegarasi: tugashidan 2 daqiqa oldin eslatma, keyin dam olish ekrani – undan faqat ota-ona chiqara oladi.
- 3D robotlar Lola va Bobo (tirik harakatlar, ko‘z qirpish, nigoh), WebGL bo‘lmasa SVG robot.

**Free va PRO**

- Free: tugmalarda yumshoq “klik”, robot o‘y pufakchalari bilan “gapiradi”, ovoz yo‘q.
- PRO: harf, so‘z, son va topshiriqlar ovoz bilan aytiladi, robot “Yahoooo!”/“Oops!” deydi.

**Ota-ona bo‘limi** (ko‘paytirish misoli bilan himoyalangan)

- Bugungi hisobot, haftalik coinlar, xatolar tahlili (“Ch o‘rniga Sh”), mashq kerak harflar.
- 1–3 bola profili (jins → robot, kunlik vaqt), uy vazifasi, ovoz va til sozlamalari.
- PRO: tariflar, Click / Payme / Uzum Pay, promokod, Demo PRO.

## Ochiq aytilishi kerak bo‘lgan cheklovlar

- **To‘lovlar sinov rejimida.** `src/services/payments/mockPayment.ts` to‘lovni faqat taqlid qiladi va pul yechmaydi. Haqiqiy to‘lov uchun Click/Payme/Uzum merchant hisobi va to‘lov xabarini (callback) tekshirib, `subscriptions` jadvaliga service role bilan yozadigan server kerak.
- **Promokodlar** (`KIDDO7` – 7 kun, `BOLAJON30` – 30 kun) hozircha qurilmada tekshiriladi. Ishlab chiqarishda ularni ham serverga o‘tkazish kerak.
- **Ovoz.** Yozib olingan ovozlar hali yo‘q, shuning uchun qurilmaning o‘z ovozi (Web Speech API) ishlatiladi. Qurilmada o‘zbek ovozi bo‘lmasa, ilova jim turadi (noto‘g‘ri talaffuz qilmaydi). Yozuvlar tayyor bo‘lganda faylni `public/audio/{til}/{tur}/{id}.mp3` ga qo‘ying va id’ni `src/services/audio/voiceLibrary.ts` ga yozing – shu zahoti o‘sha yozuv ishlatiladi.
- **Rasmlar** emoji: barcha qurilmada bor, offline ishlaydi, mualliflik huquqi muammosi yo‘q.
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
