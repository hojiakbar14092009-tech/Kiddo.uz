# Oʻzbekcha talaffuz sinovi (v3) — tinglash yoʻriqnomasi

**Muhim:** oʻzbekcha audio uchun hech qanday avtomatik tekshiruv qilinmagan. Hammasini faqat inson qulogʻi baholaydi.

Fayllar: `%USERPROFILE%\voice-test\v3\edge_*.mp3` (21 ta). Yaratuvchi: `python scripts/voices/pilot_v3.py`.

## Fayllar nima

**1. Soʻzlar roʻyxati (18 fayl)** — bitta matn: qoʻl/koʻl, qir/kir, qum/kum, qozon, qovun, quyosh, kitob, kalit, gʻoz, gʻisht, togʻ, bogʻ, oʻrdak, shamol, choy, tong, ming, qoʻngʻiroq, ... (qoʻl, koʻl, qir, kir, qum, kum, qozon, qovun, quyosh, kitob, kalit, gʻoz, gʻisht, togʻ, bogʻ, oʻrdak, shamol, choy, tong, ming, qoʻngʻiroq).
Nomi: `edge_<ovoz>_<imlo>_<tezlik>.mp3`
- ovoz: `madina` (ayol), `sardor` (erkak)
- imlo: `02bb` (ʻ U+02BB), `2019` (’ U+2019), `ascii` (' U+0027)
- tezlik: `r90` (-10%), `r80` (-20%), `r70` (-30%)

**2. Ilova jumlalari (3 fayl)** — 30 jumla, imlo `02bb`, tezlik -20%, " ... " bilan ulangan: `edge_narrator_phrases30_r80.mp3`, `edge_girl_phrases30_r80.mp3`, `edge_boy_phrases30_r80.mp3` (har rolning oʻz ovozi va pitchi, voiceConfig.json dan).

**Kirill varianti (`cyr`) yaratilmadi:** Edge uz-UZ ovozlari kirillcha matnga "No audio was received" qaytardi (6 fayl, har biri 2 urinishdan keyin). Demak kirillcha imlo bu ovozlarda ishlamaydi.

## Nimaga quloq solish

- **Q** — tomoqdan chiqadigan (uvulyar) qalin tovush, **K** ga oʻxshamasligi kerak.
- **qoʻl va koʻl** (qum/kum, qir/kir ham) aniq farqlansin.
- **Gʻ** — yumshoq tomoq "g", oddiy "g" emas (gʻoz, togʻ, bogʻ).
- **Oʻ** — "oʻrdak": yumaloq "o", rus "o" emas.
- **NG** — "tong", "ming": burun "ng", oxirida alohida "g" eshitilmasin; "qoʻngʻiroq" ham.
- **SH / CH** — shamol, choy: tiniq, "s"/"ts" emas.
- Imlolar orasida farq: apostrof tushib qolishi, "oʻ"→"o", "gʻ"→"g" yoki "ʼ" alohida pauza boʻlib eshitilishi — yomon.
- **Tezlik**: 4–7 yoshli bola uchun tushunarli, lekin sunʼiy choʻzilmagan boʻlsin.

## Toʻldirish jadvali (✔ / ✘ / izoh)

| Fayl | Q toʻgʻri? | Gʻ toʻgʻri? | Tabiiymi? | Tezlik yoqdimi? |
|---|---|---|---|---|
| edge_madina_02bb_r90.mp3 | | | | |
| edge_madina_02bb_r80.mp3 | | | | |
| edge_madina_02bb_r70.mp3 | | | | |
| edge_madina_2019_r90.mp3 | | | | |
| edge_madina_2019_r80.mp3 | | | | |
| edge_madina_2019_r70.mp3 | | | | |
| edge_madina_ascii_r90.mp3 | | | | |
| edge_madina_ascii_r80.mp3 | | | | |
| edge_madina_ascii_r70.mp3 | | | | |
| edge_sardor_02bb_r90.mp3 | | | | |
| edge_sardor_02bb_r80.mp3 | | | | |
| edge_sardor_02bb_r70.mp3 | | | | |
| edge_sardor_2019_r90.mp3 | | | | |
| edge_sardor_2019_r80.mp3 | | | | |
| edge_sardor_2019_r70.mp3 | | | | |
| edge_sardor_ascii_r90.mp3 | | | | |
| edge_sardor_ascii_r80.mp3 | | | | |
| edge_sardor_ascii_r70.mp3 | | | | |
| edge_narrator_phrases30_r80.mp3 | | | | |
| edge_girl_phrases30_r80.mp3 | | | | |
| edge_boy_phrases30_r80.mp3 | | | | |

## Qaysini tanlash

1. Eng yaxshi **imlo**: `scripts/voices/normalize_uz.py` dagi `DEFAULT` va `server/tts.ts` dagi `UZ_APOSTROPHE` ga yoziladi (`02bb` → ʻ, `2019` → ’, `ascii` → ').
2. Eng yaxshi **ovoz / tezlik / pitch**: `src/services/audio/voiceConfig.json` da tegishli rolning `voices.uz`, `rate` (r90=-10%, r80=-20%, r70=-30%), `pitch` maydonlariga yoziladi.
3. Oʻzgartirilgan har bir rolning `"version"` qiymatini **1 ga oshiring** (keshni yangilash uchun).

## Sinovda ishlatilgan 30 jumla

1. Toʻgʻri!
2. Topding!
3. Barakalla!
4. Quyosh qani?
5. Uyini topding.
6. Qurbaqani top!
7. Zoʻr, topding!
8. Qani, boshladik.
9. Juda tez topding!
10. Qani, bosib koʻr!
11. Bu qator toʻgʻri.
12. Hammasini topding!
13. Toʻgʻri harfni tanla.
14. Birinchi qadam toʻgʻri!
15. Toʻgʻri yozilishi: Non.
16. Toʻgʻri yozilishi: Fil.
17. Toʻgʻri yozilishi: Olma.
18. Toʻgʻri yozilishi: Uzum.
19. Toʻgʻri yozilishi: Sher.
20. Toʻgʻri yozilishi: Choy.
21. endi toʻgʻri kartani bos
22. haqida hammasini topding!
23. Toʻgʻri yozilishi: Baliq.
24. Toʻgʻri yozilishi: Kalit.
25. Toʻgʻri yozilishi: Tulki.
26. Toʻgʻri yozilishi: Quyon.
27. Toʻgʻri yozilishi: Sabzi.
28. Yana qara.
29. Yana qidir!
30. Yana oʻynash
