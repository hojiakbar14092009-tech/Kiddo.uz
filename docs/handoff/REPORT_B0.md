# REPORT B0: inventar va reja (2026-11-24)

## Nima qilindi
- Master prompt v3 to'liq o'qildi. Tayyor Capacitor, Codemagic va ovoz ishi talablar bilan solishtirildi (`PLAN.md` 1-bo'lim: mos / mos emas / tekshirilmagan).
- ZEHN ovoz usuli aniqlandi (faqat o'qib): Gemini TTS, kalit kerak, bepul ~10 so'rov/kun/model → `docs/voice/ZEHN_METHOD.md`. Qaror: B2 da kalitsiz edge-tts asosiy, Gemini ixtiyoriy (`DECISIONS.md`).
- Pro, ovoz va klip joylari xaritasi → `MAP_B0.md` (ProFeature 6 ta; bayroqsiz ~20 joy; ovoz 53 fayl; ilovada Remotion Player yo'q, 20 shorts mp4).
- Rasmiy talablar bugungi holati → `STORE_STATUS.md` (Capacitor 8.6.2 latest, 9 rc; Play API 36; Xcode 26; 12 tester × 14 kun; Codemagic 500 min M2).
- Statik mp3 hajmi o'lchandi va B2 o'tish rejasi yozildi (`PLAN.md` 2-bo'lim). Hech narsa o'chirilmadi.
- Bazaviy o'lchovlar → `STATE.md`.

## Muhim fayllar
`docs/handoff/PLAN.md`, `STATE.md`, `MAP_B0.md`, `STORE_STATUS.md`, `SKILLS.md`, `DECISIONS.md`, `HUMAN_TODO.md`, `NEXT_PROMPT.md`, `docs/voice/ZEHN_METHOD.md`. Kod o'zgarmadi.

## Haqiqatan test qilingan
- `npx tsc -b`: 0 xato. `npx oxlint --deny-warnings src`: 0.
- `npx vitest run`: 1 885 / 1 892 o'tdi, 7 yiqildi (ro'yxat STATE.md da). Tuzatish B1 da.
- `node scripts/perf-budget.mjs`: OK.
- `vite build`: shu sessiyada qayta ishga tushirilmadi; kod B0 da o'zgarmagan, oxirgi muvaffaqiyatli build c105f044 dagi kod bilan (dist 2026-11-24 17:32).
- Playwright e2e: **ishga tushirilmadi** (B0 da kod o'zgarmadi; ma'lum flake'lar B1 ga).
- Mustaqil tekshiruvchi subagent: hujjatlardagi raqam va yo'llarni repo bilan solishtirdi (natija pastda).

## Chaqirilgan skillar
`ponytail:ponytail`, `superpowers:dispatching-parallel-agents`, `superpowers:writing-plans`, `superpowers:verification-before-completion`. 3 subagent (sonnet) `ponytail:ponytail` ni chaqirdi.

## Qolgan bloker
- Inson: HUMAN_TODO.md (akkauntlar, keystore, bundle ID tasdig'i, ovoz tinglash).
- Texnik: B1 dan boshlab.

## Mustaqil tekshiruv natijasi
PASS. Hamma B0 va 7-bo'lim fayllari bor; tekshirilgan 10+ fakt (mp3 soni/hajmi, file:line havolalar, workflows, codemagic, capacitor.config) repo bilan mos; hujjatlar orasida zid joy yo'q; sir qiymatlari yo'q. Tuzatildi: `features.ts:54` -> `:53`. Tekshirilmagan: 53 chaqiruv joyi soni (MAP_B0.md agentining hisobi).
