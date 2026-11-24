Tavsiya etilgan model: **Opus 5.5**, chunki B1 flaky/timeout testlarning ildiz sababini topishni talab qiladi (murakkab debug). Mexanik qismlarni subagentlarga Sonnet 5.5 bilan bering.

# Kiddo: keyingi sessiya, bosqich B1 (xavfsizlik to'ri: testlarni yashil qilish)

Bu sessiya oldingi suhbatni bilmaydi. Hamma narsa fayllarda.

1. `docs/MASTER_PROMPT_V3.md` ni to'liq o'qi: u yagona manba, 3-bo'lim qoidalari buzilmaydi. Istisno: branch `app-v3` emas, **`feat/capacitor-codemagic`** da qol (`docs/handoff/DECISIONS.md`).
2. `docs/handoff/STATE.md` va `docs/handoff/PLAN.md` ni o'qi. `git status`, `git log -5 --oneline`, branch'ni tekshir. `docs/MASTER_PROMPT_V3.md` va `docs/reference/TADQIQOT.md` Hojiakbarning commit qilinmagan fayllari: ularga tegma, commit'ga qo'shma.
3. Skill inventari: `docs/handoff/SKILLS.md`. Har vazifa oldidan `ponytail:ponytail`; B1 uchun `superpowers:systematic-debugging`, `mattpocock-skills:diagnosing-bugs`, `superpowers:verification-before-completion`.

## B1 vazifalari
- Vitest 7 yiqilgan test (`STATE.md`): admin (4 ta), `MathPage`, `parent` (`/parent` ≠ `/parent/login`: haqiqiy xato bo'lishi mumkin), `DinoPage`. Sabablar: timeout, "router is still loading", `store.createIndex is not a function`. Timeout'ni oshirish bilan "tuzatma": ildiz sababi.
- React "duplicate key" ogohlantirishlari (birthday, award, CoinBadge).
- Playwright e2e bazasini o'lcha, ma'lum flake'lar: "coins", opening "key/tap skips", homework "planet" (`.claude/mvp-progress.md:206,240`).
- Bazaviy ekran yuklanish vaqtlarini o'lcha (B0 da qilinmadi), `STATE.md` ga yoz.
- Parallel: 4 tagacha subagent (admin / parent / Math+Dino / e2e), fayllar kesishmasin.

## Ochiq ishlar va xavflar
- Native paketga ~215 MB ovoz kiradi: B2 da hal qilinadi (`PLAN.md` 2-bo'lim). `public/audio/voice` dagi mp3 larni O'CHIRMA.
- Native'da kirish ishlamaydi (nisbiy `/api`, Google OAuth WebView): B7.
- Kompyuterda GPU yo'q, RAM cheklangan: vitest (~194 s) va e2e ni bir vaqtda ishga tushirma.
- Oxirida 7-bo'lim handoff: `STATE.md`, `REPORT_B1.md`, shu faylni B2 uchun qayta yoz. Push yo'q.
