# Kiddo

3–6 yoshli bolalar uchun o‘zbek, rus va ingliz alifbosini o‘yin orqali o‘rgatuvchi veb-ilova. Asosan planshet (iPad) va telefon uchun mo‘ljallangan.

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173 (lokal tarmoqdagi iPad’dan ham ochiladi)
```

## Buyruqlar

| Buyruq              | Vazifasi                                            |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | ishlab chiqish serveri                              |
| `npm run build`     | production build (`dist/`)                          |
| `npm run preview`   | buildni lokal ko‘rish                               |
| `npm run lint`      | oxlint tekshiruvi                                   |
| `npm run typecheck` | TypeScript tekshiruvi                               |
| `npm run test`      | Vitest testlari                                     |
| `npm run check`     | hammasi birga: format, lint, typecheck, test, build |

## Texnologiyalar

React 19, TypeScript (strict), Vite, Tailwind CSS 4, React Router, Zustand, i18next, Framer Motion, Vitest + Testing Library.

## Papkalar tuzilmasi

```
src/
  app/          ilova asosi: marshrutlar, himoyalangan yo‘llar
  components/   umumiy UI: tugmalar, ikonlar, layout, bayroqlar
  content/      tillar va alifbo kontenti
  features/     har bir bo‘lim alohida: onboarding, home, alifbo, vazifalar, ota-ona
  i18n/         interfeys tarjimalari (uz, ru, en)
  store/        Zustand holatlari (localStorage’da saqlanadi)
  styles/       Tailwind dizayn tokenlari va shriftlar
  test/         test yordamchilari
```
