# KIDDO MASTER PROMPT v3 (ilova: iOS + Android, jonli ovoz, Pro yashirin)

Sen Kiddo loyihasining bosh muhandisisan. Bu fayl butun ishning yagona manbasi. Uni to'liq o'qi, keyin "Hozirgi bosqich"ni aniqlab, o'sha bosqichni oxirigacha bajar.

Bu prompt master prompt v2 (ovoz, Tarbiya, tezlik, Clean Code, CI/CD) ustiga qo'shiladi. v2 bilan zid joyda shu v3 ustun. v2'dagi ovoz qismi (VoiceStudio, design_voice, 22 100 klip) BEKOR: VoiceStudio ham, ElevenLabs ham ishlatilmaydi.

---

## 1. LOYIHA

- Kiddo: 4-7 yoshli bolalar uchun o'rganish ilovasi, uz/ru/en. Repo: `%USERPROFILE%\Kiddo.uz` (main, Vercel Hobby avto-deploy push'da).
- Stek: React 19, Vite, TS, Tailwind, Zustand, i18next, three.js, PWA, Vitest, Playwright, Remotion, Vercel serverless (bitta dispatcher `api/index.ts`, Hobby 12 funksiya limiti, cron kuniga 1 marta), Turso/libSQL "kiddo" (Frankfurt). O'z autentifikatsiyasi: Google OAuth, email kod (Brevo SMTP), Telegram bot.
- Valyuta "yong'oq". Maskotlar: qiz robot Mini, o'g'il robot Piku (2D).
- Muhit: Windows, cmd. Mac YO'Q. Kompyuterda GPU yo'q, RAM cheklangan: og'ir jarayonlarni (emulyator, render, build) bir vaqtda bittadan ishga tushir.

## 2. YAKUNIY MAQSAD

1. Kiddo sayt emas, ILOVA: Capacitor bilan o'ralgan iOS va Android versiyalari, App Store va Google Play'ga topshirishga tayyor.
2. Ovoz: ZEHN loyihasidagidek tabiiy, haqiqiydek, tekin, internet orqali jonli yaratiladigan uz/ru/en ovoz, lekin bolalarga mos, yoqimli, tushunarli. Maskotlar bolaga do'stidek gapiradi.
3. Pro hammadan yashirin, lekin kodi saqlanadi; Pro imkoniyatlarining hammasi hamma uchun ochiq va ishlaydi.
4. Ilovadagi barcha klip va shorts professional darajada qayta yaratiladi (2D Mini va Piku, ranglar jonliroq).
5. Ilova qotmaydi, tez javob beradi, hajmi kichik, sifat tushmagan.
6. Har bosqich o'zi test qilingan, topilgan xato tuzatilgan, kamchilik to'ldirilgan.

## 3. BUZILMAS QOIDALAR

1. PUSH QILMA, DEPLOY QILMA. Faqat lokal commit. Push faqat Hojiakbar "push qil" deb yozganda. Force push hech qachon.
2. `rm -rf`, glob bilan o'chirish, `pkill`/`taskkill /F` ommaviy, `git reset --hard`, `git clean` YO'Q. Fayl o'chirish kerak bo'lsa aniq nomi bilan bittalab, sababini hisobotga yoz.
3. Hojiakbarning commit qilinmagan o'zgarishlarini o'chirma va ustidan yozma. Ish boshida `git status` qara; begona o'zgarish bo'lsa unga tegma.
4. Sirlar (token, kalit, parol) hech qayerga chiqmasin: chatga, logga, commit'ga, hisobotga. Sirlar faqat `.env.local` va Vercel Environment Variables'da. Yangi kalit kerak bo'lsa o'zing yaratma, `HUMAN_TODO.md`ga yoz.
5. Teamflow bazasiga tegilmaydi. Supabase kodi repoda qoladi, ishlatilmaydi, o'chirilmaydi.
6. Pulli xizmat yoqilmaydi, tarif sotib olinmaydi, karta talab qiladigan narsa o'zingcha ulanmaydi.
7. `%USERPROFILE%\voice-test\` va `voice-out\` papkalaridagi eski fayllarga tegma. `Desktop\AI suhbat` (ZEHN) faqat O'QILADI, unda hech narsa o'zgartirilmaydi.
8. Barcha ish `app-v3` branch'ida (yo'q bo'lsa main'dan och). main'ga merge qilma.
9. Huquqiy/litsenziya masalalarini muhokama qilma, lekin do'konlarning 9-bo'limdagi TEXNIK talablari majburiy: ularsiz ilova qabul qilinmaydi.
10. Hech narsani to'qib chiqarma: test o'tmagan bo'lsa "o'tdi" dema, bajarilmagan ishni "tayyor" dema. Tasdiqlanmagan narsani "tasdiqlanmagan" deb yoz.

## 4. TO'XTAMASDAN ISHLASH

- Hojiakbar barcha manbalarga ruxsat bergan. Tasdiq so'rama, savol berib kutib o'tirma, bosqichni oxirigacha o'zing olib bor.
- Noaniq joyda eng oqilona variantni tanla, qaroringni va sababini `docs/handoff/DECISIONS.md`ga bir qator qilib yoz, davom et.
- Faqat inson bajara oladigan ish chiqsa (akkaunt ochish, kalit kiritish, ovozni quloq bilan eshitish, haqiqiy iPhone'da sinash) TO'XTAMA: uni `docs/handoff/HUMAN_TODO.md`ga aniq qadamlari bilan yoz va unga bog'liq bo'lmagan ishlarni davom ettir.
- Istisno: 3-bo'lim qoidalarini buzishni talab qiladigan yoki qaytarib bo'lmaydigan amal (ma'lumot o'chirish, baza sxemasini buzuvchi migratsiya, tashqariga biror narsa yuborish). Bunda tayyorgarlikni qil, amalni bajarma, `HUMAN_TODO.md`ga yoz.
- Bir xil xato 3 marta takrorlansa o'sha yo'lni to'xtat: ildiz sababini izla (systematic-debugging), boshqa yondashuv tanla. Ko'r-ko'rona qayta urinma.

## 5. LIMITNI TEJASH (sifatni tushirmasdan)

Limitni maksimal teja, sifatni tushirmasdan:
- Butun repo'ni o'qima. Avval fayl nomi/simvol/import bo'yicha qidir, faqat kerakli fayl va bo'limni och. `node_modules`, `dist`, build chiqishlari, katta loglar, lock fayllarni o'qima.
- O'zgarmagan faylni qayta o'qima. Buyruq chiqishini qisqa ol (faqat xato qismi).
- Eng kichik ishonchli o'zgarishni qil. Mavjud komponent, util, kutubxonani qayta ishlat. Aloqasi yo'q refaktoring qilma.
- Subagentlarga faqat kerakli kontekstni ber (fayl yo'llari + aniq vazifa), ulardan QISQA hisobot so'ra (nima qildi, qaysi fayllar, qanday tekshirdi, nima qoldi).
- Mexanik ishlar (qidiruv, nom almashtirish, fayl siqish, tarjima kalitlarini tekshirish) uchun subagentga arzonroq model ber; arxitektura va murakkab debug uchun kuchlisini.
- Sessiya konteksti to'lib borayotganini sezsang, bosqichni mantiqiy nuqtada yop va handoff yoz (7-bo'lim). Yarim ishni "tugadi" dema.
- Token yoqadigan "cheksiz" rejimli skill/orkestratorlarni (masalan nomi "godmode", "idontcaretoken" kabi) ISHLATMA.

## 6. SKILLAR (majburiy)

Skillar ixtiyoriy emas. Har sessiya boshida:
1. O'zingda mavjud BARCHA skill, plugin, MCP connector va subagent turlarini ro'yxatdan o'tkaz (faqat nomi va tavsifi, ichini hammasini o'qima).
2. Shu bosqichga foyda beradiganlarini tanla va `docs/handoff/SKILLS.md`ga "bosqich: skill: nima uchun" ko'rinishida yoz.
3. Har vazifa oldidan tegishli skillni Skill tool orqali CHAQIR va uning ko'rsatmasiga amal qil. "Eslayman" deb chaqirmasdan o'tma.
4. Bosqich hisobotida haqiqatan chaqirilgan skillar ro'yxatini ber.

`ponytail:ponytail` HAR BOSQICHDA, kod yozadigan har vazifa oldidan majburiy: kamroq kod, sifat tushmasin. Subagentlarga ham shuni buyur.

Quyidagilar tavsiya, mavjud bo'lsa ishlat, yo'q bo'lsa to'qima va o'rnini bosadiganini top:
- Jarayon: `superpowers:writing-plans`, `superpowers:executing-plans`, `superpowers:dispatching-parallel-agents`, `superpowers:subagent-driven-development`, `superpowers:systematic-debugging`, `superpowers:test-driven-development`, `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.
- Kod sifati: `mattpocock-skills:diagnosing-bugs`, `mattpocock-skills:code-review`, `mattpocock-skills:tdd`, `zizi-skills:code-quality`, `zizi-skills:security-and-hardening`, `zizi-skills:database-optimization`, `zizi-skills:i18n`, `one-shot-prompting:perf-audit`, `one-shot-prompting:ship-check`.
- UI/UX: `vectorlab-ux-skills:ux-audit` va uning qolganlari (motion, loaders, errors, empty-states, viewports, reduced-motion), `design-skills:accessibility-audit`, `anthropic-skills:frontend-design`.
- Klip va media: `remotion:remotion-best-practices` va boshqa `remotion:*`, `anthropic-skills:ffmpeg-media`.
- Do'kon: `zizi-skills:app-store`.
- Handoff: `mattpocock-skills:handoff` yoki `zizi-skills:handoff`.
- Connectorlar: Playwright MCP (brauzer testi), Vercel MCP (faqat o'qish: log, env nomlari; deploy YO'Q), Figma (kerak bo'lsa).

## 7. BOSQICH TARTIBI VA HANDOFF

Har bosqich = alohida yangi sessiya. Bir sessiyada bitta bosqich.

Sessiya boshida:
1. Shu faylni va `docs/handoff/STATE.md`ni o'qi (yo'q bo'lsa B0'dan boshla).
2. `git status`, `git log -5 --oneline`, branch'ni tekshir.
3. Skillar ro'yxati (6-bo'lim).
4. Bosqich rejasini `superpowers:writing-plans` bilan qisqa yoz, keyin bajar.

Bosqich oxirida (hammasi majburiy):
1. 8-bo'limdagi testlarni o'tkaz, xatolarni tuzat, qayta o'tkaz.
2. Mantiqiy bo'laklarda commit qil (push YO'Q).
3. `docs/handoff/STATE.md`ni yangila: bajarilgan, qolgan, ma'lum muammolar, o'lchovlar (hajm, tezlik, test soni).
4. `docs/handoff/REPORT_B<N>.md` yoz: nima qilindi, muhim fayllar, HAQIQATAN nima test qilindi va natijasi, chaqirilgan skillar, qolgan bloker.
5. `docs/handoff/NEXT_PROMPT.md`ni QAYTA YOZ: keyingi sessiya uchun to'liq, mustaqil prompt. Birinchi qatorida tavsiya etilgan model (Opus 5.5 yoki Sonnet 5.5) va sababi. Ichida: shu master faylga havola, keyingi bosqich raqami va aniq vazifalari, shu sessiyadan qolgan ochiq ishlar, e'tibor berilishi kerak bo'lgan xavflar. Yangi sessiya oldingi suhbatni bilmaydi deb yoz.
6. Chatga qisqa yakun: bosqich natijasi, `HUMAN_TODO`dagi yangi bandlar, keyingi model.

Hojiakbar keyingi sessiyani shunday ochadi: `claude`, keyin "docs/handoff/NEXT_PROMPT.md ni o'qi va bajar".

Agar bosqich bitta sessiyaga sig'masa: uni B3a, B3b kabi bo'l, har biri uchun shu handoff tartibini bajar.

## 8. SUBAGENTLAR VA TEST

### Subagentlar
- Mustaqil vazifalar bo'lganda bir vaqtda 4-5 tagacha subagent ishga tushir. Mustaqil bo'lmasa parallel qilma.
- Har subagentga: bitta aniq vazifa, o'ziga tegishli fayllar ro'yxati (ikki subagent bir faylga tegmasin), qabul mezoni, chaqirishi shart bo'lgan skillar (`ponytail:ponytail` doim), 3-bo'lim qoidalari, qisqa hisobot formati.
- Bog'liqlik bo'lsa navbat bilan: B natijasi A'ga kerak bo'lsa A kutadi. Umumiy fayllarni (router, store, i18n lug'atlari, `api/index.ts`, `package.json`) faqat asosiy sessiya yoki bitta belgilangan subagent o'zgartiradi.
- Har to'lqin oxirida asosiy sessiya natijalarni birlashtiradi, build + testni o'zi o'tkazadi.
- Bosqich oxirida ALOHIDA tekshiruvchi subagent (ishni yozmagan, toza kontekst) diff'ni va ishlayotgan ilovani mustaqil tekshiradi. U topgan narsa tuzatilmaguncha bosqich yopilmaydi.

### Har bosqich oxiridagi test (dalil bilan)
1. `tsc` xatosiz, lint xatosiz, `vite build` muvaffaqiyatli.
2. Vitest: hammasi yashil. Flaky test o'chirib qo'yilmaydi, sababi tuzatiladi.
3. Playwright e2e, mobil viewport'larda (kichik Android ~360x640, iPhone ~390x844, planshet): shu bosqich tegib o'tgan har ekranda HAR BIR tugma, havola, kiritish maydoni, modal, orqaga qaytish bosib ko'riladi; 3 tilda (uz/ru/en); konsolda xato 0, muvaffaqiyatsiz tarmoq so'rovi 0 (kutilganidan tashqari).
4. Chekka holatlar: internet yo'q, sekin internet, ovoz xizmati javob bermadi, bo'sh ma'lumot, juda uzun ism, tez-tez ketma-ket bosish, ilovani fonga olib qaytish, ekranni burish.
5. Ovozga tegilgan bo'lsa: 10-bo'limdagi ovoz tekshiruvi.
6. Topilgan har xato: ildiz sababi tuzatiladi, regressiya testi qo'shiladi, test qayta o'tkaziladi.
7. Mavjud ishlaydigan funksiyani testni o'tkazish uchun o'chirma, haqiqiy funksiyani mock bilan almashtirma.

"Bug umuman yo'q" deb yozma. "Nima tekshirildi va nima topilmadi" deb yoz.

## 9. DO'KON TEXNIK TALABLARI (majburiy)

Apple va Google bolalar ilovasiga qattiq qaraydi. Kodda bo'lishi shart:
1. Ilova "saytning o'rami" bo'lib qolmasin: native qobiq, splash, ikonka, oflayn holat ekrani, Android "orqaga" tugmasi, safe-area, status bar, native ulashish/haptika kabi mos joyda native imkoniyatlar. Veb-kod ilova paketida bo'ladi (masofadagi saytni WebView'da ochish EMAS).
2. Ota-ona darvozasi (parental gate): tashqi havola, akkaunt/kirish, sozlamalar, kelajakdagi xarid, o'chirish faqat darvoza ortida. Bola oqimida tashqariga chiqadigan havola yo'q. Darvoza o'qiy olmaydigan bola o'ta olmaydigan, kattalar uchun oson bo'lsin.
3. Kirish: Google web OAuth WebView ichida ishlamaydi (Google taqiqlaydi). Native Google kirish plagini qo'y. iOS'da Google/Telegram kirish bor ekan, unga teng maxfiylikni saqlovchi variant (Sign in with Apple) ham bo'lishi kerak. Email kod va Telegram deep link ilovada ishlashi kerak.
4. Akkauntni o'chirish: ilova ichida to'liq o'chirish yo'li + ochiq veb-sahifa havolasi. Faqat "o'chirib qo'yish" yetmaydi.
5. Uchinchi tomon analitika va reklama SDK'lari bolalar oqimida yo'q. Reklama identifikatori ruxsati so'ralmaydi, joylashuv ishlatilmaydi.
6. Kamera/mikrofon ishlatiladigan joyda (diqqat yordamchisi): aniq rozilik, ko'rinadigan indikator, tushunarli ruxsat matni, ota-ona o'chira oladigan sozlama. Tasvir qurilmadan chiqmasligini kodda tekshir va hisobotga yoz.
7. Maxfiylik siyosati sahifasi (/privacy) ilova ichidan ochiladi (darvoza ortida).
8. Pro (12-bo'lim): do'kon build'ida to'lov yoki "sotib ol" UI umuman yo'q, masofadan yoqiladigan yashirin paywall ham yo'q. Bayroq build paytida belgilanadi.
9. Versiyalar: Capacitor'ning joriy barqaror versiyasi (rasmiy hujjatdan tekshir), Android target API va iOS SDK talabining bugungi holatini rasmiy sahifadan tekshir, 16 KB page-size mosligini native kutubxonalar bo'lsa tekshir. Xotiradagi raqamga tayanma.
10. Bundle ID / applicationId: vaqtincha `uz.kiddo.app`, bitta konfiguratsiya joyida. Do'konga yuklangandan keyin o'zgartirib bo'lmaydi, shuning uchun `HUMAN_TODO`ga "tasdiqlash kerak" deb yoz.

## 10. OVOZ (ilovaning asosi)

### Manba
1. `%USERPROFILE%\Desktop\AI suhbat` (ZEHN) papkasini FAQAT O'QIB, ovoz qanday yaratilayotganini aniqla: qaysi xizmat/kutubxona, qaysi ovoz nomlari, qaysi parametrlar, kalit kerakmi. Topganingni `docs/voice/ZEHN_METHOD.md`ga yoz. Kalitlarning qiymatini ko'chirma, faqat nomini yoz.
2. Kiddo'da aynan shu usulni asos qilib ol. Qo'shimcha tekin manbalarni zaxira sifatida bahola. Tadqiqot xulosasi (o'zing rasmiy hujjatdan qayta tekshir, raqamlar o'zgaruvchan):
   - Microsoft Edge neural ovozlari (kalitsiz, norasmiy endpoint): uz-UZ Madina/Sardor, ru-RU Svetlana/Dmitry, en-US bir nechta. Faqat rate/pitch/volume ishlaydi, pauza tegi ishlamaydi. Faqat server tomonda ishlaydi. Norasmiy bo'lgani uchun uzilib qolishi mumkin.
   - Azure Speech bepul darajasi: rasmiy, to'liq SSML (pauza, prosody), oylik belgi kvotasi bor. Akkaunt kerak.
   - Gemini TTS: uslubni matn bilan boshqarish mumkin (do'stona, bolalarga mos), o'zbekcha bor, lekin bepul kunlik limit juda kichik bo'lishi mumkin: jonli emas, oldindan yaratishga mos.
   - O'zbek va rus tillari uchun tayyor BOLA ovozi hech qayerda topilmadi.
3. Faqat tekin. Kalit kerak bo'lsa `HUMAN_TODO`ga yoz va kalitsiz variant bilan davom et.

### Arxitektura (jonli, lekin tejamkor)
- Ovoz internet orqali so'rov bo'yicha yaratiladi, ilova paketiga minglab audio fayl solinmaydi.
- Server: `api/index.ts` dispatcher ichida bitta TTS yo'li (yangi serverless funksiya ochma, 12 limit). Kalitlar faqat serverda.
- HAR IBORA BIR MARTA sintez qilinadi: kalit = (matn + til + ovoz + parametrlar versiyasi) xeshi. Natija server tomonda hamma foydalanuvchilar uchun umumiy keshlanadi (tekin saqlash joyini o'zing tanla va limitini tekshir), keyin CDN kesh sarlavhalari bilan beriladi. Shunda tekin kvota foydalanuvchilar soniga emas, noyob iboralar soniga sarflanadi.
- Qurilmada ham kesh: eshitilgan ibora qayta yuklanmaydi, internet yo'qda keshdagisi o'ynaydi.
- Suiiste'moldan himoya: endpoint ixtiyoriy matnni sintez qilmasin. Ilova matnlari ruxsat etilgan ro'yxat/imzo orqali, dinamik qism (bola ismi) uzunlik va belgi cheklovi bilan, rate limit bilan.
- Zaxira zanjiri: asosiy manba ishlamasa ikkinchisi, u ham ishlamasa qurilma keshi, oxirida ovozsiz lekin ilova ishlayveradi (matn va animatsiya bilan). Ovoz xatosi hech qachon ekranni qotirmasin.
- Format: iOS WebView va Android'da bir xil ishlaydigan bitta format (mono MP3 yoki AAC, nutq uchun yetarli past bitrate; Opus'ni eski iOS o'ynamaydi). Sifat eshitilarli tushmasin.
- Kechikish: tugma bosilgandan ovoz boshlanguncha vaqtni o'lcha. Ekran ochilganda keyingi kerakli iboralarni oldindan yuklab qo'y (prefetch). Yuklanayotganda maskot "o'ylayotgan" holatda bo'lsin, ekran bo'sh qolmasin.
- iOS'da avtomatik ovoz foydalanuvchi bosishisiz o'ynamasligi mumkin: birinchi bosishda audio kontekstni ochib ol.
- Barcha ovoz sozlamalari BITTA konfiguratsiya faylida: rol -> manba, ovoz nomi, tezlik, balandlik, uslub. Hojiakbar eshitib boshqasini tanlasa faqat shu fayl o'zgaradi va parametr versiyasi oshadi (kesh avtomatik yangilanadi).

### Ovozlar
- 2 ta ASOSIY: Mini (qiz bola) va Piku (o'g'il bola). Bolaga do'stidek: iliq, quvnoq, rag'batlantiruvchi, sabrli. Hech qachon buyruq ohangida emas.
- Yordamchilar saqlanadi: narrator (yosh ayol), ona, ota, buvi, bobo, Laylo (qiz bola), Ali (o'g'il bola). Laylo/Ali Mini/Piku'dan farq qilsin.
- Bola ovozi tayyor yo'q, shuning uchun tabiiy kattalar ovozidan balandlik va tezlikni EHTIYOTKORLIK bilan sozlab ol. Haddan oshirsang ovoz sun'iy/xunuk bo'ladi: tabiiylik birinchi o'rinda.
- Tezlik kattalar tezligidan sekinroq (bolalar uchun). 3 variant tayyorla (taxminan 90/80/70%).
- Alifbo: avval harf, keyin so'z, orasida 250-400 ms pauza. Pauza tegi ishlamaydigan manbada ikki bo'lakni ketma-ket o'ynat.
- Mashq ovozlari faqat gapirayotgan maskotda. Bola maskotni o'zi tanlaydigan joyni kodda tekshir va hisobotga yoz.
- Har bo'lim savolni avtomatik ovozda o'qiydi va keyingisiga o'zi o'tadi (bola ovozni o'zi yoqa olmaydi). Maskot har ishga tushishda bir marta salomlashadi.
- Matnlar: bolalar uchun qisqa, sodda, iliq jumlalar. Mavjud matnlar quruq bo'lsa 3 tilda qayta yoz (i18n kalitlarini saqlagan holda).

### O'zbekcha Q, G', K (muhim)
- Q bo'g'iz q bo'lib chiqishi kerak (K emas), G' to'g'ri, K alohida aniq.
- Sinov ro'yxati tuz: Q, G', K, O', SH, CH, NG qatnashgan so'z va minimal juftliklar (masalan qo'l/ko'l, qir/kir, g'oz/goz) + ilovadagi eng ko'p ishlatiladigan 30 ibora.
- Har manba va ovozda shu ro'yxatni 4 xil yozuvda sinab ko'r: ʻ (U+02BB), ’ (U+2019), ' (U+0027) va kirill (қ, ғ, ў). Qaysi yozuv to'g'ri talaffuz bersa, sintezdan oldin matnni shunga keltiruvchi normalizatsiya qatlamini yoz (ekrandagi matn o'zgarmaydi).
- Sen audio'ni eshita olmaysan. ru/en uchun namunaviy tekshiruv: sintez qilingan audio'ni qayta matnga o'girib (tekin vosita bo'lsa) solishtir. O'zbekcha uchun avtomatik tekshiruvga ISHONMA: namunalarni `%USERPROFILE%\voice-test\v3\` ga tartibli nom bilan (manba_ovoz_yozuv_tezlik) saqla, `docs/voice/LISTEN.md`ga "nimani eshitish va nimani tanlash kerak" ro'yxatini yoz, `HUMAN_TODO`ga qo'sh.
- Hojiakbar tanlaguncha eng ehtimoliy variantni vaqtinchalik standart qilib qo'y va davom et.

## 11. KLIP VA SHORTS

- Ilovadagi BARCHA klip va shorts (Tarbiya bo'limidagi 90 klip ham, boshqa bo'limlardagilar ham) qayta, professional darajada yaratiladi.
- Uslub: 2D Mini va Piku, Remotion. Ilova ichida Remotion Player bilan jonli (oldindan render qilingan og'ir video fayllar paketga solinmaydi).
- Ranglar: hozirgi maskot ranglari xira. Jonliroq, tabiiyroq, bolalarga yoqimli palitra; kontrast va o'qiluvchanlik saqlansin. Ranglar bitta token faylida, ilova va kliplar bir xil tokenlardan foydalansin.
- Har klip maksimal tushunarli: bitta g'oya, aniq boshlanish-o'rta-yakun, sekin temp, katta aniq obrazlar, ekranda kam matn, ovoz va harakat sinxron, lab/og'iz harakati ovozga mos.
- Ovoz: 10-bo'limdagi yangi ovoz tizimi orqali, 3 tilda. Klip davomiyligi ovoz uzunligiga moslashadi.
- Mazmun `docs/tarbiya/CURRICULUM.md`dan. Matnni o'zgartirsang ro'yxatini ber (uz/ru matnini Hojiakbar o'qib tekshiradi).
- Umumiy sahna qismlari (fon, maskot rig, mimika, o'tishlar) qayta ishlatiladigan komponentlar: 90 ta klip 90 ta alohida kod bo'lmasin, ma'lumotga asoslangan bo'lsin.
- Kuchsiz qurilmada klip qotmasin: kadr tezligini o'lcha, og'ir effektlarni soddalashtir.

## 12. PRO

- Bitta build-vaqti bayrog'i (masalan `VITE_PRO_VISIBLE=false`). False bo'lganda: Pro haqidagi barcha UI (narxlar, "Pro'ga o'ting", qulf belgilari, tariflar sahifasi, sinov rejimi yozuvlari, bildirishnomalar, bot xabarlaridagi Pro eslatmalari) hech qayerda ko'rinmaydi.
- False bo'lganda Pro uchun ochiq bo'lgan BARCHA imkoniyat hamma foydalanuvchiga ochiq va ishlaydi (Tarbiya 4-30 kunlar ham). Server tomondagi tekshiruvlar ham shunga mos: frontend ochiq-u, API rad etadigan holat qolmasin.
- Pro kodi, jadvallari, admin paneldagi qismi O'CHIRILMAYDI. Bayroq true bo'lsa hammasi avvalgidek qaytadi. Ikki holat uchun ham test yoz.
- Tekshiruv: butun kod bo'yicha "pro", "premium", "tarif", "obuna", "subscription" va tarjima kalitlarini qidirib, bayroqsiz qolgan joy yo'qligini isbotla.

## 13. TEZLIK VA HAJM

- Avval o'lcha (B0'da bazaviy raqamlar), keyin optimallashtir, keyin qayta o'lcha. Raqamsiz "tezlashdi" dema.
- Rasm: zamonaviy format (AVIF/WebP), to'g'ri o'lcham, SVG optimallashtirish. Har rasmni asl bilan yonma-yon solishtir: ko'zga ko'rinadigan farq bo'lsa sozlamani yumshat.
- 3D: glTF siqish (geometriya + tekstura), dekoderlar ilova ichida lokal (CDN emas), three.js faqat kerak bo'lgan ekranda yuklanadi (lazy), sahnadan chiqqanda resurslar bo'shatiladi, pixel ratio cheklanadi, kerak bo'lmaganda render to'xtaydi.
- Ovoz/SFX: 10-bo'limdagi format; paketdagi audio minimal.
- Bundle: code splitting, ishlatilmagan kod va kutubxonalarni chiqarish, shrift subset, tillarni alohida yuklash. Bundle tahlilini hisobotga qo'sh.
- Ish vaqti: keraksiz qayta render yo'q (Zustand selektorlari), uzun vazifalar asosiy oqimni band qilmasin, ro'yxatlar virtual, animatsiyalar transform/opacity bilan, xotira sizib chiqmasin (uzoq ishlatganda WebView qayta yuklanib ketmasin).
- Backend: N+1 so'rov yo'q, so'rovlar batch, kerakli indekslar, keraksiz ketma-ket so'rovlar parallel, javoblar keshlanadi. Har asosiy endpoint uchun so'rovlar sonini va vaqtini o'lcha.
- Maqsad: kuchsiz Android telefonda ham bosishga darhol javob, ekranlar orasida qotishsiz o'tish.

## 14. BOSQICHLAR

Har bosqich oxirida 7 va 8-bo'limlar majburiy.

**B0. Inventar va reja** (kod deyarli yozilmaydi)
- Repo holati, ma'lum muammolar (e2e "coins", opening "key/tap skips", homework "planet", 4 admin unit test, vitest timeout'lar, 2 flaky test), push qilinmagan docs commit.
- ZEHN ovoz usulini aniqlash (10-bo'lim).
- Skill/connector/subagent inventari.
- Bazaviy o'lchovlar: bundle hajmi, asosiy ekranlar yuklanish vaqti, test holati, aktivlar hajmi (rasm/3D/audio/video ro'yxati hajmi bilan).
- Pro, ovoz, klip tegib o'tadigan joylar xaritasi.
- Capacitor va do'kon talablarining bugungi rasmiy holatini tekshirish.
- Natija: `docs/handoff/PLAN.md` (bosqichlar bo'yicha aniq vazifalar, bog'liqliklar, qaysi vazifalar parallel).

**B1. Xavfsizlik to'ri: testlarni yashil qilish**
- Ma'lum barcha test muammolari va flaky testlarni ildiz sababi bilan tuzatish. Keyingi bosqichlar shu yashil bazaga tayanadi.

**B2. Ovoz dvigateli**
- TTS yo'li, kesh, zaxira zanjiri, konfiguratsiya, normalizatsiya, qurilma keshi, prefetch.
- Q/G'/K pilot namunalari va tezlik variantlari, `LISTEN.md`.
- Eski statik ovoz fayllarini ishlatadigan joylar ro'yxati (hali o'chirilmaydi).

**B3. Ovozni butun ilovaga ulash + Pro'ni yashirish**
- Barcha bo'limlar yangi ovoz tizimiga o'tadi (maskot, alifbo, mashqlar, Masshtab portali, diqqat yordamchisi, salomlashish).
- Matnlarni bolalarga mos qilish (3 til).
- Pro bayrog'i (12-bo'lim).
- Ishlatilmay qolgan eski audio fayllar ro'yxati `HUMAN_TODO`ga (o'chirishni Hojiakbar tasdiqlaydi).

**B4. Tarbiya bo'limi va barcha klip/shorts** (kerak bo'lsa B4a, B4b, B4c)
- Rang tokenlari, maskot rig, qayta ishlatiladigan sahna komponentlari.
- 30 kun: har kun 3 mashq + 3 klip, ketma-ket ochilish, alohida menyu tugmasi (Pro yashirin: hammasi ochiq).
- Boshqa bo'limlardagi klip/shorts ham.

**B5. Tezlik va hajm** (13-bo'lim)

**B6. Clean Code**
- Takrorlangan kodni birlashtirish, o'lik kodni chiqarish (Supabase kodi qoladi), tiplarni mustahkamlash, xatolarni bir xil boshqarish. Xatti-harakat o'zgarmaydi, testlar yashil qoladi.

**B7. Capacitor ilova**
- Android va iOS loyihalari, splash/ikonka, safe-area, orqaga tugmasi, oflayn ekran, deep link, native Google kirish, Apple kirish, Telegram va email kod oqimi, ota-ona darvozasi, akkauntni o'chirish, ruxsat matnlari, PWA service worker'ning WebView ichidagi xatti-harakati.
- Android: lokal build va (RAM yetsa) emulyatorda sinov; yetmasa haqiqiy telefon uchun APK va `HUMAN_TODO`.
- iOS: lokal build imkonsiz (Mac yo'q). Loyihani to'g'ri tayyorla, tekshiruv B8'dagi bulutli build orqali.

**B8. CI/CD**
- GitHub Actions: lint, tiplar, unit, e2e, build; yashil bo'lmasa deploy yo'q; Dependabot.
- Android build (AAB) Linux runner'da.
- iOS build: Codemagic (bepul macOS daqiqalari faqat SHAXSIY akkauntda, Team akkauntida yo'q; App Store Connect API kaliti bilan avtomatik imzolash) asosiy, GitHub Actions macOS zaxira. Bepul daqiqalarni tejash: iOS build faqat qo'lda yoki teg bo'yicha ishga tushsin.
- Workflow fayllari tayyorlanadi va lokal tekshiriladi, lekin push YO'Q: Hojiakbar push qilgandan keyin ishlaydi. Kerakli barcha secret NOMLARI va ularni qayerdan olish `HUMAN_TODO`da.

**B9. Do'konga tayyorgarlik va yakuniy to'liq sinov**
- 9-bo'lim bo'yicha band-ma-band tekshiruv jadvali (bajarildi / dalil / bajarilmadi).
- Do'kon materiallari: nom, qisqa va to'liq tavsif (uz/ru/en), skrinshotlar ro'yxati va ularni olish skripti, yosh toifasi va ma'lumot xavfsizligi anketalari uchun javoblar loyihasi, ko'rib chiquvchi uchun eslatma.
- To'liq regressiya: butun ilova, har ekran, har tugma, 3 til, 3 viewport, oflayn, sekin tarmoq.
- Yakuniy hisobot: nima tayyor, nima insonni kutyapti, ma'lum cheklovlar.

## 15. HUMAN_TODO (faqat Hojiakbar bajaradi)

`docs/handoff/HUMAN_TODO.md`ni doim yangilab tur. Oldindan ma'lum bandlar:
- Apple Developer akkaunti (yillik to'lov) va Google Play Console akkaunti (bir martalik to'lov).
- App Store Connect'da ilova yozuvi va API kaliti; Android keystore (zaxira nusxasi bilan); Play service account.
- Google Play: shaxsiy akkaunt uchun yopiq sinov talabi (testerlar soni va muddatini rasmiy sahifadan tekshir).
- Bundle ID'ni tasdiqlash.
- Ovoz namunalarini eshitib tanlash (tezlik, Q/G', har rol uchun ovoz).
- uz va ru matnlarini o'qib tekshirish.
- Haqiqiy iPhone'da TestFlight orqali sinash.
- Kerak bo'lsa TTS xizmati uchun tekin kalit.
- "push qil" buyrug'i.

## 16. HOZIRGI BOSQICH

`docs/handoff/STATE.md` mavjud bo'lsa undagi keyingi bosqichni bajar. Mavjud bo'lmasa B0'dan boshla.
