# Qarorlar (bir qator: sana | qaror | sabab)

- 2026-11-24 | Branch `app-v3` emas, `feat/capacitor-codemagic` | Hojiakbar shunday buyurdi (3-bo'lim 8-qoidadan ustun).
- 2026-11-24 | B7 (Capacitor) va B8 (Codemagic) qismi B0 dan oldin qilingan, qayta qilinmaydi | Avvalgi sessiyada alohida buyruq bilan bajarilgan (commit c105f044); B0 inventarida solishtirildi.
- 2026-11-24 | `public/audio/voice` dagi 15 979 mp3 o'chirilmaydi | 3-bo'lim 2-qoida; o'chirish B3 dan keyin Hojiakbar tasdig'i bilan.
- 2026-11-24 | B2 da mavjud mp3 lar "issiq kesh" sifatida ishlatiladi, native paketga kirmaydi | Qayta sintez kvotasini tejaydi, paket hajmini ~215 MB ga kamaytiradi (PLAN.md B2).
- 2026-11-24 | Hojiakbarning commit qilinmagan `docs/MASTER_PROMPT_V3.md` va `docs/reference/TADQIQOT.md` o'zgarishlari commit'ga qo'shilmaydi | 3-bo'lim 3-qoida.
- 2026-11-24 | B2 asosiy jonli manba: edge-tts (kalitsiz, server tomonda); Gemini TTS (ZEHN usuli) faqat kalit berilsa, maskot iboralarini oldindan yaratish uchun | ZEHN Gemini ishlatadi (docs/voice/ZEHN_METHOD.md), lekin bepul limit ~10 so'rov/kun/model, kalit kerak; 10-bo'lim "faqat tekin, kalitsiz variant bilan davom et".
- 2026-11-24 | Hojiakbar so'rovi bilan `docs/MASTER_PROMPT_V3.md` va `docs/reference/TADQIQOT.md` alohida commit qilindi (443fc4d9) | Oldingi "commit'ga qo'shilmaydi" qarorini Hojiakbarning aniq buyrug'i bekor qildi.
- 2026-11-24 | Vitest `maxWorkers: 6` | 11 worker CPU'ni bo'g'adi, admin lazy route 10 s dan oshadi (2/2 qizil vs 2/2 yashil); narxi 10–45 s sekinlik.
- 2026-11-24 | E2E faqat `--workers=1` | 4 worker bilan xotira yetmay jarayon o'ldirildi.
- 2026-11-24 | E2E flake'lar timeout'ni ko'paytirib emas, sabab bo'yicha tuzatildi (holat kutish, progress raqami, inert) | coins da umumiy budjet 120 s, chunki ilova maqtov ovozini 15 s gacha kutadi.
- 2026-11-24 | B1 da parallel subagentlar ishlatilmadi (faqat bitta reviewer) | RAM; vitest/e2e bir vaqtda yugurib bo'lmaydi.
- 2026-11-24 | 37 qolgan e2e yiqilish B1 da tuzatilmadi, ro'yxatga olindi | B1 maqsadi baza + 3 ma'lum flake; har to'liq yugurish 1.9 soat.
