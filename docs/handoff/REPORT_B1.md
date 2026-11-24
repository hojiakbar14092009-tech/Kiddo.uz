# REPORT B1: xavfsizlik to'ri (2026-11-24)

## Nima qilindi
1. **Docs commit** (Hojiakbar so'rovi, birinchi): `docs/MASTER_PROMPT_V3.md`, `docs/reference/TADQIQOT.md` → 443fc4d9.
2. **Vitest yashil** (a68d9471):
   - admin "router is still loading": CPU ortiqcha yuklanishi (11 worker / 12 thread, admin route'ning sovuq lazy import'i 10 s dan oshgan). Dalil: standart worker 2/2 qizil, `maxWorkers: 6` 2/2 yashil. `vite.config.ts`.
   - `store.createIndex is not a function`: `nameVoice.test.ts` dagi soxta IndexedDB profil o'chirilganda studio galereyasini ham ochadi → stub'ga `createIndex`/`index` qo'shildi.
   - 26 "duplicate key": `CoinBadge` ikki qo'shni span bir xil key → `gain-` prefiksi; test endi `console.error` yo'qligini tekshiradi.
3. **E2E ma'lum flake'lar** (har biri avval takrorlandi, sabab dalil bilan):
   - homework "planet": qat'iy 1400 ms kutishdan keyin eski savolning `data-answer` o'qilgan → yo'q "Mars" tugmasi 180 s osilib qolgan. Tuzatish: hal qilingan holat (`data-status="correct"`) avval ko'rinishi, keyin yo'qolishini kutish. 5/5, keyin 6/6.
   - coins: (a) maqtov ovozi bilan 5 raund 27–37 s, 30 s standartdan oshgan → 120 s; (b) planshetda "javob o'zgardi" kutishi 30 s bilan ham 3/3 qotdi (ehtimoliy sabab: bir harf ketma-ket so'ralsa javob o'zgarmaydi; isbotlanmagan) → endi "N-savol" progress belgisini kutadi. 6/6 (tablet 3, phone 3).
   - opening key/tap: faqat planshetda 1/10; Escape'dan keyin 0.35 s fade 3D long task'lar bilan 1.6 s gacha cho'ziladi. Tuzatish: o'tkazib yuborish darhol (`inert` 1.5 s ichida olinadi), fade o'z vaqtida. 40/40.
4. **E2E to'liq baza** (`--workers=1`, 1.9 soat): 266 o'tdi / 38 yiqildi / 22 o'tkazildi. Ro'yxat `STATE.md` da; coins dan tashqari 37 tasi tekshirilmagan.
5. **Ekran yuklanish bazasi**: `scripts/measure-load.mjs`, 12 ekran 685–1160 ms (`STATE.md`).

## O'zgargan fayllar
`vite.config.ts`, `src/components/ui/CoinBadge.tsx`, `src/components/ui/CoinBadge.test.tsx`, `src/features/attention/nameVoice.test.ts`, `e2e/homework.spec.ts`, `e2e/kiddo.spec.ts`, `e2e/opening.spec.ts`, `scripts/measure-load.mjs` (yangi), `docs/handoff/*`.

## Haqiqatan tekshirilgan
- Vitest to'liq: 2 × yashil (1 892/1 892), 190.4 s va 223.5 s (oldin 179 s, qizil).
- E2E to'liq bir marta (natija yuqorida). Tuzatilgan uch test alohida takrorlandi: planet 6/6, coins 6/6, opening 40/40.
- O'zgargan fayllar: oxlint 0 ogohlantirish, prettier toza.
- Mustaqil code review (`ecc:code-reviewer` subagent): xato topilmadi; homework bo'yicha bitta past xavf eslatmasi qabul qilindi.
- Tekshirilmagan: `tsc -b` to'liq qayta ishga tushirilmadi; 37 e2e yiqilish sababi; to'liq e2e qayta yugurilmadi (1.9 soat).

## Skill'lar
- `ponytail:ponytail` (ultra/full): minimal tuzatishlar, ortiqcha kod yo'q.
- `superpowers:brainstorming`: B1 dizaynini Hojiakbar bilan kelishish (maxWorkers, flake'lar).
- Ildiz sabab izlash `systematic-debugging` uslubida qilindi, lekin bu skill Skill tool orqali **chaqirilmagan**.
- Subagent: `ecc:code-reviewer` (mustaqil review). Boshqa subagent ishlatilmadi (RAM).
- Shu sessiyada foydalanuvchi so'rovi bilan B1 dan tashqari: `founder-board` va `founder-all` (11 founder skill) → `founder/` (commit qilinmagan).

## To'siqlar
- 37 e2e yiqilish B1 doirasidan tashqarida qoldi (vaqt: har to'liq yugurish 1.9 soat, RAM faqat 1 worker).
