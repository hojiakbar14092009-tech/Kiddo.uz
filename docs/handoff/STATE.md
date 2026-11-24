# STATE (yangilangan: 2026-11-24, B1 oxiri)

Branch: `feat/capacitor-codemagic` (push yo'q). Keyingi bosqich: **B2** (ovoz dvigateli).

## Bajarilgan
- B0: inventar va reja (`PLAN.md`, `MAP_B0.md`, `STORE_STATUS.md`, `SKILLS.md`, `DECISIONS.md`, `HUMAN_TODO.md`, `docs/voice/ZEHN_METHOD.md`).
- B1 (`REPORT_B1.md`): vitest yashil; uch ma'lum e2e flake ildiz sababi bilan tuzatildi; e2e to'liq bazasi va ekran yuklanish vaqtlari o'lchandi. Commitlar: 443fc4d9 (Hojiakbar so'rovi: MASTER_PROMPT_V3 + TADQIQOT), a68d9471 (vitest), fda143b4 (e2e flake'lar), e3acb637 (coins/homework, `scripts/measure-load.mjs`).

## Qolgan
B2–B9 (`PLAN.md` 3-bo'lim).

## Testlar holati
- **Vitest:** 1 892 / 1 892 yashil, ketma-ket 2 marta (190.4 s, 223.5 s), `maxWorkers: 6` bilan. Standart 11 worker bilan 2/2 qizil edi (179 s, 171 s).
- **E2E to'liq baza** (`npx playwright test --workers=1`, 1.9 soat): **266 o'tdi, 38 yiqildi, 22 o'tkazildi.** Keyin coins tuzatildi (6/6), demak hozir ma'lum 37 yiqilish (~16 alohida test, ko'pi tablet+phone ikkalasida):
  - `math-lab` (savatcha 320×568, to'rt yoshli, mehmon level-2) — ikkala proyekt, deterministik ko'rinadi
  - `performance` "first screen download budget" — `scripts KB` byudjetdan oshgan (B5 bilan bog'liq)
  - `release-matrix` (faqat tablet proyekti): `/explore/find-home` 320/360/393 px da sig'maydi; `/parent` 150%/200% matnda yon scroll
  - `speech`: til almashganda ovoz to'xtashi (click timeout); speaker 320/390 px da boshqa tugmani yopadi
  - `scale-portal` (hech narsa ishlab qolmaydi; rail klaviatura), `garden`, `garden-domains`, `attention` helper, `kiddo` demo promo kod PRO, `production` PIN admin narxlari, `living-mascots` robot, `pet-shop` do'stlik yuragi, `tutor` hint ladder
  - **Sabablari tekshirilmagan** (B1 da faqat 3 ma'lum flake ildizigacha o'rganildi). Log: sessiya scratchpad, takrorlash: yuqoridagi buyruq.
- Lint: `tsc -b` va `oxlint` B0 dan beri o'zgarmagan kodda tekshirilmagan; B1 da o'zgargan fayllar oxlint 0, prettier toza.

## Ekran yuklanish bazasi (B1, `scripts/measure-load.mjs`)
Pixel 7 emulyatsiya, CPU ×4 sekin, sovuq yuklash, 3 ta yangi kontekst medianasi, "DOM tayyor" (loading screen yo'q va ekran tugma/sarlavha ko'rsatdi). FCP o'lchanmaydi: ochilish pardasi ustida turadi.

| ekran | ms | ekran | ms |
|---|---:|---|---:|
| /home | 970 | /shop | 971 |
| /learn | 837 | /studio | 897 |
| /explore | 762 | /shorts | 1080 |
| /alphabet | 685 | /collection | 1160 |
| /learn/math | 951 | /parent → /parent/login (kutilgan) | 992 |
| /learn/space | 1079 | /games | 1080 |

B5 uchun kuzatuv: planshetda Home 3D (2 canvas) ochilish pardasi paytida yuklanib, 55–707 ms long task beradi; uni parda tugagandan keyin yuklash nomzodi.

## Ma'lum muammolar
- Yuqoridagi 37 e2e yiqilish (sabablari ochiq).
- Vitest `maxWorkers: 6`: 10–45 s sekinroq, lekin barqaror.
- Native paketga ~215 MB ovoz kiradi (B2).
- Native'da kirish ishlamaydi (B7).
- RAM: to'liq e2e 4 worker bilan xotira yetmay o'ldirildi; faqat `--workers=1`. Vitest va e2e ni bir vaqtda ishga tushirma.
- `founder/` biznes-reja paketi (foydalanuvchi so'rovi bilan B1 sessiyasida) commit qilingan: e870ce76. Panel simulyatsiya, raqamlar taxmin.
