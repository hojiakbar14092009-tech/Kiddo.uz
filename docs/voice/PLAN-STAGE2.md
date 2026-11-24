# 2-bosqich rejasi: barcha ovozlar VoiceStudio’da (hali boshlanmagan)

O‘lchov (pilot, CPU i5-1334U, `steps=16`, `speed=0.85`, design ovoz): generatsiya **≈1,07 s / belgi** + ~5 s/klip (ffmpeg),
ru/en transcribe ≈ 60–90 s/klip. Hisob: `soat = (belgi × 1,07 + klip × 5) / 3600`. Noyob = bir xil (til, matn, ovoz) bitta.

| # | guruh | ovoz(lar) | noyob klip | belgi | CPU, soat |
|---|---|---|---|---|---|
| 1 | Ovozsiz qolgan gaplar (uz 602, ru 608, en 587) | narrator | 1 797 | 46 840 | 16 |
| 2a | Tarbiya kliplari (gapiruvchi bo‘yicha, 3 til) | Mini, Piku + 6 yordamchi ovoz | 3 151 | 85 126 | 30 |
| 2b | Tarbiya mashqlari ovozi (intro/item/hint/praise, 3 til) | Mini **va** Piku (bola jinsi bo‘yicha) | 5 132 | 131 910 | 46 |
| 3 | Masshtab portali (6 buyum × nom + jumla × 3 til) | Mini, Piku | 72 | ~2 500 | 1 |
| 4 | Birinchi so‘zim (12 so‘z) | narrator, Mini, Piku | 36 | ~700 | 0,3 |
| 5 | Alifbo (harf + so‘z, 3 til) | narrator, Mini, Piku | 534 | 1 860 | 1,3 |
| 6 | Mini/Piku gaplari (hozirgi uz to‘plami, 3 tilga) | Mini, Piku | 5 538 | 122 238 | 42 |
| 7 | Shorts (8 dars, 114 qator × 3 til) + Remotion qayta render | Mini, Piku | 342 | 11 363 | 4 |
| 8 | Narrator qolgan to‘plami | narrator | 5 519 | 140 254 | 49 |
| | ru/en tasodifiy 10 % transcribe | | ~1 470 | | ~29 |
| | **Jami** | | **≈22 100** | **≈543 000** | **≈220 soat ≈ 9–10 kun 24/7** |

Qisqartirish imkoniyatlari (egasi tanlaydi): 2b ni bitta ovozda (gapirayotgan maskot) yaratish −23 soat.

## Kerakli qarorlar (boshlashdan oldin)
- **Narrator ovozi** hali tanlanmagan (pilotda faqat Mini/Piku). Taklif: `female, young adult, moderate pitch` design, 3 tilda kichik pilot.
- **Tarbiyadagi yordamchi qahramonlar** (CURRICULUM: ona 72, Laylo 55, Ali 40, buvi 32, ota 21, bobo 13, boshqalar 14 qator): 6 design ovoz — ona (female, middle-aged), ota (male, middle-aged), buvi (female, elderly), bobo (male, elderly), Laylo (female, child, moderate), Ali (male, child, moderate); qo‘shni/opa/amaki/xodim shulardan biriga.
- **uz yozuv usuli**: B fazasidagi tinglov natijasi → `normalize_uz.DEFAULT`.

## Ish usuli
- Bitta navbat skripti (`scripts/voices/voice_queue.py`, yoziladi): manifest `scripts/voices/vs-manifest.json` — `kalit, matn sha1, ovoz ID, usul, holat, sana`. Faqat yangi yoki matn hashi o‘zgargan klip yaratiladi; har 50 klipda manifest diskka yoziladi; uzilsa o‘sha joydan davom etadi.
- Natija **alohida papkaga** (`%USERPROFILE%\voice-out\<guruh>\<til>\<kalit>.mp3`) — ilova fayllariga tegmaydi. Egasi «ulaymiz» desagina guruh `public/audio/voice/...` ga ko‘chiriladi (kalit/yo‘l o‘zgarmaydi, eski fayllar git tarixida).
- RAM nazorati: bo‘sh RAM < 3 GB bo‘lsa 5 daqiqagacha kutadi, keyin to‘xtaydi (exit 3), qayta ishga tushirilsa davom etadi.
- Tekshiruv: uz — sukunat (boshi/oxiri kesiladi), uzunlik (juda qisqa/uzun), klipping (cho‘qqi > −0,5 dB), loudness (−16 LUFS ±1). ru/en — shular + tasodifiy 10 % transcribe (o‘xshashlik < 0,85 → 1 marta qayta, keyin `docs/voice/REVIEW.md`). Q/G‘ so‘zli uz kliplar ro‘yxati alohida (`REVIEW-QG.md`) — quloq bilan.
- Har kun oxirida 10–15 tasodifiy klip `%USERPROFILE%\voice-test\daily\<sana>\` ga nusxalanadi.
- Mavjud audio precache’ga kirmaydi (`voiceBuild.ts`), runtime CacheFirst — o‘zgartirish shart emas.

## Kompyuter uxlab qolmasligi uchun
1. Zaryadlagichga ulab qo‘ying.
2. Sozlamalar → Tizim → Quvvat → «Ekran va uyqu»: «Ulanganida uyquga o‘tish» = **Hech qachon** (ekran o‘chsa mayli).
3. Boshqaruv paneli → Quvvat → «Qopqoq yopilganda» = **Hech narsa qilmaslik** (ulanganida).
4. Ish paytida Chrome va ortiqcha Claude oynalarini yoping: VoiceStudio o‘zi ~5 GB oladi, 16 GB kompyuterda bo‘sh RAM 3 GB dan pastga tushadi.
