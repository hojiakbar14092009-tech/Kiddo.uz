# STATE (yangilangan: 2026-11-24, B0 oxiri)

Branch: `feat/capacitor-codemagic` (push yo'q). Keyingi bosqich: **B1**.

## Bajarilgan
- B0: inventar va reja (`PLAN.md`, `MAP_B0.md`, `STORE_STATUS.md`, `SKILLS.md`, `DECISIONS.md`, `HUMAN_TODO.md`, `docs/voice/ZEHN_METHOD.md`).
- Oldindan (B0 dan avval, alohida buyruq bilan): Capacitor 8 + Codemagic (c105f044), edge-tts ovoz (5926b537, d66096c2). Master prompt bilan solishtiruv: `PLAN.md` 1-bo'lim.

## Qolgan
B1–B9 (`PLAN.md` 3-bo'lim).

## Ma'lum muammolar
- Vitest: 7 yiqilgan / 1 885 o'tgan (1 892), 253 fayl, 194 s. Yiqilganlar: `admin/admin.test.tsx`, `admin/adminPin.test.tsx`, `admin/analytics.test.tsx`, `admin/analyticsCloud.test.tsx`, `math/MathPage.test.tsx`, `parent/parent.test.tsx`, `worlds/dino/DinoPage.test.tsx`. Sabablar: 3 timeout (15/20 s), "router is still loading", `store.createIndex is not a function`, `/parent` ≠ `/parent/login`.
- React "duplicate key" ogohlantirishlari: birthday, award, CoinBadge testlari.
- E2E (B0 da ishga tushirilmadi): avvaldan ma'lum "coins", opening "key/tap skips", homework "planet" (`.claude/mvp-progress.md`).
- Native paketga ~215 MB ovoz kiradi (B2 da hal qilinadi).
- Native'da kirish ishlamaydi (B7).
- Hojiakbarning commit qilinmagan fayllari: `docs/MASTER_PROMPT_V3.md` (o'zgargan), `docs/reference/TADQIQOT.md` (yangi). Ularga tegilmadi.

## Bazaviy o'lchovlar (B0, 2026-11-24)
- `tsc -b`: 0 xato. `oxlint --deny-warnings src`: 0. `npm run budget`: OK, app shell 63 skript, 358 KB gzip; precache 80 fayl, 1.47 MB.
- `dist/` 355 MB: audio 251 MB, video 57 MB, assets 33 MB (JS 4.39 MB / 163 fayl; `vision_wasm` 13 + 14 MB), animals 4.2, models 3.6, mascots 3.3, 3d 1.8, pictures 1.8 MB.
- Eng katta JS: `prepareRenderer` 530 KB, `index` 526 KB, `three.core` 368 KB, `vision_wasm_internal` 326 KB ×2, `AdminPage` 175 KB, `ru` lug'ati 142 KB (gzip emas).
- `public/` (git'da): mp3 214.9 MB / 15 982 (voice 15 979: uz 63.8 / 4 629, ru 71.3 / 4 616, en 55.5 / 4 514, kid/girl 12.4 / 1 111, kid/boy 11.8 / 1 109; ui 3), mp4 55.7 MB / 44, glb 7.2 MB / 22, `.task` 3.6 MB / 1, webp 2.1 MB / 266, svg 1.6 MB / 112, png 0.3 MB / 4.
- Ekranlarning yuklanish vaqti: **o'lchanmadi** (B1 boshida Playwright bilan, B5 uchun asos).
